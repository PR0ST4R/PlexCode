/**
 * PlexCode — Main App Entry Point
 * Orchestrates auth, editor, files, dashboard, and UI routing.
 */

import supabase from './supabase.js';
import { initAuth, showLandingView, enterGuestMode } from './auth/auth.js';
import { loadProfile, renderSidebarUser, renderSettingsProfile, initProfileUI } from './auth/profile.js';
import { loadMonaco, createEditor, openFile as editorOpenFile, getContent, setTheme as editorSetTheme, onContentChange, onCursorChange, undo, redo, openSearch, getEditorStats } from './editor/monaco.js';
import { openTab, closeTab, getActiveTab, setActiveTab, onTabSwitch, onTabClose, markDirty, updateTabContent, renameTab, setTabDbId, getAllTabs } from './editor/tabs.js';
import { openPreview, updatePreview, closePreview, isPreviewOpen, supportsPreview } from './editor/preview.js';
import { getTemplate } from './editor/templates.js';
import { fetchFiles, fetchRecentFiles, createFile, saveFile, renameFile, deleteFile } from './dashboard/files.js';
import { renderRecentFiles, setGreeting, renderFilesTable, updateFileCountBadge } from './dashboard/dashboard.js';
import { openFolder } from './dashboard/folder.js';
import { toast } from './utils/toast.js';
import { openModal, closeModal, bindClose } from './utils/modal.js';
import { langFromFilename, langLabel, downloadFile, debounce } from './utils/helpers.js';

// ─── App State ────────────────────────────────────────────────────────────────

const state = {
  session: null,
  user: null,
  profile: null,
  isGuest: false,
  allFiles: [],
  pendingRenameFile: null,
  pendingDeleteFile: null,
  autosaveTimer: null,
};

// ─── Boot ─────────────────────────────────────────────────────────────────────

async function boot() {
  initAuth();
  bindGlobalUI();

  // Check for existing session (handles OAuth redirects too)
  const { data: { session } } = await supabase.auth.getSession();

  supabase.auth.onAuthStateChange(async (_event, newSession) => {
    if (newSession && !state.session) {
      state.session = newSession;
      state.user = newSession.user;
      await startApp(newSession.user);
    } else if (!newSession && state.session) {
      // Signed out
      state.session = null;
      state.user = null;
      state.profile = null;
      showLanding();
    }
  });

  if (session) {
    state.session = session;
    state.user = session.user;
    await startApp(session.user);
  }

  // Guest button
  document.getElementById('btn-guest')?.addEventListener('click', () => {
    state.isGuest = true;
    Object.assign(state, enterGuestMode());
    launchApp();
  });
}

// ─── Start authenticated app ──────────────────────────────────────────────────

async function startApp(user) {
  state.isGuest = false;

  // Load profile (created automatically by DB trigger)
  // Retry a couple times since trigger may have a brief delay
  let profile = null;
  for (let i = 0; i < 3; i++) {
    profile = await loadProfile(user.id);
    if (profile) break;
    await new Promise(r => setTimeout(r, 600));
  }
  state.profile = profile;

  launchApp();
}

// ─── Launch UI ────────────────────────────────────────────────────────────────

async function launchApp() {
  // Hide landing, show app
  document.getElementById('landing-page').style.display = 'none';
  document.getElementById('app').classList.remove('hidden');

  // Apply saved theme
  const theme = state.profile?.theme || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelectorAll('[data-theme-opt]').forEach(b => {
    b.classList.toggle('active', b.dataset.themeOpt === theme);
  });

  // Render user UI
  renderSidebarUser(state.profile, state.isGuest);
  renderSettingsProfile(state.profile, state.isGuest);
  if (!state.isGuest) {
    setGreeting(state.profile?.username);
    initProfileUI(state.user.id);
  } else {
    setGreeting('Guest');
    document.getElementById('btn-change-username')?.setAttribute('disabled', 'true');
  }

  // Init Monaco
  await loadMonaco();
  createEditor('monaco-editor', theme);
  editorSetTheme(theme);

  // Wire Monaco callbacks
  onContentChange((content) => {
    const tab = getActiveTab();
    if (!tab) return;
    updateTabContent(tab.id, content);
    markDirty(tab.id, true);

    // Update toolbar save status
    setToolbarStatus('saving');

    // Live preview update
    updatePreview(content, tab.language, tab.filename);

    // Autosave for logged-in users
    if (!state.isGuest && tab.dbId) {
      clearTimeout(state.autosaveTimer);
      state.autosaveTimer = setTimeout(() => autosave(tab), 1500);
    }
  });

  onCursorChange((pos) => {
    const stats = getEditorStats();
    document.getElementById('status-cursor').textContent = `Ln ${stats.line}, Col ${stats.column}`;
    document.getElementById('status-lines').textContent = `${stats.lineCount} lines`;
  });

  // Tab switching
  onTabSwitch((tab) => {
    editorOpenFile(tab);
    updateToolbar(tab);
    if (isPreviewOpen()) {
      updatePreview(tab.content, tab.language, tab.filename);
    }
  });

  onTabClose(() => {
    showView('dashboard');
    closePreview();
  });

  // Load cloud files for logged-in users
  if (!state.isGuest) {
    await refreshFiles();
  }

  // Beware-before-leave for guests
  if (state.isGuest) {
    window.addEventListener('beforeunload', (e) => {
      if (getAllTabs().some(t => t.dirty)) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Download your files before leaving.';
      }
    });
  }

  // Floating code particles on landing (already hidden, but clear them)
  document.getElementById('code-particles')?.remove();
}

