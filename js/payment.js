/**
 * ==========================================================================
 * JV SIPS - PAYMENT & CHECKOUT CONTROLLER
 * ==========================================================================
 */

import { cart } from './cart.js';
import { addSale } from './db.js';
import { formatRM, generateSaleId, toDateInputValue, toMonthInputValue, showToast } from './utils.js';

let currentPaymentMethod = 'cash'; // 'cash' | 'qr'
let isProcessingPayment = false;

// DOM Modal Elements
const paymentModal = document.getElementById('payment-modal');
const paymentModalTitle = document.getElementById('payment-modal-title');
const btnClosePaymentModal = document.getElementById('btn-close-payment-modal');
const btnCancelPayment = document.getElementById('btn-cancel-payment');
const btnConfirmPayment = document.getElementById('btn-confirm-payment');

const paymentTotalDisplay = document.getElementById('payment-total-display');
const cashPaymentSection = document.getElementById('cash-payment-section');
const qrPaymentSection = document.getElementById('qr-payment-section');

// Cash inputs & change
const inputCashReceived = document.getElementById('input-cash-received');
const changeBox = document.getElementById('change-box');
const changeValueDisplay = document.getElementById('change-value-display');
const quickCashPresets = document.getElementById('quick-cash-presets');

// Success Receipt Modal
const receiptModal = document.getElementById('receipt-modal');
const receiptSaleId = document.getElementById('receipt-sale-id');
const receiptTotal = document.getElementById('receipt-total');
const receiptMethod = document.getElementById('receipt-method');
const receiptCashRow = document.getElementById('receipt-cash-row');
const receiptCashReceived = document.getElementById('receipt-cash-received');
const receiptChange = document.getElementById('receipt-change');
const btnCloseReceipt = document.getElementById('btn-close-receipt');

/**
 * Initialize payment controller listeners
 */
export function initPaymentController() {
  btnClosePaymentModal.addEventListener('click', closePaymentModal);
  btnCancelPayment.addEventListener('click', closePaymentModal);
  btnConfirmPayment.addEventListener('click', handleConfirmPayment);

  // Cash received input event
  inputCashReceived.addEventListener('input', calculateChange);

  // Quick cash preset buttons
  quickCashPresets.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-cash-preset');
    if (!btn) return;
    const val = parseFloat(btn.dataset.amount);
    if (!isNaN(val)) {
      inputCashReceived.value = val.toFixed(2);
      calculateChange();
    }
  });

  // Close receipt modal
  btnCloseReceipt.addEventListener('click', () => {
    receiptModal.classList.remove('active');
  });
}

/**
 * Open Checkout Modal for Cash or QR
 */
export function openCheckout(method = 'cash') {
  if (cart.isEmpty()) {
    showToast('Your cart is empty. Please add drinks before checking out.', 'warning');
    return;
  }

  currentPaymentMethod = method;
  const grandTotal = cart.getTotal();

  paymentTotalDisplay.textContent = formatRM(grandTotal);

  if (method === 'cash') {
    paymentModalTitle.textContent = 'Cash Payment';
    cashPaymentSection.style.display = 'block';
    qrPaymentSection.style.display = 'none';

    // Set default cash received to total (exact amount)
    inputCashReceived.value = grandTotal.toFixed(2);
    setupQuickCashPresets(grandTotal);
    calculateChange();
  } else {
    paymentModalTitle.textContent = 'QR Payment';
    cashPaymentSection.style.display = 'none';
    qrPaymentSection.style.display = 'block';
  }

  paymentModal.classList.add('active');
  if (method === 'cash') {
    setTimeout(() => inputCashReceived.select(), 150);
  }
}

function closePaymentModal() {
  paymentModal.classList.remove('active');
  isProcessingPayment = false;
  btnConfirmPayment.disabled = false;
  btnConfirmPayment.innerHTML = 'Confirm Payment';
}

/**
 * Generate smart quick cash button presets based on total
 */
