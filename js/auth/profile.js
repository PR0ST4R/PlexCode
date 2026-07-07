/**
 * PlexCode — Profile Module
 */

import supabase from '../supabase.js';
import { toast } from '../utils/toast.js';
import { sanitizeUsername, timeAgo } from '../utils/helpers.js';
import { openModal, closeModal } from '../utils/modal.js';

let _profile = null;

export function getProfile() { return _profile; }

export async function loadProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) { console.error('Profile load error:', error); return null; }
  _profile = data;
  return data;
}

export async function updateUsername(userId, newUsername) {
  const clean = sanitizeUsername(newUsername);
  if (!clean || clean.length < 2) return { error: 'Username must be at least 2 characters.' };

  // Check uniqueness
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', clean)
    .neq('id', userId)
    .maybeSingle();

  if (existing) return { error: 'Username already taken.' };

  const { data, error } = await supabase
    .from('profiles')
    .update({ username: clean })
    .eq('id', userId)
    .select()
    .single();

  if (error) return { error: error.message };
  _profile = data;
  return { data };
}

export async function updateTheme(userId, theme) {
  const { error } = await supabase
    .from('profiles')
    .update({ theme })
    .eq('id', userId);
  if (error) { toast('Failed to save theme', 'error'); return; }
  _profile = { ..._profile, theme };
}

export function renderSidebarUser(profile, isGuest) {
  const avatarEl = document.getElementById('sidebar-avatar');
  const usernameEl = document.getElementById('sidebar-username');
  const atEl = document.getElementById('sidebar-at');

  if (isGuest) {
    if (avatarEl) avatarEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>`;
    if (usernameEl) usernameEl.textContent = 'Guest';
    if (atEl) atEl.textContent = 'guest mode';
    return;
  }
  if (!profile) return;

  if (avatarEl) {
    if (profile.avatar_url) {
      avatarEl.innerHTML = `<img src="${profile.avatar_url}" alt="avatar" />`;
    } else {
      avatarEl.textContent = (profile.username || 'U')[0].toUpperCase();
    }
  }
  if (usernameEl) usernameEl.textContent = profile.username;
  if (atEl) atEl.textContent = `${profile.username}@plexcode.com`;
}

export function renderSettingsProfile(profile, isGuest) {
  if (isGuest) return;
  if (!profile) return;

  const avatarEl = document.getElementById('settings-avatar');
  const displayEl = document.getElementById('settings-display-name');
  const atEl = document.getElementById('settings-at');
  const joinedEl = document.getElementById('settings-joined');
  const usernameDisplay = document.getElementById('settings-username-display');
  const emailDisplay = document.getElementById('settings-email-display');

  if (avatarEl) {
    if (profile.avatar_url) {
      avatarEl.innerHTML = `<img src="${profile.avatar_url}" alt="avatar" />`;
    } else {
      avatarEl.textContent = (profile.username || 'U')[0].toUpperCase();
    }
  }
  if (displayEl) displayEl.textContent = profile.username;
  if (atEl) atEl.textContent = `${profile.username}@plexcode.com`;
  if (joinedEl) joinedEl.textContent = `Joined ${timeAgo(profile.created_at)}`;
  if (usernameDisplay) usernameDisplay.textContent = profile.username;
  if (emailDisplay) emailDisplay.textContent = profile.email;
}

export function initProfileUI(userId) {
  // Username change modal
  document.getElementById('btn-change-username')?.addEventListener('click', () => {
    const input = document.getElementById('new-username-input');
    if (input) input.value = _profile?.username || '';
    openModal('modal-username');
  });

  document.getElementById('close-modal-username')?.addEventListener('click', () => closeModal('modal-username'));
  document.getElementById('cancel-username')?.addEventListener('click', () => closeModal('modal-username'));

  document.getElementById('confirm-username')?.addEventListener('click', async () => {
    const val = document.getElementById('new-username-input')?.value.trim();
    const errEl = document.getElementById('username-change-error');
    if (errEl) errEl.textContent = '';

    const result = await updateUsername(userId, val);
    if (result.error) {
      if (errEl) errEl.textContent = result.error;
      return;
    }

    closeModal('modal-username');
    toast('Username updated!', 'success');
    renderSidebarUser(_profile, false);
    renderSettingsProfile(_profile, false);
  });

  // Theme switcher
  document.querySelectorAll('[data-theme-opt]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const theme = btn.dataset.themeOpt;
      document.documentElement.setAttribute('data-theme', theme);
      document.querySelectorAll('[data-theme-opt]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (userId) await updateTheme(userId, theme);
    });
  });
}