// ─── View routing ─────────────────────────────────────────────────────────────

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`${name}-view`)?.classList.add('active');

  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === name);
  });

  if (name === 'files') refreshFilesTable();
  if (name === 'settings') renderSettingsProfile(state.profile, state.isGuest);
}

function showLanding() {
  document.getElementById('app').classList.add('hidden');
  document.getElementById('landing-page').style.display = '';
  showLandingView('view-main');
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

function updateToolbar(tab) {
  document.getElementById('toolbar-filename').textContent = tab.filename;
  document.getElementById('toolbar-lang').textContent = langLabel(tab.language);
  document.getElementById('status-lang').textContent = langLabel(tab.language);

  const stats = getEditorStats();
  document.getElementById('status-cursor').textContent = `Ln ${stats.line}, Col ${stats.column}`;
  document.getElementById('status-lines').textContent = `${stats.lineCount} lines`;

  setToolbarStatus(tab.dirty ? 'unsaved' : 'saved');
  showView('editor');
}

function setToolbarStatus(status) {
  const el = document.getElementById('toolbar-save-status');
  if (!el) return;
  if (status === 'saving') {
    el.className = 'toolbar-saved saving';
    el.innerHTML = `<div class="spinner" style="width:10px;height:10px;border-width:1.5px"></div> Saving…`;
  } else if (status === 'saved') {
    el.className = 'toolbar-saved saved';
    el.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Saved`;
  } else if (status === 'unsaved') {
    el.className = 'toolbar-saved';
    el.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Unsaved`;
  } else {
    el.className = 'toolbar-saved saved';
    el.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Saved`;
  }
}

// ─── File operations ──────────────────────────────────────────────────────────

function openNewFileModal() {
  openModal('modal-new-file');
  const nameInput = document.getElementById('new-file-name');
  if (nameInput) { nameInput.value = ''; nameInput.focus(); }
}

async function handleNewFile() {
  const nameInput = document.getElementById('new-file-name');
  const typeSelect = document.getElementById('new-file-type');
  const name = nameInput?.value.trim();
  const lang = typeSelect?.value || 'plaintext';

  if (!name) { toast('Please enter a file name.', 'warning'); return; }

  // Auto-add extension if missing
  const extMap = { html:'html',css:'css',javascript:'js',typescript:'ts',json:'json',markdown:'md',plaintext:'txt',python:'py',java:'java',cpp:'cpp',php:'php' };
  const hasExt = name.includes('.');
  const filename = hasExt ? name : `${name}.${extMap[lang] || 'txt'}`;

  const content = getTemplate(lang, filename);
  closeModal('modal-new-file');

  if (!state.isGuest) {
    // Create in cloud
    const created = await createFile(state.user.id, { filename, language: lang, content });
    if (!created) { toast('Failed to create file.', 'error'); return; }
    state.allFiles.unshift(created);
    updateFileCountBadge(state.allFiles.length);
    openTab({ ...created, dbId: created.id });
    toast(`${filename} created`, 'success');
    refreshRecentFiles();
  } else {
    // Guest: local only
    openTab({ filename, language: lang, content });
    toast(`${filename} created (local)`, 'info');
  }
}

function handleOpenFile() {
  const input = document.getElementById('file-input');
  input.value = '';
  input.accept = '.html,.css,.js,.ts,.json,.md,.txt,.py,.java,.cpp,.php';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const content = await file.text();
    const filename = file.name;
    const language = langFromFilename(filename);
    openTab({ filename, language, content });
    toast(`Opened ${filename}`, 'info');
  };
  input.click();
}

async function handleOpenFolder() {
  await openFolder(({ filename, language, content }) => {
    openTab({ filename, language, content });
  });
}

async function openCloudFile(file) {
  // If already open, switch to it
  const existing = getAllTabs().find(t => t.dbId === file.id);
  if (existing) {
    setActiveTab(existing.id);
    showView('editor');
    return;
  }

  // Fetch full content if not included
  let content = file.content;
  if (content === undefined) {
    const { data } = await supabase.from('files').select('content').eq('id', file.id).single();
    content = data?.content || '';
  }

  openTab({ ...file, dbId: file.id, content });
}

// ─── Save & autosave ──────────────────────────────────────────────────────────

async function handleManualSave() {
  const tab = getActiveTab();
  if (!tab) return;

  if (state.isGuest) {
    toast('Guest mode — use Download to save your file.', 'info');
    return;
  }

  if (!tab.dbId) {
    // File doesn't exist in DB yet (opened locally) — create it
    const created = await createFile(state.user.id, {
      filename: tab.filename,
      language: tab.language,
      content: getContent(),
    });
    if (!created) { toast('Save failed.', 'error'); return; }
    setTabDbId(tab.id, created.id);
    state.allFiles.unshift(created);
    updateFileCountBadge(state.allFiles.length);
    markDirty(created.id, false);
    setToolbarStatus('saved');
    toast('File saved to cloud!', 'success');
    refreshRecentFiles();
    return;
  }

  setToolbarStatus('saving');
  const ok = await saveFile(tab.dbId, getContent());
  if (ok) {
    markDirty(tab.id, false);
    setToolbarStatus('saved');
    // Update local cache
    const cached = state.allFiles.find(f => f.id === tab.dbId);
    if (cached) cached.updated_at = new Date().toISOString();
  } else {
    toast('Save failed.', 'error');
    setToolbarStatus('unsaved');
  }
}

async function autosave(tab) {
  if (!tab.dbId) return;
  const ok = await saveFile(tab.dbId, getContent());
  if (ok) {
    markDirty(tab.id, false);
    setToolbarStatus('saved');
    const cached = state.allFiles.find(f => f.id === tab.dbId);
    if (cached) cached.updated_at = new Date().toISOString();
  }
}

// ─── Download ─────────────────────────────────────────────────────────────────

function handleDownload() {
  const tab = getActiveTab();
  if (!tab) return;
  downloadFile(tab.filename, getContent());
  toast(`Downloaded ${tab.filename}`, 'success');
  markDirty(tab.id, false);
}

// ─── Rename ───────────────────────────────────────────────────────────────────

function openRenameModal(file) {
  state.pendingRenameFile = file;
  const input = document.getElementById('rename-input');
  if (input) input.value = file.filename || file.id || '';
  openModal('modal-rename');
}

async function handleRename() {
  const newName = document.getElementById('rename-input')?.value.trim();
  if (!newName) return;

  const file = state.pendingRenameFile;
  closeModal('modal-rename');

  if (!state.isGuest && file?.id) {
    const ok = await renameFile(file.id, newName);
    if (!ok) { toast('Rename failed.', 'error'); return; }
    const cached = state.allFiles.find(f => f.id === file.id);
    if (cached) cached.filename = newName;
    renameTab(file.id, newName);
    document.getElementById('toolbar-filename').textContent = newName;
    toast(`Renamed to ${newName}`, 'success');
    refreshFilesTable();
    refreshRecentFiles();
  } else {
    // Guest or local tab
    renameTab(file.id, newName);
    if (getActiveTab()?.id === file.id) {
      document.getElementById('toolbar-filename').textContent = newName;
    }
    toast(`Renamed to ${newName}`, 'success');
  }

  state.pendingRenameFile = null;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

function openDeleteModal(file) {
  state.pendingDeleteFile = file;
  document.getElementById('delete-file-name').textContent = file.filename;
  openModal('modal-delete');
}

async function handleDelete() {
  const file = state.pendingDeleteFile;
  closeModal('modal-delete');
  if (!file) return;

  const ok = await deleteFile(file.id);
  if (!ok) { toast('Delete failed.', 'error'); return; }

  state.allFiles = state.allFiles.filter(f => f.id !== file.id);
  updateFileCountBadge(state.allFiles.length);
  closeTab(file.id);
  toast(`${file.filename} deleted`, 'success');
  refreshFilesTable();
  refreshRecentFiles();
  state.pendingDeleteFile = null;
}

// ─── Files list ───────────────────────────────────────────────────────────────

async function refreshFiles() {
  if (state.isGuest) return;
  state.allFiles = await fetchFiles(state.user.id);
  updateFileCountBadge(state.allFiles.length);
}

async function refreshRecentFiles() {
  if (state.isGuest) return;
  const recent = await fetchRecentFiles(state.user.id, 8);
  renderRecentFiles(recent, openCloudFile);
}

function refreshFilesTable() {
  const query = document.getElementById('files-search')?.value || '';
  renderFilesTable(state.allFiles, query, {
    onOpen: openCloudFile,
    onRename: openRenameModal,
    onDelete: openDeleteModal,
  });
}

// ─── Global UI bindings ───────────────────────────────────────────────────────

function bindGlobalUI() {
  // View nav (sidebar + quick action cards)
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });

  // Sidebar file actions
  document.getElementById('nav-new-file')?.addEventListener('click', openNewFileModal);
  document.getElementById('nav-open-file')?.addEventListener('click', handleOpenFile);
  document.getElementById('nav-open-folder')?.addEventListener('click', handleOpenFolder);

  // Quick action cards
  document.getElementById('qa-new-file')?.addEventListener('click', openNewFileModal);
  document.getElementById('qa-open-file')?.addEventListener('click', handleOpenFile);
  document.getElementById('qa-open-folder')?.addEventListener('click', handleOpenFolder);
  document.getElementById('qa-my-files')?.addEventListener('click', () => showView('files'));
  document.getElementById('view-all-files')?.addEventListener('click', () => showView('files'));
  document.getElementById('files-new-btn')?.addEventListener('click', openNewFileModal);

  // New file modal
  bindClose('close-modal-new-file', 'modal-new-file');
  document.getElementById('cancel-new-file')?.addEventListener('click', () => closeModal('modal-new-file'));
  document.getElementById('confirm-new-file')?.addEventListener('click', handleNewFile);
  document.getElementById('new-file-name')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleNewFile();
  });

  // File type auto-names extension preview
  document.getElementById('new-file-type')?.addEventListener('change', (e) => {
    const nameInput = document.getElementById('new-file-name');
    if (!nameInput?.value || nameInput.value.includes('.')) return;
    // Don't override — just let user control it
  });

  // Rename modal
  bindClose('close-modal-rename', 'modal-rename');
  document.getElementById('cancel-rename')?.addEventListener('click', () => closeModal('modal-rename'));
  document.getElementById('confirm-rename')?.addEventListener('click', handleRename);
  document.getElementById('rename-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleRename();
  });

  // Delete modal
  bindClose('close-modal-delete', 'modal-delete');
  document.getElementById('cancel-delete')?.addEventListener('click', () => closeModal('modal-delete'));
  document.getElementById('confirm-delete')?.addEventListener('click', handleDelete);

  // Editor toolbar buttons
  document.getElementById('btn-save')?.addEventListener('click', handleManualSave);
  document.getElementById('btn-download')?.addEventListener('click', handleDownload);
  document.getElementById('btn-undo')?.addEventListener('click', undo);
  document.getElementById('btn-redo')?.addEventListener('click', redo);
  document.getElementById('btn-search-editor')?.addEventListener('click', openSearch);
  document.getElementById('btn-close-editor')?.addEventListener('click', () => {
    const tab = getActiveTab();
    if (tab) closeTab(tab.id);
    else showView('dashboard');
  });

  document.getElementById('btn-rename')?.addEventListener('click', () => {
    const tab = getActiveTab();
    if (tab) openRenameModal({ id: tab.id, filename: tab.filename });
  });

  document.getElementById('btn-preview')?.addEventListener('click', () => {
    const tab = getActiveTab();
    if (!tab) return;
    if (isPreviewOpen()) {
      closePreview();
    } else {
      openPreview(getContent(), tab.language, tab.filename);
    }
  });

  // Keyboard shortcut: Ctrl+S
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleManualSave();
    }
  });

  // Files search
  document.getElementById('files-search')?.addEventListener('input', debounce(() => {
    refreshFilesTable();
  }, 200));

  // Help tabs
  document.querySelectorAll('.help-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.help-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.help-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`help-${tab.dataset.help}`)?.classList.add('active');
    });
  });

  // Logout
  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    toast('Signed out', 'info');
  });

  // Theme switcher (re-apply to Monaco too)
  document.querySelectorAll('[data-theme-opt]').forEach(btn => {
    btn.addEventListener('click', () => {
      editorSetTheme(btn.dataset.themeOpt);
    });
  });

  // Landing code particles
  spawnParticles();
}

// ─── Landing particles ────────────────────────────────────────────────────────

function spawnParticles() {
  const container = document.getElementById('code-particles');
  if (!container) return;

  const snippets = ['const', 'function()', '=>', 'async', 'await', '</>', '{ }', '[]', '===', 'return', '#22c55e', 'import', 'export'];

  function spawn() {
    const el = document.createElement('div');
    el.className = 'code-particle';
    el.textContent = snippets[Math.floor(Math.random() * snippets.length)];
    el.style.left = `${Math.random() * 90}%`;
    el.style.top = `${60 + Math.random() * 30}%`;
    el.style.animationDuration = `${4 + Math.random() * 4}s`;
    el.style.animationDelay = `${Math.random() * 2}s`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 8000);
  }

  // Spawn a few immediately
  for (let i = 0; i < 6; i++) setTimeout(spawn, i * 400);
  // Keep spawning
  setInterval(spawn, 1200);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

boot().catch(console.error);
