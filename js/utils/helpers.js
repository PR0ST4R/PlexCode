/**
 * PlexCode — Utility Helpers
 */

/**
 * Format a date string into a human-readable relative time.
 * @param {string|Date} date
 * @returns {string}
 */
export function timeAgo(date) {
  const now = new Date();
  const then = new Date(date);
  const diff = Math.floor((now - then) / 1000); // seconds

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Format a date for the files table.
 * @param {string|Date} date
 * @returns {string}
 */
export function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Sanitize a username (lowercase, alphanumeric + underscore).
 * @param {string} str
 * @returns {string}
 */
export function sanitizeUsername(str) {
  return str.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 30);
}

/**
 * Validate an email address.
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Validate a password (min 8 chars).
 * @param {string} pw
 * @returns {{ valid: boolean, message: string }}
 */
export function validatePassword(pw) {
  if (pw.length < 8) return { valid: false, message: 'Password must be at least 8 characters.' };
  return { valid: true, message: '' };
}

/**
 * Get a language color for file cards.
 * @param {string} lang
 * @returns {string}
 */
export function langColor(lang) {
  const map = {
    html: '#e34c26',
    css: '#563d7c',
    javascript: '#f1e05a',
    typescript: '#3178c6',
    python: '#3572A5',
    java: '#b07219',
    cpp: '#f34b7d',
    php: '#4F5D95',
    json: '#292929',
    markdown: '#083fa1',
    plaintext: '#555',
  };
  return map[lang?.toLowerCase()] || '#22c55e';
}

/**
 * Get Monaco language ID from PlexCode language key.
 * @param {string} lang
 * @returns {string}
 */
export function toMonacoLang(lang) {
  const map = {
    javascript: 'javascript',
    typescript: 'typescript',
    html: 'html',
    css: 'css',
    json: 'json',
    markdown: 'markdown',
    python: 'python',
    java: 'java',
    cpp: 'cpp',
    php: 'php',
    plaintext: 'plaintext',
    other: 'plaintext',
  };
  return map[lang?.toLowerCase()] || 'plaintext';
}

/**
 * Get display label for a language.
 * @param {string} lang
 * @returns {string}
 */
export function langLabel(lang) {
  const map = {
    html: 'HTML',
    css: 'CSS',
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    json: 'JSON',
    markdown: 'Markdown',
    plaintext: 'Plain Text',
    python: 'Python',
    java: 'Java',
    cpp: 'C++',
    php: 'PHP',
    other: 'Other',
  };
  return map[lang?.toLowerCase()] || lang || 'Plain Text';
}

/**
 * Get file extension from language key.
 * @param {string} lang
 * @returns {string}
 */
export function langExtension(lang) {
  const map = {
    html: 'html', css: 'css', javascript: 'js', typescript: 'ts',
    json: 'json', markdown: 'md', plaintext: 'txt', python: 'py',
    java: 'java', cpp: 'cpp', php: 'php', other: 'txt',
  };
  return map[lang?.toLowerCase()] || 'txt';
}

/**
 * Infer language from filename extension.
 * @param {string} filename
 * @returns {string}
 */
export function langFromFilename(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const map = {
    html: 'html', htm: 'html',
    css: 'css',
    js: 'javascript', mjs: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    json: 'json',
    md: 'markdown', markdown: 'markdown',
    txt: 'plaintext',
    py: 'python',
    java: 'java',
    cpp: 'cpp', cc: 'cpp', cxx: 'cpp',
    php: 'php',
  };
  return map[ext] || 'plaintext';
}

/**
 * Debounce a function.
 * @param {Function} fn
 * @param {number} delay ms
 * @returns {Function}
 */
export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Download a string as a file.
 * @param {string} filename
 * @param {string} content
 */
export function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
