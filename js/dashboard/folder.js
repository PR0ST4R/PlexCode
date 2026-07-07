/**
 * PlexCode — Folder Tree (File System Access API)
 */

import { langFromFilename } from '../utils/helpers.js';

let _rootHandle = null;
let _onOpenFileCallback = null;

const treeContainer = document.getElementById('folder-tree');
const treeSection = document.getElementById('folder-tree-section');

/**
 * Open a folder via the File System Access API.
 * @param {Function} onOpenFile called with { filename, language, content, localHandle }
 */
export async function openFolder(onOpenFile) {
  _onOpenFileCallback = onOpenFile;

  if (!('showDirectoryPicker' in window)) {
    alert('Your browser does not support the Folder picker (File System Access API).\nTry Chrome or Edge.');
    return;
  }

  try {
    _rootHandle = await window.showDirectoryPicker({ mode: 'read' });
    treeSection?.classList.remove('hidden');
    await renderTree(_rootHandle, treeContainer, 0);
  } catch (e) {
    if (e.name !== 'AbortError') console.error('openFolder error:', e);
  }
}

/**
 * Recursively render the folder tree.
 * @param {FileSystemDirectoryHandle} dirHandle
 * @param {HTMLElement} container
 * @param {number} depth
 */
async function renderTree(dirHandle, container, depth) {
  container.innerHTML = '';

  const entries = [];
  for await (const [name, handle] of dirHandle.entries()) {
    if (name.startsWith('.')) continue; // skip hidden
    entries.push({ name, handle });
  }

  // Sort: folders first, then files
  entries.sort((a, b) => {
    if (a.handle.kind !== b.handle.kind) return a.handle.kind === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  for (const { name, handle } of entries) {
    if (handle.kind === 'directory') {
      const folderEl = document.createElement('div');
      folderEl.innerHTML = `
        <div class="tree-folder" data-name="${name}">
          <span class="tree-folder-toggle">▶</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-warning)">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <span>${name}</span>
        </div>
        <div class="tree-children hidden"></div>`;

      container.appendChild(folderEl);

      const header = folderEl.querySelector('.tree-folder');
      const children = folderEl.querySelector('.tree-children');

      header.addEventListener('click', async () => {
        const isOpen = header.classList.toggle('open');
        children.classList.toggle('hidden', !isOpen);
        if (isOpen && children.children.length === 0) {
          await renderTree(handle, children, depth + 1);
        }
      });
    } else {
      const fileEl = document.createElement('div');
      fileEl.className = 'tree-file';
      fileEl.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <span>${name}</span>`;

      fileEl.addEventListener('click', async () => {
        document.querySelectorAll('.tree-file').forEach(f => f.classList.remove('active'));
        fileEl.classList.add('active');
        try {
          const file = await handle.getFile();
          const content = await file.text();
          if (_onOpenFileCallback) {
            _onOpenFileCallback({
              filename: name,
              language: langFromFilename(name),
              content,
              localHandle: handle,
            });
          }
        } catch (e) {
          console.error('tree file read error:', e);
        }
      });

      container.appendChild(fileEl);
    }
  }
}
