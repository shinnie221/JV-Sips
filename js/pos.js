/**
 * ==========================================================================
 * JV SIPS - POINT OF SALE (POS) CONTROLLER
 * ==========================================================================
 */

import { getProducts } from './db.js';
import { seedInitialMenu } from './seed.js';
import { cart } from './cart.js';
import { initPaymentController, openCheckout } from './payment.js';
import { formatRM, showToast, escapeHtml, getCategoryBadgeClass } from './utils.js';

let activeProducts = [];
let selectedCategory = 'all';
let searchFilter = '';

// Current customized item in modal
let currentProduct = null;
let currentCustomQty = 1;
let currentCustomOatMilk = false;

// DOM Elements
const drinksGrid = document.getElementById('pos-drinks-grid');
const searchInput = document.getElementById('pos-search-input');
const categoryNav = document.getElementById('pos-category-nav');

// Cart DOM Elements
const cartCountBadge = document.getElementById('cart-count-badge');
const cartItemsContainer = document.getElementById('cart-items-container');
const cartSubtotalDisplay = document.getElementById('cart-subtotal-display');
const cartDiscountInput = document.getElementById('cart-discount-input');
const cartDiscountDisplay = document.getElementById('cart-discount-display');
const cartTotalDisplay = document.getElementById('cart-total-display');
const btnClearCart = document.getElementById('btn-clear-cart');
const btnPayCash = document.getElementById('btn-pay-cash');
const btnPayQr = document.getElementById('btn-pay-qr');

// Customizer Modal Elements
const customizerModal = document.getElementById('drink-customizer-modal');
const btnCloseCustomizer = document.getElementById('btn-close-customizer');
const btnCancelCustomizer = document.getElementById('btn-cancel-customizer');
const btnAddToCart = document.getElementById('btn-add-to-cart');
const custCategoryBadge = document.getElementById('cust-category-badge');
const custDrinkName = document.getElementById('cust-drink-name');
const custDrinkChinese = document.getElementById('cust-drink-chinese');
const custBasePrice = document.getElementById('cust-base-price');
const btnCustQtyMinus = document.getElementById('btn-cust-qty-minus');
const btnCustQtyPlus = document.getElementById('btn-cust-qty-plus');
const custQtyDisplay = document.getElementById('cust-qty-display');
const custOatmilkSection = document.getElementById('cust-oatmilk-section');
const custOatmilkCard = document.getElementById('cust-oatmilk-card');
const custOatmilkCheckbox = document.getElementById('cust-oatmilk-checkbox');
const custOatmilkSurcharge = document.getElementById('cust-oatmilk-surcharge');
const custCalculatedSubtotal = document.getElementById('cust-calculated-subtotal');

// Initial setup
document.addEventListener('DOMContentLoaded', async () => {
  initPaymentController();
  setupEventListeners();
  cart.subscribe(renderCart);
  await loadAndRenderMenu();
});

function setupEventListeners() {
  // Search
  searchInput.addEventListener('input', (e) => {
    searchFilter = e.target.value.toLowerCase().trim();
    renderDrinksGrid();
  });

  // Category navigation
  categoryNav.addEventListener('click', (e) => {
    const btn = e.target.closest('.pos-cat-btn');
    if (!btn) return;
    document.querySelectorAll('.pos-cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedCategory = btn.dataset.category;
    renderDrinksGrid();
  });

  // Clear cart
  btnClearCart.addEventListener('click', () => {
    if (cart.isEmpty()) return;
    const confirmClear = confirm('Are you sure you want to clear the current order?');
    if (confirmClear) {
      cart.clear();
      cartDiscountInput.value = '0.00';
      showToast('Order cleared.', 'info');
    }
  });

  // Discount input
  cartDiscountInput.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) || 0;
    cart.setDiscount(val);
  });

  // Checkout buttons
  btnPayCash.addEventListener('click', () => openCheckout('cash'));
  btnPayQr.addEventListener('click', () => openCheckout('qr'));

  // Customizer Quantity controls
  btnCustQtyMinus.addEventListener('click', () => {
    if (currentCustomQty > 1) {
      currentCustomQty--;
      updateCustomizerUI();
    }
  });

  btnCustQtyPlus.addEventListener('click', () => {
    currentCustomQty++;
    updateCustomizerUI();
  });

  // Oat Milk tick box in modal
  custOatmilkCheckbox.addEventListener('change', () => {
    currentCustomOatMilk = custOatmilkCheckbox.checked;
    updateCustomizerUI();
  });

  custOatmilkCard.addEventListener('click', (e) => {
    if (e.target !== custOatmilkCheckbox) {
      custOatmilkCheckbox.checked = !custOatmilkCheckbox.checked;
      currentCustomOatMilk = custOatmilkCheckbox.checked;
      updateCustomizerUI();
    }
  });

  // Close Customizer
  btnCloseCustomizer.addEventListener('click', closeCustomizer);
  btnCancelCustomizer.addEventListener('click', closeCustomizer);

  // Add to cart from modal
  btnAddToCart.addEventListener('click', () => {
    if (!currentProduct) return;

    cart.addItem({
      productId: currentProduct.id,
      name: currentProduct.name,
      chineseName: currentProduct.chineseName,
      category: currentProduct.category,
      basePrice: currentProduct.price,
      oatMilk: currentCustomOatMilk,
      oatMilkPrice: currentProduct.oatMilkPrice || 2.00,
      quantity: currentCustomQty
    });

    showToast(`Added ${currentCustomQty}x ${currentProduct.name} to order`, 'success', 2000);
    closeCustomizer();
  });
}

