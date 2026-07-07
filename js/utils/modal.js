/**
 * PlexCode — Modal Utility
 */

/**
 * Open a modal overlay by ID.
 * @param {string} id
 */
export function openModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.add('open');
  // Focus first input
  const input = overlay.querySelector('input');
  if (input) setTimeout(() => input.focus(), 60);
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(id);
  }, { once: true });
}

/**
 * Close a modal overlay by ID.
 * @param {string} id
 */
export function closeModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) overlay.classList.remove('open');
}

/**
 * Bind a close button within a modal.
 * @param {string} btnId
 * @param {string} modalId
 */
export function bindClose(btnId, modalId) {
  const btn = document.getElementById(btnId);
  if (btn) btn.addEventListener('click', () => closeModal(modalId));
}

/**
 * Show a generic confirm dialog using the delete modal pattern.
 * Returns a Promise<boolean>.
 * @param {string} message
 * @param {string} confirmLabel
 */
export function confirm(message, confirmLabel = 'Confirm') {
  return new Promise((resolve) => {
    const overlay = document.getElementById('modal-delete');
    const nameEl = document.getElementById('delete-file-name');
    const confirmBtn = document.getElementById('confirm-delete');
    const cancelBtn = document.getElementById('cancel-delete');

    if (nameEl) nameEl.textContent = message;
    if (confirmBtn) confirmBtn.textContent = confirmLabel;
    openModal('modal-delete');

    const cleanup = (result) => {
      closeModal('modal-delete');
      resolve(result);
    };

    confirmBtn?.addEventListener('click', () => cleanup(true), { once: true });
    cancelBtn?.addEventListener('click', () => cleanup(false), { once: true });
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(false);
    }, { once: true });
  });
}
