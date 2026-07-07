/**
 * PlexCode — Dashboard Renderer
 */

import { timeAgo, langLabel, langColor } from '../utils/helpers.js';

/**
 * Render recent files on the dashboard.
 * @param {Array} files
 * @param {Function} onOpen called with file object
 */
export function renderRecentFiles(files, onOpen) {
  const grid = document.getElementById('recent-files-grid');
  if (!grid) return;

  if (!files.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <p>No recent files. Create one to get started!</p>
      </div>`;
    return;
  }

  grid.innerHTML = files.map(f => `
    <div class="file-card" data-file-id="${f.id}" style="--lang-color:${langColor(f.language)}">
      <div class="file-card-header">
        <span class="file-card-name">${f.filename}</span>
        <span class="file-card-lang">${langLabel(f.language)}</span>
      </div>
      <div class="file-card-meta">Edited ${timeAgo(f.updated_at)}</div>
    </div>`).join('');

  grid.querySelectorAll('.file-card').forEach(card => {
    card.addEventListener('click', () => {
      const file = files.find(f => f.id === card.dataset.fileId);
      if (file && onOpen) onOpen(file);
    });
  });
}

/**
 * Update the dashboard greeting based on time of day.
 * @param {string} username
 */
export function setGreeting(username) {
  const el = document.getElementById('dashboard-greeting');
  if (!el) return;
  const h = new Date().getHours();
  const timeGreet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  el.textContent = username ? `${timeGreet}, ${username}!` : `${timeGreet}!`;
}

/**
 * Render the files table in the My Files view.
 * @param {Array} files
 * @param {string} query search filter
 * @param {{ onOpen, onRename, onDelete }} callbacks
 */
export function renderFilesTable(files, query, { onOpen, onRename, onDelete }) {
  const tbody = document.getElementById('files-tbody');
  const emptyEl = document.getElementById('files-empty');
  if (!tbody) return;

  const filtered = query
    ? files.filter(f =>
        f.filename.toLowerCase().includes(query.toLowerCase()) ||
        f.language.toLowerCase().includes(query.toLowerCase()))
    : files;

  if (!filtered.length) {
    tbody.innerHTML = '';
    emptyEl?.classList.remove('hidden');
    return;
  }
  emptyEl?.classList.add('hidden');

  // Import timeAgo, formatDate inline to avoid extra imports
  const formatDate = (d) => new Date(d).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric'
  });

  tbody.innerHTML = filtered.map(f => `
    <tr data-file-id="${f.id}">
      <td>
        <div class="file-row-name">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:${langColor(f.language)};flex-shrink:0">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          ${f.filename}
        </div>
      </td>
      <td><span class="file-row-lang">${langLabel(f.language)}</span></td>
      <td class="file-row-date">${timeAgo(f.updated_at)}</td>
      <td class="file-row-date">${formatDate(f.created_at)}</td>
      <td>
        <div class="file-row-actions">
          <button class="btn-icon btn-sm" data-action="open" title="Open">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </button>
          <button class="btn-icon btn-sm" data-action="rename" title="Rename">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon btn-sm" data-action="delete" title="Delete" style="color:var(--text-danger)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </td>
    </tr>`).join('');

  // Bind row events
  tbody.querySelectorAll('tr').forEach(row => {
    const fileId = row.dataset.fileId;
    const file = filtered.find(f => f.id === fileId);
    if (!file) return;

    row.addEventListener('click', (e) => {
      if (e.target.closest('[data-action]')) return;
      onOpen?.(file);
    });

    row.querySelector('[data-action="open"]')?.addEventListener('click', (e) => {
      e.stopPropagation(); onOpen?.(file);
    });
    row.querySelector('[data-action="rename"]')?.addEventListener('click', (e) => {
      e.stopPropagation(); onRename?.(file);
    });
    row.querySelector('[data-action="delete"]')?.addEventListener('click', (e) => {
      e.stopPropagation(); onDelete?.(file);
    });
  });
}

/**
 * Update the file count badge in the sidebar.
 * @param {number} count
 */
export function updateFileCountBadge(count) {
  const badge = document.getElementById('files-count-badge');
  if (badge) badge.textContent = count;
}