/**
 * Load active drinks from DB (or auto-seed if none)
 */
async function loadAndRenderMenu() {
  try {
    const products = await getProducts(true); // Active products only
    if (products.length === 0) {
      await seedInitialMenu(false);
      activeProducts = await getProducts(true);
    } else {
      activeProducts = products;
    }
    renderDrinksGrid();
  } catch (err) {
    console.error('Failed to load menu:', err);
    showToast('Failed to load menu: ' + err.message, 'error');
  }
}

/**
 * Render Drinks Grid
 */
function renderDrinksGrid() {
  let filtered = [...activeProducts];

  if (selectedCategory !== 'all') {
    filtered = filtered.filter(p => p.category.toLowerCase() === selectedCategory.toLowerCase());
  }

  if (searchFilter) {
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(searchFilter) ||
      (p.chineseName && p.chineseName.toLowerCase().includes(searchFilter)) ||
      p.category.toLowerCase().includes(searchFilter)
    );
  }

  if (filtered.length === 0) {
    drinksGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; color: var(--text-muted);">
        <p style="font-size: 1.1rem; font-weight: 600;">No drinks available in this category</p>
        <p style="font-size: 0.85rem; margin-top: 4px;">Check Product Management to add or activate drinks.</p>
      </div>
    `;
    return;
  }

  drinksGrid.innerHTML = filtered.map(p => {
    const badgeClass = getCategoryBadgeClass(p.category);
    const hasOatMilk = Boolean(p.allowOatMilk);

    return `
      <div class="pos-drink-card" data-id="${escapeHtml(p.id)}">
        <div class="pos-card-badge">
          <span class="badge ${badgeClass}">${escapeHtml(p.category)}</span>
        </div>
        <div>
          <div class="pos-card-name-en">${escapeHtml(p.name)}</div>
          ${p.chineseName ? `<div class="pos-card-name-cn">${escapeHtml(p.chineseName)}</div>` : ''}
        </div>
        <div class="pos-card-footer">
          <div class="pos-card-price">${formatRM(p.price)}</div>
          ${hasOatMilk ? `<span class="pos-card-addon-indicator">Oat Milk +${formatRM(p.oatMilkPrice || 2)}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Attach card click handlers to open customizer modal
  drinksGrid.querySelectorAll('.pos-drink-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const product = activeProducts.find(p => p.id === id);
      if (product) {
        openCustomizer(product);
      }
    });
  });
}

/**
 * Open Drink Customizer Modal
 */
function openCustomizer(product) {
  currentProduct = product;
  currentCustomQty = 1;
  currentCustomOatMilk = false;

  custDrinkName.textContent = product.name;
  custDrinkChinese.textContent = product.chineseName || '';
  custBasePrice.textContent = formatRM(product.price);
  
  custCategoryBadge.textContent = product.category;
  custCategoryBadge.className = `badge ${getCategoryBadgeClass(product.category)}`;

  // Show or hide Oat Milk tick section based on product.allowOatMilk
  if (product.allowOatMilk) {
    custOatmilkSection.style.display = 'block';
    custOatmilkCheckbox.checked = false;
    custOatmilkSurcharge.textContent = `+${formatRM(product.oatMilkPrice || 2)}`;
  } else {
    custOatmilkSection.style.display = 'none';
    custOatmilkCheckbox.checked = false;
  }

  updateCustomizerUI();
  customizerModal.classList.add('active');
}

function updateCustomizerUI() {
  custQtyDisplay.textContent = currentCustomQty;
  
  if (currentCustomOatMilk) {
    custOatmilkCard.classList.add('selected');
    custOatmilkCheckbox.checked = true;
  } else {
    custOatmilkCard.classList.remove('selected');
    custOatmilkCheckbox.checked = false;
  }

  if (currentProduct) {
    const unitPrice = currentCustomOatMilk 
      ? (currentProduct.price + (currentProduct.oatMilkPrice || 2)) 
      : currentProduct.price;
    const itemSubtotal = unitPrice * currentCustomQty;
    custCalculatedSubtotal.textContent = `${formatRM(itemSubtotal)} (${currentCustomQty} × ${formatRM(unitPrice)})`;
  }
}

function closeCustomizer() {
  customizerModal.classList.remove('active');
  currentProduct = null;
}

/**
 * Render Shopping Cart Component
 */
function renderCart(cartState) {
  const items = cartState.getItems();
  const count = cartState.getItemCount();
  const subtotal = cartState.getSubtotal();
  const discount = cartState.getDiscount();
  const total = cartState.getTotal();

  cartCountBadge.textContent = `${count} ${count === 1 ? 'item' : 'items'}`;
  cartSubtotalDisplay.textContent = formatRM(subtotal);
  cartDiscountDisplay.textContent = `-${formatRM(discount)}`;
  cartTotalDisplay.textContent = formatRM(total);

  const isCartEmpty = items.length === 0;
  btnPayCash.disabled = isCartEmpty;
  btnPayQr.disabled = isCartEmpty;
  cartDiscountInput.disabled = isCartEmpty;

  if (isCartEmpty) {
    cartItemsContainer.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">🛒</div>
        <p style="font-weight:600;">Your cart is empty</p>
        <p style="font-size:0.8rem; margin-top:4px;">Tap any drink on the left to add it to the order.</p>
      </div>
    `;
    return;
  }

  cartItemsContainer.innerHTML = items.map(item => `
    <div class="cart-item-card" data-item-id="${escapeHtml(item.cartItemId)}">
      <div class="cart-item-top">
        <div class="cart-item-info">
          <div class="cart-item-title">${escapeHtml(item.name)}</div>
          ${item.chineseName ? `<div class="cart-item-subtitle">${escapeHtml(item.chineseName)}</div>` : ''}
          ${item.oatMilk ? `<span class="cart-item-addon-tag">✓ Oat Milk (+${formatRM(item.oatMilkPrice)})</span>` : ''}
        </div>
        <div>
          <div class="cart-item-subtotal">${formatRM(item.subtotal)}</div>
          <div class="cart-item-unit-price">@ ${formatRM(item.unitPrice)}</div>
        </div>
      </div>

      <div class="cart-item-bottom">
        <div class="quantity-stepper">
          <button type="button" class="btn-step btn-item-minus" data-id="${escapeHtml(item.cartItemId)}">−</button>
          <span class="step-qty-val">${item.quantity}</span>
          <button type="button" class="btn-step btn-item-plus" data-id="${escapeHtml(item.cartItemId)}">+</button>
        </div>

        <button type="button" class="btn-item-remove" data-id="${escapeHtml(item.cartItemId)}" title="Remove item">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
      </div>
    </div>
  `).join('');

  // Cart item buttons
  cartItemsContainer.querySelectorAll('.btn-item-minus').forEach(btn => {
    btn.addEventListener('click', () => cart.decrementItem(btn.dataset.id));
  });

  cartItemsContainer.querySelectorAll('.btn-item-plus').forEach(btn => {
    btn.addEventListener('click', () => cart.incrementItem(btn.dataset.id));
  });

  cartItemsContainer.querySelectorAll('.btn-item-remove').forEach(btn => {
    btn.addEventListener('click', () => cart.removeItem(btn.dataset.id));
  });
}
