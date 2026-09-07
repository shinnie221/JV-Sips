/**
 * ==========================================================================
 * JV SIPS - PRODUCT MANAGEMENT CONTROLLER
 * ==========================================================================
 */

import { getProducts, addProduct, updateProduct, deleteProduct, toggleProductActive } from './db.js';
import { seedInitialMenu } from './seed.js';
import { formatRM, showToast, escapeHtml, getCategoryBadgeClass, sortProductsByCategory, groupProductsByCategory } from './utils.js';
import { initAuthHeader, requireManagerAuth } from './auth.js';

let allProducts = [];
let activeCategory = 'all';
let searchQuery = '';
let deletingProductId = null;

// DOM Elements
const productsGrid = document.getElementById('products-grid');
const searchInput = document.getElementById('search-input');
const categoryPills = document.getElementById('category-pills');
const btnAddProduct = document.getElementById('btn-add-product');
const btnSeedMenu = document.getElementById('btn-seed-menu');

// Product Modal Elements
const productModal = document.getElementById('product-modal');
const productForm = document.getElementById('product-form');
const modalTitle = document.getElementById('modal-product-title');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCancelModal = document.getElementById('btn-cancel-modal');
const inputId = document.getElementById('product-id');
const inputName = document.getElementById('prod-name');
const inputChineseName = document.getElementById('prod-chinese-name');
const inputCategory = document.getElementById('prod-category');
const inputPrice = document.getElementById('prod-price');
const checkAllowOatMilk = document.getElementById('prod-allow-oatmilk');
const oatmilkToggleBox = document.getElementById('oatmilk-toggle-box');
const oatmilkPriceGroup = document.getElementById('oatmilk-price-group');
const inputOatMilkPrice = document.getElementById('prod-oatmilk-price');
const checkActive = document.getElementById('prod-active');
const activeLabel = document.getElementById('prod-active-label');

// Delete Modal Elements
const deleteModal = document.getElementById('delete-modal');
const deleteProductName = document.getElementById('delete-product-name');
const btnCloseDeleteModal = document.getElementById('btn-close-delete-modal');
const btnCancelDelete = document.getElementById('btn-cancel-delete');
const btnConfirmDelete = document.getElementById('btn-confirm-delete');

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
  initAuthHeader();
  setupEventListeners();
  await loadAndRenderProducts();
});

function setupEventListeners() {
  // Search input
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderFilteredProducts();
  });

  // Category filter pills
  categoryPills.addEventListener('click', (e) => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    activeCategory = pill.dataset.category;
    renderFilteredProducts();
  });

  // Oat Milk tick toggle behavior in modal
  checkAllowOatMilk.addEventListener('change', () => {
    toggleOatMilkInputs(checkAllowOatMilk.checked);
  });

  oatmilkToggleBox.addEventListener('click', (e) => {
    if (e.target !== checkAllowOatMilk) {
      checkAllowOatMilk.checked = !checkAllowOatMilk.checked;
      toggleOatMilkInputs(checkAllowOatMilk.checked);
    }
  });

  // Active checkbox label change
  checkActive.addEventListener('change', () => {
    activeLabel.textContent = checkActive.checked 
      ? 'Active (Available on POS)' 
      : 'Inactive (Hidden from POS)';
  });

  // Add Product Button
  btnAddProduct.addEventListener('click', () => {
    requireManagerAuth(() => {
      openProductModal('add');
    }, 'Manager Access: Add Product');
  });

  // Seed Menu Button
  btnSeedMenu.addEventListener('click', async () => {
    requireManagerAuth(async () => {
      const confirmSeed = confirm('Would you like to seed the 6 default menu drinks?\n\n(Click OK to seed. Any existing products with different names will be kept, or if already seeded it will safely populate)');
      if (!confirmSeed) return;

      btnSeedMenu.disabled = true;
      try {
        const result = await seedInitialMenu(false);
        if (!result.success && result.message.includes('already exist')) {
          const replace = confirm('Products already exist. Do you want to reset & replace with the 6 standard default drinks?');
          if (replace) {
            await seedInitialMenu(true);
            showToast('Menu reset to 6 default drinks!', 'success');
          }
        } else {
          showToast(result.message, 'success');
        }
        await loadAndRenderProducts();
      } catch (err) {
        showToast('Error seeding menu: ' + err.message, 'error');
      } finally {
        btnSeedMenu.disabled = false;
      }
    }, 'Manager Access: Reset Menu');
  });

  // Modal Closers
  btnCloseModal.addEventListener('click', closeProductModal);
  btnCancelModal.addEventListener('click', closeProductModal);
  btnCloseDeleteModal.addEventListener('click', closeDeleteModal);
  btnCancelDelete.addEventListener('click', closeDeleteModal);

  // Form Submit
  productForm.addEventListener('submit', handleProductFormSubmit);

  // Delete Confirm
  btnConfirmDelete.addEventListener('click', handleConfirmDelete);
}

