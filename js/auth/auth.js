/**
 * PlexCode — Authentication Module
 */

import supabase from '../supabase.js';
import { toast } from '../utils/toast.js';
import { isValidEmail, validatePassword, sanitizeUsername } from '../utils/helpers.js';

// ─── Prostar OAuth Config ─────────────────────────────────────────────────────

const PROSTAR = {
  clientId: 'plexcode',
  clientSecret: 'e2108e3521fccafd5b98d531d30d55447058f61b46bf2f042c804a56d90183f5',
  authorizeUrl: 'https://prostar-acc.vercel.app/oauth/authorize.html',
  tokenUrl: 'https://agechujhqhbmuenncwtb.supabase.co/functions/v1/prostar-token',
  redirectUri: 'https://plex-code.vercel.app/prostar-callback.html',
};

// ─── View switching ───────────────────────────────────────────────────────────

export function showLandingView(id) {
  document.querySelectorAll('.landing-view').forEach(v => v.classList.add('hidden'));
  const target = document.getElementById(id);
  if (target) target.classList.remove('hidden');
}

// ─── Password toggle ──────────────────────────────────────────────────────────

function bindPasswordToggle(toggleId, inputId) {
  const btn = document.getElementById(toggleId);
  const input = document.getElementById(inputId);
  if (!btn || !input) return;
  btn.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.innerHTML = show
      ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
      : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  });
}

// ─── Button loading state ─────────────────────────────────────────────────────

function setLoading(btn, loading, label) {
  if (loading) {
    btn.disabled = true;
    btn.innerHTML = `<div class="btn-spinner"></div> ${label || ''}`;
  } else {
    btn.disabled = false;
    btn.textContent = label;
  }
}

// ─── Error display ────────────────────────────────────────────────────────────

function showError(elId, msg) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('show', !!msg);
}

// ─── Google OAuth ─────────────────────────────────────────────────────────────

async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) toast(error.message, 'error');
}

// ─── Prostar OAuth ────────────────────────────────────────────────────────────

export function signInWithProstar() {
  // Generate random state for CSRF protection
  const state = crypto.randomUUID();
  sessionStorage.setItem('prostar_state', state);

  const params = new URLSearchParams({
    client_id: PROSTAR.clientId,
    redirect_uri: PROSTAR.redirectUri,
    state,
    scope: 'profile email',
  });

  window.location.href = `${PROSTAR.authorizeUrl}?${params}`;
}

