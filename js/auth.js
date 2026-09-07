/**
 * ==========================================================================
 * JV SIPS - STORE MANAGER PIN AUTHENTICATION & SECURITY
 * ==========================================================================
 */

import { showToast, escapeHtml } from './utils.js';

const PIN_STORAGE_KEY = 'jv_sips_manager_pin';
const AUTH_SESSION_KEY = 'jv_sips_manager_authenticated';
const DEFAULT_PIN = '8888';

/**
 * Get current manager PIN
 */
export function getManagerPin() {
  return localStorage.getItem(PIN_STORAGE_KEY) || DEFAULT_PIN;
}

/**
 * Set a new manager PIN
 */
export function setManagerPin(newPin) {
  if (!newPin || newPin.length < 4) {
    throw new Error('PIN must be at least 4 digits');
  }
  localStorage.setItem(PIN_STORAGE_KEY, newPin);
}

/**
 * Check if the current browser session is authenticated as Manager
 */
export function isManagerAuthenticated() {
  return sessionStorage.getItem(AUTH_SESSION_KEY) === 'true';
}

/**
 * Mark session as authenticated
 */
export function setManagerAuthenticated(isAuth = true) {
  if (isAuth) {
    sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
  } else {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
  }
  updateAuthHeaderUI();
}

/**
 * Require manager authentication before performing an action
 * @param {Function} onSuccess Callback to execute if authenticated
 * @param {string} promptTitle Custom title for the PIN modal
 */
export function requireManagerAuth(onSuccess, promptTitle = 'Store Manager PIN Required') {
  if (isManagerAuthenticated()) {
    if (typeof onSuccess === 'function') onSuccess();
    return;
  }
  openPinModal(onSuccess, promptTitle);
}

let pendingAction = null;
let currentEnteredPin = '';

/**
 * Initialize PIN Modal in DOM
 */