function setupQuickCashPresets(total) {
  const presets = [
    { label: 'Exact', amount: total },
    { label: 'RM 10', amount: 10 },
    { label: 'RM 20', amount: 20 },
    { label: 'RM 50', amount: 50 },
    { label: 'RM 100', amount: 100 }
  ];

  // Filter presets so we show relevant options
  quickCashPresets.innerHTML = presets
    .filter(p => p.label === 'Exact' || p.amount >= total)
    .slice(0, 5)
    .map(p => `
      <button type="button" class="btn-cash-preset" data-amount="${p.amount}">
        ${p.label === 'Exact' ? `Exact (${formatRM(p.amount)})` : p.label}
      </button>
    `).join('');
}

/**
 * Calculate change and update UI
 */
function calculateChange() {
  const total = cart.getTotal();
  const received = parseFloat(inputCashReceived.value);

  if (isNaN(received) || received < total) {
    changeBox.className = 'change-display-box change-invalid';
    changeValueDisplay.textContent = isNaN(received) ? 'Enter amount' : `Short by ${formatRM(total - received)}`;
    btnConfirmPayment.disabled = true;
  } else {
    const change = received - total;
    changeBox.className = 'change-display-box';
    changeValueDisplay.textContent = formatRM(change);
    btnConfirmPayment.disabled = false;
  }
}

/**
 * Process and save completed sale
 */
async function handleConfirmPayment() {
  if (isProcessingPayment) return; // Prevent double checkout
  if (cart.isEmpty()) return;

  const total = cart.getTotal();
  const subtotal = cart.getSubtotal();
  const discount = cart.getDiscount();
  const now = new Date();

  let cashReceived = null;
  let change = null;

  if (currentPaymentMethod === 'cash') {
    cashReceived = parseFloat(inputCashReceived.value);
    if (isNaN(cashReceived) || cashReceived < total) {
      showToast('Cash received cannot be less than the total amount.', 'error');
      return;
    }
    change = Number((cashReceived - total).toFixed(2));
  }

  // Double-click protection lock
  isProcessingPayment = true;
  btnConfirmPayment.disabled = true;
  btnConfirmPayment.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin-icon" style="animation: spin 1s linear infinite;"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" /></svg>
    Processing Sale...
  `;

  // Build snapshot payload
  const saleId = generateSaleId();
  const salePayload = {
    saleId,
    items: cart.getItems(), // Snapshot of items at current prices
    totalItems: cart.getItemCount(),
    subtotal,
    discount,
    total,
    paymentMethod: currentPaymentMethod,
    cashReceived,
    change,
    saleDate: toDateInputValue(now),
    saleMonth: toMonthInputValue(now),
    saleYear: now.getFullYear(),
    createdAt: now.toISOString()
  };

  try {
    await addSale(salePayload);

    // Show Success Modal
    closePaymentModal();
    displayReceiptModal(salePayload);

    // Clear cart state
    cart.clear();
    showToast('Payment Successful! Sale recorded.', 'success', 4000);
  } catch (err) {
    console.error('Sale persistence failed:', err);
    showToast('Checkout failed: ' + err.message, 'error');
    btnConfirmPayment.disabled = false;
    btnConfirmPayment.innerHTML = 'Confirm Payment';
    isProcessingPayment = false;
  }
}

/**
 * Display confirmation receipt popup
 */
function displayReceiptModal(sale) {
  receiptSaleId.textContent = sale.saleId;
  receiptTotal.textContent = formatRM(sale.total);
  receiptMethod.textContent = sale.paymentMethod === 'cash' ? 'Cash Payment' : 'QR Payment';

  if (sale.paymentMethod === 'cash') {
    receiptCashRow.style.display = 'flex';
    receiptCashReceived.textContent = formatRM(sale.cashReceived);
    receiptChange.textContent = formatRM(sale.change);
  } else {
    receiptCashRow.style.display = 'none';
  }

  receiptModal.classList.add('active');
}
