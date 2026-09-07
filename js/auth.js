/**
 * ==========================================================================
 * JV SIPS - FIREBASE STAFF AUTHENTICATION & GUEST SANDBOX SYSTEM
 * ==========================================================================
 */

import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';
import { showToast, escapeHtml } from './utils.js';

let authInstance = null;
let currentStaffUser = null;
let isAuthInitialized = false;
let authStateListeners = [];

/**
 * Initialize Firebase Authentication
 */
export async function initFirebaseAuth() {
  if (isAuthInitialized) return { auth: authInstance, user: currentStaffUser };

  if (isFirebaseConfigured()) {
    try {
      const { initializeApp, getApps, getApp } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
      const { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');

      const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
      authInstance = getAuth(app);

      // Listen to auth state changes
      onAuthStateChanged(authInstance, (user) => {
        currentStaffUser = user;
        isAuthInitialized = true;
        updateHeaderAuthUI();
        notifyAuthStateChanged(user);
      });

      return { auth: authInstance, user: currentStaffUser };
    } catch (err) {
      console.warn('⚠️ Firebase Auth init fallback to local sandbox mode:', err);
      isAuthInitialized = true;
      updateHeaderAuthUI();
      return { auth: null, user: null };
    }
  } else {
    isAuthInitialized = true;
    updateHeaderAuthUI();
    return { auth: null, user: null };
  }
}

/**
 * Check if a verified store staff member is currently logged in
 */
export function isStaffLoggedIn() {
  return Boolean(currentStaffUser);
}

/**
 * Get current staff user object or null
 */
export function getCurrentStaffUser() {
  return currentStaffUser;
}

/**
 * Subscribe to Auth State Changes
 */
export function onStaffAuthStateChanged(callback) {
  if (typeof callback === 'function') {
    authStateListeners.push(callback);
    if (isAuthInitialized) {
      callback(currentStaffUser);
    }
  }
}

function notifyAuthStateChanged(user) {
  for (const listener of authStateListeners) {
    try {
      listener(user);
    } catch (err) {
      console.error('Auth state listener error:', err);
    }
  }
}

/**
 * Staff Sign In with Email & Password
 */
export async function signInStaff(email, password) {
  await initFirebaseAuth();

  if (!authInstance) {
    throw new Error('Firebase Auth is not available. Running in local sandbox mode.');
  }

  const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
  const userCredential = await signInWithEmailAndPassword(authInstance, email.trim(), password);
  currentStaffUser = userCredential.user;
  showToast(`Welcome back, ${currentStaffUser.email}! Live Store Mode active.`, 'success', 3500);
  closeStaffLoginModal();
  return userCredential.user;
}

/**
 * Staff Sign Out
 */
export async function signOutStaff() {
  if (authInstance) {
    const { signOut } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
    await signOut(authInstance);
  }
  currentStaffUser = null;
  showToast('Signed out. Switched to Guest Demo Sandbox.', 'info', 3000);
  updateHeaderAuthUI();
}

/**
 * Ensure Staff Login Modal exists in DOM
 */
function ensureStaffModalInDOM() {
  if (document.getElementById('staff-login-modal')) return;

  const modalHtml = `
    <div id="staff-login-modal" class="staff-modal-overlay">
      <div class="staff-modal-card">
        <button id="btn-close-staff-modal" class="staff-modal-close" title="Close">✕</button>

        <div class="staff-modal-header">
          <div class="staff-modal-icon">🔐</div>
          <h3 class="staff-modal-title">Staff Sign In</h3>
          <p class="staff-modal-desc">Sign in with your store account to access Live Cloud Mode and official sales.</p>
        </div>

        <form id="staff-login-form" class="staff-login-form">
          <div class="staff-form-group">
            <label class="staff-form-label" for="staff-input-email">Staff Email</label>
            <input type="email" id="staff-input-email" class="staff-form-input" placeholder="e.g. staff@jvsips.com" required autocomplete="username">
          </div>

          <div class="staff-form-group">
            <label class="staff-form-label" for="staff-input-password">Password</label>
            <input type="password" id="staff-input-password" class="staff-form-input" placeholder="••••••••" required autocomplete="current-password">
          </div>

          <div id="staff-login-error" class="staff-error-msg" style="display: none;"></div>

          <button type="submit" id="btn-staff-submit" class="btn btn-primary staff-submit-btn">
            Sign In to Store
          </button>
        </form>

        <div class="staff-modal-footer">
          <div class="staff-guest-note">
            <strong>Guest Mode:</strong> You can use all POS features in Demo Sandbox without logging in.
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Bind Events
  const modal = document.getElementById('staff-login-modal');
  const btnClose = document.getElementById('btn-close-staff-modal');
  const form = document.getElementById('staff-login-form');
  const errorEl = document.getElementById('staff-login-error');
  const btnSubmit = document.getElementById('btn-staff-submit');

  btnClose.addEventListener('click', closeStaffLoginModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeStaffLoginModal();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('staff-input-email').value;
    const password = document.getElementById('staff-input-password').value;

    errorEl.style.display = 'none';
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin-icon" style="animation: spin 1s linear infinite;"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" /></svg>
      Signing in...
    `;

    try {
      await signInStaff(email, password);
      // Reload current page to switch to Live Cloud Mode
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      console.error('Sign in error:', err);
      let msg = err.message || 'Failed to sign in. Please check your credentials.';
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        msg = 'Invalid email or password. Please verify your staff credentials.';
      } else if (msg.includes('too-many-requests')) {
        msg = 'Too many failed login attempts. Please try again later.';
      }
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = 'Sign In to Store';
    }
  });
}