function toggleOatMilkInputs(isChecked) {
  if (isChecked) {
    oatmilkPriceGroup.style.display = 'block';
    oatmilkToggleBox.classList.add('selected');
    if (!inputOatMilkPrice.value || parseFloat(inputOatMilkPrice.value) <= 0) {
      inputOatMilkPrice.value = '2.00';
    }
  } else {
    oatmilkPriceGroup.style.display = 'none';
    oatmilkToggleBox.classList.remove('selected');
  }
}

async function loadAndRenderProducts() {
  try {
    allProducts = await getProducts();
    
    // Auto-seed if completely empty so user doesn't see a blank page on first run
    if (allProducts.length === 0) {
      await seedInitialMenu(false);
      allProducts = await getProducts();
    }
    
    renderFilteredProducts();
  } catch (err) {
    console.error(err);
    showToast('Failed to load products: ' + err.message, 'error');
    productsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3 class="empty-title">Error Loading Products</h3>
        <p class="empty-desc">${escapeHtml(err.message)}</p>
      </div>
    `;
  }
}

function renderFilteredProducts() {
  let filtered = sortProductsByCategory(allProducts);

  // Category filter
  if (activeCategory !== 'all') {
    filtered = filtered.filter(p => p.category.toLowerCase() === activeCategory.toLowerCase());
  }

  // Search filter
  if (searchQuery) {
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(searchQuery) ||
      (p.chineseName && p.chineseName.toLowerCase().includes(searchQuery)) ||
      p.category.toLowerCase().includes(searchQuery)
    );
  }

  if (filtered.length === 0) {
    productsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🍵</div>
        <h3 class="empty-title">No Drinks Found</h3>
        <p class="empty-desc">No drinks match your current filter or search criteria.</p>
        <button id="btn-empty-add" class="btn btn-primary">Add New Drink</button>
      </div>
    `;
    const btnEmptyAdd = document.getElementById('btn-empty-add');
    if (btnEmptyAdd) btnEmptyAdd.addEventListener('click', () => openProductModal('add'));
    return;
  }

  const categoryGroups = groupProductsByCategory(filtered);

  productsGrid.innerHTML = categoryGroups.map(group => {
    const cardsHtml = group.items.map(p => {
      const badgeClass = getCategoryBadgeClass(p.category);
      const oatMilkInfo = p.allowOatMilk 
        ? `<span class="oat-milk-badge-yes"><svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg> Allowed (+${formatRM(p.oatMilkPrice || 2)})</span>`
        : `<span class="oat-milk-badge-no">Not applicable</span>`;

      return `
        <div class="product-manage-card ${p.active ? '' : 'inactive'}" data-id="${escapeHtml(p.id)}">
          <div class="product-card-top">
            <div class="product-title-group">
              <span class="badge ${badgeClass}" style="margin-bottom: 6px;">${escapeHtml(p.category)}</span>
              <div class="product-name-en">${escapeHtml(p.name)}</div>
              ${p.chineseName ? `<div class="product-name-cn">${escapeHtml(p.chineseName)}</div>` : ''}
            </div>
            <div class="product-price-badge">${formatRM(p.price)}</div>
          </div>

          <div class="product-details-list">
            <div class="detail-row">
              <span class="detail-label">Oat Milk Add-on:</span>
              <span class="detail-val">${oatMilkInfo}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">POS Status:</span>
              <span class="detail-val" style="color: ${p.active ? 'var(--primary-dark)' : 'var(--text-muted)'}">
                ${p.active ? '● Active' : '○ Hidden'}
              </span>
            </div>
          </div>

          <div class="product-card-actions">
            <label class="status-switch-wrapper" title="Toggle visibility on POS">
              <span class="switch">
                <input type="checkbox" class="toggle-status-checkbox" data-id="${escapeHtml(p.id)}" ${p.active ? 'checked' : ''}>
                <span class="slider"></span>
              </span>
              <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted);">${p.active ? 'Active' : 'Disabled'}</span>
            </label>

            <div class="btn-group-actions">
              <button class="btn-icon btn-edit" data-id="${escapeHtml(p.id)}" title="Edit Drink">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
              </button>
              <button class="btn-icon btn-delete" data-id="${escapeHtml(p.id)}" data-name="${escapeHtml(p.name)}" title="Delete Drink" style="color: var(--danger);">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="product-category-group">
        <div class="product-category-group-header">
          <div class="product-category-group-title">
            <span class="product-cat-icon">${group.emoji}</span>
            <span class="product-cat-name">${escapeHtml(group.category)}</span>
            ${group.chineseTitle ? `<span class="product-cat-cn">${escapeHtml(group.chineseTitle)}</span>` : ''}
          </div>
          <span class="badge ${group.badgeClass}">${group.items.length} ${group.items.length === 1 ? 'item' : 'items'}</span>
        </div>
        <div class="product-category-group-grid">
          ${cardsHtml}
        </div>
      </div>
    `;
  }).join('');

  // Attach card event handlers
  document.querySelectorAll('.toggle-status-checkbox').forEach(cb => {
    cb.addEventListener('change', async (e) => {
      const id = e.target.dataset.id;
      const newStatus = e.target.checked;
      requireManagerAuth(async () => {
        try {
          await toggleProductActive(id, newStatus);
          const prod = allProducts.find(p => p.id === id);
          if (prod) prod.active = newStatus;
          showToast(`Status updated to ${newStatus ? 'Active' : 'Disabled'}`, 'success');
          renderFilteredProducts();
        } catch (err) {
          e.target.checked = !newStatus;
          showToast('Failed to update status: ' + err.message, 'error');
        }
      }, 'Manager Access: Toggle Status');
    });
  });

  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      requireManagerAuth(() => {
        openProductModal('edit', id);
      }, 'Manager Access: Edit Drink');
    });
  });

  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const name = btn.dataset.name;
      requireManagerAuth(() => {
        openDeleteModal(id, name);
      }, 'Manager Access: Delete Drink');
    });
  });
}

