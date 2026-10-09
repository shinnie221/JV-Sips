/**
 * ==========================================================================
 * JV SIPS - SHOPPING CART STATE & CALCULATION ENGINE
 * ==========================================================================
 */

const STORAGE_KEY = 'jv_sips_active_cart';

class CartState {
  constructor() {
    this.items = []; // Array of line items
    this.discount = 0.00; // Fixed amount discount
    this.listeners = [];
    this.loadFromStorage();
  }

  // Load saved in-progress cart from localStorage
  loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.items)) {
          this.items = parsed.items;
        }
        if (typeof parsed.discount === 'number') {
          this.discount = parsed.discount;
        }
      }
    } catch (e) {
      console.warn('Could not restore cart from storage:', e);
    }
  }

  // Save in-progress cart to localStorage
  saveToStorage() {
    try {
      if (this.items.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          items: this.items,
          discount: this.discount
        }));
      }
    } catch (e) {
      console.warn('Could not save cart to storage:', e);
    }
  }

  // Subscribe to cart changes
  subscribe(callback) {
    this.listeners.push(callback);
    callback(this);
  }

  notify() {
    this.saveToStorage();
    this.listeners.forEach(cb => cb(this));
  }

  /**
   * Add drink item to cart with custom selected add-ons
   */
  addItem({ productId, name, chineseName, category, basePrice, oatMilk = false, oatMilkPrice = 2, selectedAddons = [], remark = '', quantity = 1 }) {
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const cleanRemark = (remark || '').trim();

    // Normalize selected addons
    let addons = [];
    if (Array.isArray(selectedAddons) && selectedAddons.length > 0) {
      addons = selectedAddons.map(a => ({
        name: a.name.trim(),
        price: Number((parseFloat(a.price) || 0).toFixed(2))
      }));
    } else if (oatMilk) {
      addons = [{
        name: 'Oat Milk',
        price: Number((parseFloat(oatMilkPrice || 2)).toFixed(2))
      }];
    }

    // Sort addons by name for stable comparison
    addons.sort((a, b) => a.name.localeCompare(b.name));

    const addonsTotal = addons.reduce((sum, a) => sum + a.price, 0);
    const unitPrice = Number((basePrice + addonsTotal).toFixed(2));

    const hasOatMilk = addons.some(a => a.name.toLowerCase().includes('oat')) || Boolean(oatMilk);
    const oatItem = addons.find(a => a.name.toLowerCase().includes('oat'));
    const resolvedOatMilkPrice = oatItem ? oatItem.price : (oatMilk ? Number((parseFloat(oatMilkPrice || 2)).toFixed(2)) : 0);

    const addonsKey = addons.map(a => `${a.name}:${a.price}`).join('|');

    // Check if identical item already exists (same productId, same addons, same remark)
    const existingIndex = this.items.findIndex(item => {
      if (item.productId !== productId) return false;
      if ((item.remark || '').trim() !== cleanRemark) return false;
      
      const itemAddons = Array.isArray(item.selectedAddons) 
        ? [...item.selectedAddons] 
        : (item.oatMilk ? [{ name: 'Oat Milk', price: item.oatMilkPrice || 2 }] : []);
      const itemKey = itemAddons.map(a => `${a.name}:${a.price}`).sort().join('|');
      return itemKey === addonsKey;
    });

    if (existingIndex > -1) {
      this.items[existingIndex].quantity += qty;
      this.items[existingIndex].subtotal = Number((this.items[existingIndex].quantity * unitPrice).toFixed(2));
    } else {
      this.items.push({
        cartItemId: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        productId,
        name,
        chineseName: chineseName || '',
        category: category || '',
        basePrice: Number(basePrice.toFixed(2)),
        selectedAddons: addons,
        oatMilk: hasOatMilk,
        oatMilkPrice: resolvedOatMilkPrice,
        remark: cleanRemark,
        unitPrice: unitPrice,
        quantity: qty,
        subtotal: Number((qty * unitPrice).toFixed(2))
      });
    }

    this.validateDiscount();
    this.notify();
  }

  /**
   * Update quantity of a cart item
   */
  updateQuantity(cartItemId, newQty) {
    const item = this.items.find(i => i.cartItemId === cartItemId);
    if (!item) return;

    if (newQty <= 0) {
      this.removeItem(cartItemId);
    } else {
      item.quantity = newQty;
      item.subtotal = Number((item.quantity * item.unitPrice).toFixed(2));
      this.validateDiscount();
      this.notify();
    }
  }

  /**
   * Increase quantity by 1
   */
  incrementItem(cartItemId) {
    const item = this.items.find(i => i.cartItemId === cartItemId);
    if (item) {
      this.updateQuantity(cartItemId, item.quantity + 1);
    }
  }

  /**
   * Decrease quantity by 1
   */
  decrementItem(cartItemId) {
    const item = this.items.find(i => i.cartItemId === cartItemId);
    if (item) {
      this.updateQuantity(cartItemId, item.quantity - 1);
    }
  }

  /**
   * Remove line item
   */
  removeItem(cartItemId) {
    this.items = this.items.filter(i => i.cartItemId !== cartItemId);
    this.validateDiscount();
    this.notify();
  }

  /**
   * Clear all items & reset discount
   */
  clear() {
    this.items = [];
    this.discount = 0.00;
    this.notify();
  }

  /**
   * Set fixed discount amount
   */
  setDiscount(amount) {
    const parsed = parseFloat(amount) || 0;
    const subtotal = this.getSubtotal();
    
    // Validation: cannot be negative, cannot exceed subtotal
    if (parsed < 0) {
      this.discount = 0.00;
    } else if (parsed > subtotal) {
      this.discount = subtotal;
    } else {
      this.discount = Number(parsed.toFixed(2));
    }
    this.notify();
  }

  /**
   * Ensure discount is never greater than subtotal after item removal
   */
  validateDiscount() {
    const subtotal = this.getSubtotal();
    if (this.discount > subtotal) {
      this.discount = subtotal;
    }
  }

  // Calculations
  getSubtotal() {
    const sum = this.items.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
    return Number(sum.toFixed(2));
  }

  getDiscount() {
    return Number(this.discount.toFixed(2));
  }

  getTotal() {
    const subtotal = this.getSubtotal();
    const discount = this.getDiscount();
    return Math.max(0, Number((subtotal - discount).toFixed(2)));
  }

  getItemCount() {
    return this.items.reduce((acc, item) => acc + item.quantity, 0);
  }

  getItems() {
    return [...this.items];
  }

  isEmpty() {
    return this.items.length === 0;
  }
}

export const cart = new CartState();