export function openStaffLoginModal() {
  ensureStaffModalInDOM();
  const modal = document.getElementById('staff-login-modal');
  const errorEl = document.getElementById('staff-login-error');
  const emailInput = document.getElementById('staff-input-email');
  if (errorEl) errorEl.style.display = 'none';
  if (modal) modal.classList.add('active');
  if (emailInput) setTimeout(() => emailInput.focus(), 150);
}

export function closeStaffLoginModal() {
  const modal = document.getElementById('staff-login-modal');
  if (modal) modal.classList.remove('active');
}

/**
 * Initialize Header Auth & Mode Badges
 */
export function initAuthHeader() {
  ensureStaffModalInDOM();
  initFirebaseAuth();
  updateHeaderAuthUI();
}

export function updateHeaderAuthUI() {
  const headerStatus = document.querySelector('.header-status');
  if (!headerStatus) return;

  const isStaff = isStaffLoggedIn();

  if (isStaff) {
    const email = currentStaffUser ? (currentStaffUser.email || 'Staff') : 'Staff';
    headerStatus.innerHTML = `
      <div class="app-mode-wrapper">
        <div class="mode-pill mode-staff" title="Live Store Mode: Connected to official Firebase Cloud DB">
          <span class="mode-dot live"></span>
          <span class="mode-label">Live Store (<strong>${escapeHtml(email)}</strong>)</span>
        </div>
        <button id="btn-header-signout" class="btn-auth-action" title="Sign out of Live Mode">
          Sign Out
        </button>
      </div>
    `;

    const btnSignOut = document.getElementById('btn-header-signout');
    if (btnSignOut) {
      btnSignOut.addEventListener('click', async () => {
        const confirmSignOut = confirm('Sign out of Live Store Mode? The app will return to Guest Sandbox Mode.');
        if (confirmSignOut) {
          await signOutStaff();
          setTimeout(() => window.location.reload(), 400);
        }
      });
    }
  } else {
    headerStatus.innerHTML = `
      <div class="app-mode-wrapper">
        <div class="mode-pill mode-guest" title="Guest Demo Sandbox: Changes are local and do not affect live store database">
          <span class="mode-dot guest"></span>
          <span class="mode-label">Guest Demo Mode</span>
        </div>
        <button id="btn-header-signin" class="btn-auth-action btn-staff-signin" title="Sign in as Store Staff">
          🔑 Staff Login
        </button>
      </div>
    `;

    const btnSignIn = document.getElementById('btn-header-signin');
    if (btnSignIn) {
      btnSignIn.addEventListener('click', openStaffLoginModal);
    }
  }
}
