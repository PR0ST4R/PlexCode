/**
 * PlexCode — Toast Notification System
 */

const container = document.getElementById('toast-container');

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'|'warning'} type
 * @param {number} duration ms
 */
export function toast(message, type = 'info', duration = 3000) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<div class="toast-dot"></div><span>${message}</span>`;
  container.appendChild(el);

  const dismiss = () => {
    el.classList.add('out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
    // fallback
    setTimeout(() => el.remove(), 300);
  };

  const timer = setTimeout(dismiss, duration);
  el.addEventListener('click', () => { clearTimeout(timer); dismiss(); });
}
