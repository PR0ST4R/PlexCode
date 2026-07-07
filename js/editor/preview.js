/**
 * PlexCode — Live Preview Window
 * Draggable, resizable iframe preview for HTML/CSS/JS files.
 */

let _previewEl = null;
let _iframe = null;
let _isDragging = false;
let _dragOffsetX = 0;
let _dragOffsetY = 0;

const PREVIEWABLE = ['html', 'css', 'javascript', 'typescript'];

/**
 * Check if a language supports live preview.
 * @param {string} lang
 * @returns {boolean}
 */
export function supportsPreview(lang) {
  return PREVIEWABLE.includes(lang?.toLowerCase());
}

/**
 * Open the preview window with content.
 * @param {string} content
 * @param {string} lang
 * @param {string} filename
 */
export function openPreview(content, lang, filename) {
  if (!_previewEl) _createPreviewWindow();

  _previewEl.classList.remove('hidden');

  if (!supportsPreview(lang)) {
    _showUnsupported(lang);
    return;
  }
  _showContent(content, lang, filename);
}

/**
 * Update the preview with new content (live update).
 * @param {string} content
 * @param {string} lang
 * @param {string} filename
 */
export function updatePreview(content, lang, filename) {
  if (!_previewEl || _previewEl.classList.contains('hidden')) return;
  if (supportsPreview(lang)) _showContent(content, lang, filename);
}

/**
 * Close the preview window.
 */
export function closePreview() {
  if (_previewEl) _previewEl.classList.add('hidden');
}

export function isPreviewOpen() {
  return _previewEl && !_previewEl.classList.contains('hidden');
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function _createPreviewWindow() {
  _previewEl = document.createElement('div');
  _previewEl.className = 'preview-window';
  _previewEl.style.cssText = 'width:520px;height:380px;top:80px;right:20px;';
  _previewEl.innerHTML = `
    <div class="preview-titlebar" id="preview-titlebar">
      <div class="preview-dots">
        <div class="preview-dot close" id="preview-close-dot"></div>
        <div class="preview-dot min"></div>
        <div class="preview-dot max"></div>
      </div>
      <div class="preview-title" id="preview-title">Preview</div>
      <div class="preview-refresh" id="preview-refresh" title="Refresh">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.11-4.61"/>
        </svg>
      </div>
    </div>
    <div id="preview-body" class="preview-iframe-wrap"></div>`;

  document.body.appendChild(_previewEl);

  // Close dot
  _previewEl.querySelector('#preview-close-dot').addEventListener('click', closePreview);

  // Refresh
  _previewEl.querySelector('#preview-refresh').addEventListener('click', () => {
    if (_iframe) _iframe.srcdoc = _iframe.srcdoc;
  });

  // Drag
  const titlebar = _previewEl.querySelector('#preview-titlebar');
  titlebar.addEventListener('mousedown', _startDrag);
}

function _showContent(content, lang, filename) {
  const body = _previewEl.querySelector('#preview-body');
  _previewEl.querySelector('#preview-title').textContent = filename || 'Preview';

  body.innerHTML = '';
  _iframe = document.createElement('iframe');
  _iframe.sandbox = 'allow-scripts';
  _iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;background:#fff';

  let html = '';
  if (lang === 'html') {
    html = content;
  } else if (lang === 'css') {
    html = `<!DOCTYPE html><html><head><style>${content}</style></head>
<body style="padding:20px;font-family:sans-serif">
  <h1>CSS Preview</h1><p>Your styles are applied to this page.</p>
  <div class="example">Example element</div>
</body></html>`;
  } else if (lang === 'javascript') {
    html = `<!DOCTYPE html><html><head></head>
<body style="font-family:monospace;padding:20px;background:#0d0d0f;color:#f0f0f2">
  <div id="output" style="white-space:pre-wrap"></div>
  <script>
    const _log = [];
    const _orig = console.log;
    console.log = (...args) => {
      _log.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
      document.getElementById('output').textContent = _log.join('\\n');
      _orig(...args);
    };
    try { ${content} } catch(e) { document.getElementById('output').textContent = 'Error: ' + e.message; }
  <\/script>
</body></html>`;
  }

  _iframe.srcdoc = html;
  body.appendChild(_iframe);
}

function _showUnsupported(lang) {
  const body = _previewEl.querySelector('#preview-body');
  body.innerHTML = `
    <div class="preview-unsupported">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.3">
        <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
      </svg>
      <p>Live preview is not supported for <strong>${lang || 'this'}</strong> files.</p>
      <p style="font-size:12px;color:var(--text-tertiary)">Preview works for HTML, CSS, and JavaScript.</p>
    </div>`;
}

// ─── Dragging ─────────────────────────────────────────────────────────────────

function _startDrag(e) {
  if (e.button !== 0) return;
  _isDragging = true;
  const rect = _previewEl.getBoundingClientRect();
  _dragOffsetX = e.clientX - rect.left;
  _dragOffsetY = e.clientY - rect.top;
  document.addEventListener('mousemove', _onDrag);
  document.addEventListener('mouseup', _stopDrag, { once: true });
  e.preventDefault();
}

function _onDrag(e) {
  if (!_isDragging) return;
  const x = e.clientX - _dragOffsetX;
  const y = e.clientY - _dragOffsetY;
  _previewEl.style.left = `${Math.max(0, x)}px`;
  _previewEl.style.top = `${Math.max(0, y)}px`;
  _previewEl.style.right = 'auto';
}

function _stopDrag() {
  _isDragging = false;
  document.removeEventListener('mousemove', _onDrag);
}