/**
 * Called from prostar-callback.html after redirect.
 * Exchanges the code for user info, then signs into Supabase.
 * @param {string} code
 * @param {string} state
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function handleProstarCallback(code, state) {
  // Verify state
  const savedState = sessionStorage.getItem('prostar_state');
  sessionStorage.removeItem('prostar_state');

  if (!savedState || savedState !== state) {
    return { ok: false, error: 'Invalid state parameter. Please try again.' };
  }

  // Exchange code for user info
  let userData;
  try {
    const res = await fetch(PROSTAR.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: PROSTAR.clientId,
        client_secret: PROSTAR.clientSecret,
        redirect_uri: PROSTAR.redirectUri,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: err.error || 'Token exchange failed.' };
    }

    const data = await res.json();
    userData = data.user;
  } catch (e) {
    return { ok: false, error: 'Network error during token exchange.' };
  }

  if (!userData?.email) {
    return { ok: false, error: 'No email returned from Prostar.' };
  }

  // Sign into Supabase using the Prostar email.
  // We use signInWithPassword with a deterministic password derived from
  // the Prostar user ID — the user never sees or needs this password.
  const deterministicPassword = `prostar_${userData.id}_${PROSTAR.clientSecret.slice(0, 16)}`;

  // Try sign in first
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: userData.email,
    password: deterministicPassword,
  });

  if (!signInError && signInData.session) {
    // Existing user — update avatar if changed
    if (userData.avatar_url) {
      await supabase.from('profiles').update({
        avatar_url: userData.avatar_url,
      }).eq('id', signInData.user.id);
    }
    return { ok: true };
  }

  // If sign in failed, create the account
  const username = sanitizeUsername(
    userData.name || userData.email.split('@')[0]
  );

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: userData.email,
    password: deterministicPassword,
    options: {
      data: {
        preferred_username: username,
        user_name: username,
        avatar_url: userData.avatar_url || null,
        prostar_id: userData.id,
      },
      // Skip email confirmation for Prostar-verified users
      emailRedirectTo: undefined,
    },
  });

  if (signUpError) {
    return { ok: false, error: signUpError.message };
  }

  // If email confirmation is required, auto-confirm via admin isn't possible
  // on client side — so we sign in immediately after signup
  if (signUpData.session) {
    return { ok: true };
  }

  // Try signing in immediately (works if email confirm is OFF)
  const { error: retryError } = await supabase.auth.signInWithPassword({
    email: userData.email,
    password: deterministicPassword,
  });

  if (retryError) {
    return { ok: false, error: 'Account created — please disable email confirmation in Supabase for Prostar login to work seamlessly, or confirm your email.' };
  }

  return { ok: true };
}

// ─── Email Sign In ────────────────────────────────────────────────────────────

async function handleSignIn() {
  const email = document.getElementById('signin-email')?.value.trim();
  const password = document.getElementById('signin-password')?.value;
  const btn = document.getElementById('btn-signin');

  showError('signin-error', '');

  if (!isValidEmail(email)) { showError('signin-error', 'Please enter a valid email address.'); return; }
  if (!password) { showError('signin-error', 'Password is required.'); return; }

  setLoading(btn, true, 'Signing in…');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  setLoading(btn, false, 'Sign In');

  if (error) {
    showError('signin-error', error.message === 'Invalid login credentials'
      ? 'Incorrect email or password.'
      : error.message);
  }
}

// ─── Email Sign Up ────────────────────────────────────────────────────────────

async function handleSignUp() {
  const username = document.getElementById('signup-username')?.value.trim();
  const email = document.getElementById('signup-email')?.value.trim();
  const password = document.getElementById('signup-password')?.value;
  const btn = document.getElementById('btn-signup');

  showError('signup-error', '');
  showError('signup-username-error', '');
  showError('signup-email-error', '');
  showError('signup-password-error', '');

  let valid = true;

  if (!username || username.length < 2) {
    showError('signup-username-error', 'Username must be at least 2 characters.');
    valid = false;
  }
  if (!isValidEmail(email)) {
    showError('signup-email-error', 'Please enter a valid email address.');
    valid = false;
  }
  const pwResult = validatePassword(password);
  if (!pwResult.valid) {
    showError('signup-password-error', pwResult.message);
    valid = false;
  }
  if (!valid) return;

  const cleanUsername = sanitizeUsername(username);
  setLoading(btn, true, 'Creating account…');

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { preferred_username: cleanUsername, user_name: cleanUsername },
    },
  });

  setLoading(btn, false, 'Create Account');

  if (error) { showError('signup-error', error.message); return; }

  if (data.user && !data.session) {
    toast('Check your email to confirm your account!', 'info', 6000);
    showLandingView('view-signin');
  }
}

// ─── Guest mode ───────────────────────────────────────────────────────────────

export function enterGuestMode() {
  return { isGuest: true, user: null, profile: null };
}

// ─── Init auth UI ─────────────────────────────────────────────────────────────

export function initAuth() {
  // View navigation
  document.getElementById('btn-goto-signin')?.addEventListener('click', () => showLandingView('view-signin'));
  document.getElementById('btn-goto-signup')?.addEventListener('click', () => showLandingView('view-signup'));
  document.getElementById('goto-signup-from-signin')?.addEventListener('click', () => showLandingView('view-signup'));
  document.getElementById('goto-signin-from-signup')?.addEventListener('click', () => showLandingView('view-signin'));
  document.getElementById('goto-main-from-signin')?.addEventListener('click', () => showLandingView('view-main'));
  document.getElementById('goto-main-from-signup')?.addEventListener('click', () => showLandingView('view-main'));

  // Google buttons
  document.getElementById('btn-google-main')?.addEventListener('click', signInWithGoogle);
  document.getElementById('btn-google-signin')?.addEventListener('click', signInWithGoogle);
  document.getElementById('btn-google-signup')?.addEventListener('click', signInWithGoogle);

  // Prostar buttons
  document.getElementById('btn-prostar-main')?.addEventListener('click', signInWithProstar);
  document.getElementById('btn-prostar-signin')?.addEventListener('click', signInWithProstar);

  // Email auth
  document.getElementById('btn-signin')?.addEventListener('click', handleSignIn);
  document.getElementById('btn-signup')?.addEventListener('click', handleSignUp);

  // Enter key support
  document.getElementById('signin-password')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSignIn();
  });
  document.getElementById('signup-password')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSignUp();
  });

  // Password toggles
  bindPasswordToggle('signin-pw-toggle', 'signin-password');
  bindPasswordToggle('signup-pw-toggle', 'signup-password');
}