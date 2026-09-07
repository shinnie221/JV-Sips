/**
 * ==========================================================================
 * JV SIPS - SHOPPING CART STATE & CALCULATION ENGINE
 * ==========================================================================
 */

class CartState {
  constructor() {
    this.items = []; // Array of line items
    this.discount = 0.00; // Fixed amount discount
    this.listeners = [];
  }

  // Subscribe to cart changes
  subscribe(callback) {
    this.listeners.push(callback);
    callback(this);
  }

  notify() {
    this.listeners.forEach(cb => cb(this));
  }

  /**
   * Add drink item to cart
   */
  addItem({ productId, name, chineseName, category, basePrice, oatMilk = false, oatMilkPrice = 2, quantity = 1 }) {
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const unitPrice = oatMilk ? (basePrice + oatMilkPrice) : basePrice;

    // Check if identical item already exists (same productId and same oatMilk option)
    const existingIndex = this.items.findIndex(
      item => item.productId === productId && item.oatMilk === Boolean(oatMilk)
    );

    if (existingIndex > -1) {
      this.items[existingIndex].quantity += qty;
      this.items[existingIndex].subtotal = this.items[existingIndex].quantity * unitPrice;
    } else {
      this.items.push({
        cartItemId: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        productId,
        name,
        chineseName: chineseName || '',
        category: category || '',
        basePrice: Number(basePrice.toFixed(2)),
        oatMilk: Boolean(oatMilk),
        oatMilkPrice: oatMilk ? Number(oatMilkPrice.toFixed(2)) : 0,
        unitPrice: Number(unitPrice.toFixed(2)),
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