function openProductModal(mode = 'add', productId = null) {
  productForm.reset();
  if (mode === 'add') {
    modalTitle.textContent = 'Add New Product';
    inputId.value = '';
    inputPrice.value = '';
    checkAllowOatMilk.checked = false;
    toggleOatMilkInputs(false);
    checkActive.checked = true;
    activeLabel.textContent = 'Active (Available on POS)';
  } else {
    modalTitle.textContent = 'Edit Product';
    const prod = allProducts.find(p => p.id === productId);
    if (!prod) return;

    inputId.value = prod.id;
    inputName.value = prod.name;
    inputChineseName.value = prod.chineseName || '';
    inputCategory.value = prod.category;
    inputPrice.value = prod.price;
    checkAllowOatMilk.checked = Boolean(prod.allowOatMilk);
    toggleOatMilkInputs(prod.allowOatMilk);
    inputOatMilkPrice.value = prod.oatMilkPrice !== undefined ? prod.oatMilkPrice : '2.00';
    checkActive.checked = prod.active !== false;
    activeLabel.textContent = checkActive.checked ? 'Active (Available on POS)' : 'Inactive (Hidden from POS)';
  }

  productModal.classList.add('active');
  inputName.focus();
}

function closeProductModal() {
  productModal.classList.remove('active');
}

async function handleProductFormSubmit(e) {
  e.preventDefault();

  const id = inputId.value;
  const name = inputName.value.trim();
  const chineseName = inputChineseName.value.trim();
  const category = inputCategory.value.trim();
  const price = parseFloat(inputPrice.value);
  const allowOatMilk = checkAllowOatMilk.checked;
  const oatMilkPrice = allowOatMilk ? parseFloat(inputOatMilkPrice.value) || 2 : 0;
  const active = checkActive.checked;

  if (!name || !category || isNaN(price) || price < 0) {
    showToast('Please enter valid product name, category, and price.', 'warning');
    return;
  }

  const payload = {
    name,
    chineseName,
    category,
    price,
    allowOatMilk,
    oatMilkPrice,
    active
  };

  const btnSubmit = document.getElementById('btn-save-product');
  btnSubmit.disabled = true;

  try {
    if (id) {
      await updateProduct(id, payload);
      showToast(`Updated "${name}" successfully!`, 'success');
    } else {
      await addProduct(payload);
      showToast(`Added "${name}" to catalog!`, 'success');
    }
    closeProductModal();
    await loadAndRenderProducts();
  } catch (err) {
    showToast('Failed to save product: ' + err.message, 'error');
  } finally {
    btnSubmit.disabled = false;
  }
}

function openDeleteModal(id, name) {
  deletingProductId = id;
  deleteProductName.textContent = name;
  deleteModal.classList.add('active');
}

function closeDeleteModal() {
  deleteModal.classList.remove('active');
  deletingProductId = null;
}

async function handleConfirmDelete() {
  if (!deletingProductId) return;
  btnConfirmDelete.disabled = true;
  try {
    await deleteProduct(deletingProductId);
    showToast('Product deleted successfully.', 'success');
    closeDeleteModal();
    await loadAndRenderProducts();
  } catch (err) {
    showToast('Failed to delete product: ' + err.message, 'error');
  } finally {
    btnConfirmDelete.disabled = false;
  }
}