function ensurePinModalInDOM() {
  if (document.getElementById('manager-pin-modal')) return;

  const modalHtml = `
    <div id="manager-pin-modal" class="pin-modal-overlay">
      <div class="pin-modal-card">
        <button id="btn-close-pin-modal" class="pin-modal-close" title="Close">✕</button>
        
        <div class="pin-modal-icon">🔒</div>
        <h3 id="pin-modal-title" class="pin-modal-title">Manager Passcode</h3>
        <p class="pin-modal-desc">Enter 4-digit Manager PIN to access or modify store data.</p>
        
        <div class="pin-dots-display" id="pin-dots-display">
          <span class="pin-dot"></span>
          <span class="pin-dot"></span>
          <span class="pin-dot"></span>
          <span class="pin-dot"></span>
        </div>

        <div id="pin-error-msg" class="pin-error-text"></div>

        <div class="pin-keypad">
          <button type="button" class="pin-key-btn" data-val="1">1</button>
          <button type="button" class="pin-key-btn" data-val="2">2</button>
          <button type="button" class="pin-key-btn" data-val="3">3</button>
          <button type="button" class="pin-key-btn" data-val="4">4</button>
          <button type="button" class="pin-key-btn" data-val="5">5</button>
          <button type="button" class="pin-key-btn" data-val="6">6</button>
          <button type="button" class="pin-key-btn" data-val="7">7</button>
          <button type="button" class="pin-key-btn" data-val="8">8</button>
          <button type="button" class="pin-key-btn" data-val="9">9</button>
          <button type="button" class="pin-key-btn pin-key-clear" id="btn-pin-clear">Clear</button>
          <button type="button" class="pin-key-btn" data-val="0">0</button>
          <button type="button" class="pin-key-btn pin-key-del" id="btn-pin-del">⌫</button>
        </div>

        <div class="pin-modal-footer">
          <div class="pin-demo-hint">
            <span class="demo-tag">Portfolio Demo Hint:</span> Default PIN is <strong>8888</strong>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Event handlers
  const modal = document.getElementById('manager-pin-modal');
  const btnClose = document.getElementById('btn-close-pin-modal');
  const btnClear = document.getElementById('btn-pin-clear');
  const btnDel = document.getElementById('btn-pin-del');

  btnClose.addEventListener('click', closePinModal);
  
  btnClear.addEventListener('click', () => {
    currentEnteredPin = '';
    updatePinDots();
  });

  btnDel.addEventListener('click', () => {
    if (currentEnteredPin.length > 0) {
      currentEnteredPin = currentEnteredPin.slice(0, -1);
      updatePinDots();
    }
  });

  modal.querySelectorAll('.pin-key-btn[data-val]').forEach(btn => {
    btn.addEventListener('click', () => {
      const digit = btn.dataset.val;
      handlePinDigitInput(digit);
    });
  });

  // Physical keyboard support
  window.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('active')) return;
    if (e.key >= '0' && e.key <= '9') {
      handlePinDigitInput(e.key);
    } else if (e.key === 'Backspace') {
      if (currentEnteredPin.length > 0) {
        currentEnteredPin = currentEnteredPin.slice(0, -1);
        updatePinDots();
      }
    } else if (e.key === 'Escape') {
      closePinModal();
    }
  });
}

function handlePinDigitInput(digit) {
  if (currentEnteredPin.length >= 4) return;
  currentEnteredPin += digit;
  updatePinDots();

  if (currentEnteredPin.length === 4) {
    validateEnteredPin();
  }
}

function updatePinDots() {
  const dots = document.querySelectorAll('#pin-dots-display .pin-dot');
  dots.forEach((dot, index) => {
    if (index < currentEnteredPin.length) {
      dot.classList.add('filled');
    } else {
      dot.classList.remove('filled');
    }
  });
  const errorMsg = document.getElementById('pin-error-msg');
  if (errorMsg) errorMsg.textContent = '';
}

function validateEnteredPin() {
  const correctPin = getManagerPin();
  const errorMsg = document.getElementById('pin-error-msg');
  const dotsContainer = document.getElementById('pin-dots-display');

  if (currentEnteredPin === correctPin) {
    setManagerAuthenticated(true);
    showToast('Manager access granted!', 'success', 2000);
    closePinModal();
    if (typeof pendingAction === 'function') {
      const action = pendingAction;
      pendingAction = null;
      action();
    }
  } else {
    if (dotsContainer) {
      dotsContainer.classList.add('shake');
      setTimeout(() => dotsContainer.classList.remove('shake'), 500);
    }
    if (errorMsg) {
      errorMsg.textContent = 'Incorrect PIN. Please try again.';
    }
    currentEnteredPin = '';
    setTimeout(() => {
      updatePinDots();
    }, 400);
  }
}

export function openPinModal(onSuccess = null, title = 'Store Manager PIN Required') {
  ensurePinModalInDOM();
  pendingAction = onSuccess;
  currentEnteredPin = '';
  updatePinDots();

  const modal = document.getElementById('manager-pin-modal');
  const titleEl = document.getElementById('pin-modal-title');
  if (titleEl) titleEl.textContent = title;
  
  modal.classList.add('active');
}

export function closePinModal() {
  const modal = document.getElementById('manager-pin-modal');
  if (modal) modal.classList.remove('active');
  pendingAction = null;
  currentEnteredPin = '';
}

/**
 * Initialize Header Auth Lock/Unlock Status Badge and Change PIN button
 */
export function initAuthHeader() {
  ensurePinModalInDOM();
  const headerStatus = document.querySelector('.header-status');
  if (!headerStatus) return;

  let authBadge = document.getElementById('manager-auth-badge');
  if (!authBadge) {
    authBadge = document.createElement('button');
    authBadge.id = 'manager-auth-badge';
    authBadge.className = 'manager-auth-btn';
    headerStatus.prepend(authBadge);
  }

  authBadge.addEventListener('click', () => {
    if (isManagerAuthenticated()) {
      const confirmLock = confirm('Lock Manager Mode now? (You will need to re-enter PIN to edit products or reports)');
      if (confirmLock) {
        setManagerAuthenticated(false);
        showToast('Manager mode locked.', 'info');
      }
    } else {
      openPinModal(() => {
        showToast('Manager mode unlocked!', 'success');
      }, 'Unlock Manager Mode');
    }
  });

  updateAuthHeaderUI();
}

function updateAuthHeaderUI() {
  const authBadge = document.getElementById('manager-auth-badge');
  if (!authBadge) return;

  const isAuth = isManagerAuthenticated();
  if (isAuth) {
    authBadge.innerHTML = '🔓 <span class="hide-mobile">Manager Unlocked</span>';
    authBadge.className = 'manager-auth-btn unlocked';
    authBadge.title = 'Click to lock Manager Mode';
  } else {
    authBadge.innerHTML = '🔒 <span class="hide-mobile">Manager Locked</span>';
    authBadge.className = 'manager-auth-btn locked';
    authBadge.title = 'Click to unlock Manager Mode (Default PIN: 8888)';
  }
}
