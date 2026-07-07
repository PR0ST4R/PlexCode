/**
 * PlexCode — Tab Manager
 * Manages open editor tabs (in-memory, not persisted).
 */

import { langLabel, langColor } from '../utils/helpers.js';

/** @type {Array<{ id: string, filename: string, language: string, content: string, dirty: boolean, dbId?: string }>} */
let _tabs = [];
let _activeId = null;
let _onSwitchCallback = null;
let _onCloseCallback = null;

const tabsBar = document.getElementById('editor-tabs');

// ─── Tab creation ─────────────────────────────────────────────────────────────

/**
 * Open a file in a new tab (or switch to existing).
 * @param {{ id?: string, filename: string, language: string, content: string, dbId?: string }} file
 * @returns {string} tab id
 */
export function openTab(file) {
  // Check if already open (by dbId or filename)
  const existing = _tabs.find(t =>
    (file.dbId && t.dbId === file.dbId) ||
    (!file.dbId && t.filename === file.filename)
  );
  if (existing) {
    setActiveTab(existing.id);
    return existing.id;
  }

  const id = file.dbId || `tab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const tab = {
    id,
    filename: file.filename,
    language: file.language || 'plaintext',
    content: file.content || '',
    dirty: false,
    dbId: file.dbId || null,
  };
  _tabs.push(tab);
  renderTab(tab);
  setActiveTab(id);
  return id;
}

/**
 * Close a tab by id.
 * @param {string} id
 */
export function closeTab(id) {
  const idx = _tabs.findIndex(t => t.id === id);
  if (idx === -1) return;

  const wasActive = _activeId === id;
  _tabs.splice(idx, 1);

  // Remove DOM element
  document.querySelector(`[data-tab-id="${id}"]`)?.remove();

  if (wasActive) {
    if (_tabs.length > 0) {
      // Activate nearest tab
      const nextIdx = Math.min(idx, _tabs.length - 1);
      setActiveTab(_tabs[nextIdx].id);
    } else {
      _activeId = null;
      if (_onCloseCallback) _onCloseCallback(null);
      showEditorEmpty();
    }
  }
}

/**
 * Mark a tab as dirty (unsaved changes).
 * @param {string} id
 * @param {boolean} dirty
 */
export function markDirty(id, dirty) {
  const tab = _tabs.find(t => t.id === id);
  if (!tab || tab.dirty === dirty) return;
  tab.dirty = dirty;
  const el = document.querySelector(`[data-tab-id="${id}"]`);
  if (!el) return;
  const dot = el.querySelector('.tab-dot');
  const close = el.querySelector('.tab-close');
  if (dirty) {
    if (!dot) {
      const d = document.createElement('div');
      d.className = 'tab-dot';
      close?.before(d);
    }
  } else {
    dot?.remove();
  }
}

/**
 * Update tab content in memory.
 * @param {string} id
 * @param {string} content
 */
export function updateTabContent(id, content) {
  const tab = _tabs.find(t => t.id === id);
  if (tab) tab.content = content;
}

/**
 * Update tab filename.
 * @param {string} id
 * @param {string} filename
 */
export function renameTab(id, filename) {
  const tab = _tabs.find(t => t.id === id);
  if (!tab) return;
  tab.filename = filename;
  const nameEl = document.querySelector(`[data-tab-id="${id}"] .tab-name`);
  if (nameEl) nameEl.textContent = filename;
}

/**
 * Set dbId on a tab (after cloud save).
 * @param {string} id
 * @param {string} dbId
 */
export function setTabDbId(id, dbId) {
  const tab = _tabs.find(t => t.id === id);
  if (tab) { tab.dbId = dbId; tab.id = dbId; }
}

// ─── Active tab ───────────────────────────────────────────────────────────────

export function getActiveTab() {
  return _tabs.find(t => t.id === _activeId) || null;
}

export function getActiveTabId() { return _activeId; }

export function getAllTabs() { return [..._tabs]; }

export function setActiveTab(id) {
  _activeId = id;
  // Update DOM active states
  document.querySelectorAll('[data-tab-id]').forEach(el => {
    el.classList.toggle('active', el.dataset.tabId === id);
  });
  const tab = _tabs.find(t => t.id === id);
  if (tab && _onSwitchCallback) _onSwitchCallback(tab);
}

// ─── Callbacks ────────────────────────────────────────────────────────────────

export function onTabSwitch(fn) { _onSwitchCallback = fn; }
export function onTabClose(fn) { _onCloseCallback = fn; }

// ─── DOM rendering ────────────────────────────────────────────────────────────

function renderTab(tab) {
  const el = document.createElement('div');
  el.className = 'tab';
  el.dataset.tabId = tab.id;
  el.title = tab.filename;
  el.innerHTML = `
    <span class="tab-name">${tab.filename}</span>
    <span class="tab-close" title="Close">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </span>`;

  el.addEventListener('click', (e) => {
    if (e.target.closest('.tab-close')) return;
    setActiveTab(tab.id);
  });

  el.querySelector('.tab-close').addEventListener('click', (e) => {
    e.stopPropagation();
    closeTab(tab.id);
  });

  tabsBar?.appendChild(el);
}

function showEditorEmpty() {
  document.getElementById('editor-empty')?.classList.remove('hidden');
  document.getElementById('toolbar-filename').textContent = 'untitled';
  document.getElementById('toolbar-lang').textContent = 'plaintext';
  document.getElementById('toolbar-save-status').innerHTML = '';
}
