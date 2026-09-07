/**
 * ==========================================================================
 * JV SIPS - DATABASE & DATA ACCESS LAYER (Firestore & Guest Sandbox)
 * ==========================================================================
 */

import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';
import { sortProductsByCategory } from './utils.js';
import { isStaffLoggedIn } from './auth.js';
import { INITIAL_MENU } from './seed.js';

// Firebase imports
let db = null;
let isFirestoreReady = false;
let firestoreModules = null;

// Guest Sandbox LocalStorage keys (100% isolated from real cloud data)
const LS_GUEST_PRODUCTS_KEY = 'jv_sips_guest_products';
const LS_GUEST_SALES_KEY = 'jv_sips_guest_sales';

/**
 * Initialize Firestore
 */
export async function initDatabase() {
  if (isFirestoreReady) return { isFirestore: true, db };

  if (isFirebaseConfigured()) {
    try {
      const { initializeApp, getApps, getApp } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
      const { 
        getFirestore, 
        collection, 
        doc, 
        getDocs, 
        getDoc, 
        addDoc, 
        setDoc, 
        updateDoc, 
        deleteDoc, 
        query, 
        where, 
        orderBy, 
        serverTimestamp 
      } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');

      const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
      db = getFirestore(app);
      firestoreModules = { collection, doc, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp };
      isFirestoreReady = true;
      updateHeaderStatus(true);
      return { isFirestore: true, db };
    } catch (err) {
      console.warn('⚠️ Firestore init fallback to sandbox mode:', err);
      isFirestoreReady = false;
      updateHeaderStatus(false);
      return { isFirestore: false };
    }
  } else {
    isFirestoreReady = false;
    updateHeaderStatus(false);
    return { isFirestore: false };
  }
}

/**
 * Update the UI Header status indicator
 */
export function updateHeaderStatus(isOnline) {
  const statusEl = document.getElementById('db-status');
  if (!statusEl) return;
  if (isOnline) {
    statusEl.innerHTML = '<span class="db-status-dot"></span> Firebase Live';
    statusEl.className = 'db-status-badge';
    statusEl.style.background = 'var(--primary-light)';
    statusEl.style.color = 'var(--primary-dark)';
    statusEl.title = 'Connected to Firebase Firestore';
  } else {
    statusEl.innerHTML = '<span class="db-status-dot" style="background:var(--accent-mango)"></span> Local Sandbox';
    statusEl.className = 'db-status-badge';
    statusEl.style.background = 'var(--accent-mango-light)';
    statusEl.style.color = '#b45309';
    statusEl.title = 'Running in Demo Sandbox Mode';
  }
}

// --------------------------------------------------------------------------
// PRODUCTS API
// --------------------------------------------------------------------------

export async function getProducts(activeOnly = false) {
  // If staff is logged in, fetch from Live Cloud Firestore
  if (isStaffLoggedIn()) {
    await initDatabase();
    if (isFirestoreReady) {
      try {
        const { collection, getDocs, query, where } = firestoreModules;
        const colRef = collection(db, 'products');
        let q = colRef;
        if (activeOnly) {
          q = query(colRef, where('active', '==', true));
        }
        const snapshot = await getDocs(q);
        const list = [];
        snapshot.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        if (list.length > 0) {
          return sortProductsByCategory(list);
        }
        // If Firestore is empty on first staff run, seed and return
        await seedInitialMenu(false);
        const newSnap = await getDocs(q);
        const seededList = [];
        newSnap.forEach(docSnap => {
          seededList.push({ id: docSnap.id, ...docSnap.data() });
        });
        return sortProductsByCategory(seededList);
      } catch (err) {
        console.error('Firestore getProducts error (falling back to guest sandbox):', err);
        return getGuestSandboxProducts(activeOnly);
      }
    }
  }

  // Default for all guests & visitors: Instant Local Sandbox (0 delay, 100% reliable)
  return getGuestSandboxProducts(activeOnly);
}

export async function addProduct(productData) {
  await initDatabase();
  const productPayload = {
    name: productData.name.trim(),
    chineseName: productData.chineseName ? productData.chineseName.trim() : '',
    category: productData.category.trim(),
    price: Number(parseFloat(productData.price).toFixed(2)),
    allowOatMilk: Boolean(productData.allowOatMilk),
    oatMilkPrice: productData.allowOatMilk ? Number(parseFloat(productData.oatMilkPrice || 2).toFixed(2)) : 0,
    active: productData.active !== undefined ? Boolean(productData.active) : true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (isStaffLoggedIn() && isFirestoreReady) {
    const { collection, addDoc, serverTimestamp } = firestoreModules;
    const docRef = await addDoc(collection(db, 'products'), {
      ...productPayload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { id: docRef.id, ...productPayload };
  } else {
    // Guest Sandbox Mode: Save locally only
    const products = getGuestSandboxProducts();
    const newProduct = {
      id: 'sandbox_prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ...productPayload
    };
    products.push(newProduct);
    saveGuestSandboxProducts(products);
    return newProduct;
  }
}

export async function updateProduct(id, productData) {
  await initDatabase();
  const updatePayload = {
    name: productData.name.trim(),
    chineseName: productData.chineseName ? productData.chineseName.trim() : '',
    category: productData.category.trim(),
    price: Number(parseFloat(productData.price).toFixed(2)),
    allowOatMilk: Boolean(productData.allowOatMilk),
    oatMilkPrice: productData.allowOatMilk ? Number(parseFloat(productData.oatMilkPrice || 2).toFixed(2)) : 0,
    active: Boolean(productData.active),
    updatedAt: new Date().toISOString()
  };

  if (isStaffLoggedIn() && isFirestoreReady) {
    const { doc, updateDoc, serverTimestamp } = firestoreModules;
    const docRef = doc(db, 'products', id);
    await updateDoc(docRef, {
      ...updatePayload,
      updatedAt: serverTimestamp()
    });
    return { id, ...updatePayload };
  } else {
    // Guest Sandbox Mode: Update locally only
    const products = getGuestSandboxProducts();
    const index = products.findIndex(p => p.id === id);
    if (index !== -1) {
      products[index] = { ...products[index], ...updatePayload };
      saveGuestSandboxProducts(products);
      return products[index];
    }
    throw new Error('Product not found in demo sandbox');
  }
}

export async function deleteProduct(id) {
  await initDatabase();
  if (isStaffLoggedIn() && isFirestoreReady) {
    const { doc, deleteDoc } = firestoreModules;
    await deleteDoc(doc(db, 'products', id));
    return true;
  } else {
    // Guest Sandbox Mode: Delete locally only
    let products = getGuestSandboxProducts();
    products = products.filter(p => p.id !== id);
    saveGuestSandboxProducts(products);
    return true;
  }
}

export async function toggleProductActive(id, active) {
  await initDatabase();
  if (isStaffLoggedIn() && isFirestoreReady) {
    const { doc, updateDoc, serverTimestamp } = firestoreModules;
    const docRef = doc(db, 'products', id);
    await updateDoc(docRef, {
      active: Boolean(active),
      updatedAt: serverTimestamp()
    });
    return true;
  } else {
    // Guest Sandbox Mode: Toggle locally only
    const products = getGuestSandboxProducts();
    const prod = products.find(p => p.id === id);
    if (prod) {
      prod.active = Boolean(active);
      saveGuestSandboxProducts(products);
      return true;
    }
    throw new Error('Product not found in demo sandbox');
  }
}

// --------------------------------------------------------------------------
// SALES API
// --------------------------------------------------------------------------

export async function addSale(saleData) {
  await initDatabase();
  const salePayload = {
    saleId: saleData.saleId,
    items: saleData.items,
    totalItems: saleData.totalItems,
    subtotal: Number(parseFloat(saleData.subtotal).toFixed(2)),
    discount: Number(parseFloat(saleData.discount || 0).toFixed(2)),
    total: Number(parseFloat(saleData.total).toFixed(2)),
    paymentMethod: saleData.paymentMethod,
    cashReceived: saleData.cashReceived !== null ? Number(parseFloat(saleData.cashReceived).toFixed(2)) : null,
    change: saleData.change !== null ? Number(parseFloat(saleData.change).toFixed(2)) : null,
    saleDate: saleData.saleDate,
    saleMonth: saleData.saleMonth,
    saleYear: Number(saleData.saleYear),
    createdAt: saleData.createdAt || new Date().toISOString()
  };

  if (isStaffLoggedIn() && isFirestoreReady) {
    // Live Cloud Store: Record official sale in Firestore
    const { collection, addDoc, serverTimestamp } = firestoreModules;
    const docRef = await addDoc(collection(db, 'sales'), {
      ...salePayload,
      timestamp: serverTimestamp()
    });
    return { id: docRef.id, ...salePayload };
  } else {
    // Guest Sandbox Mode: Record simulated sale in local sandbox
    const sales = getGuestSandboxSales();
    const newSale = {
      id: 'sandbox_sale_' + Date.now(),
      ...salePayload
    };
    sales.unshift(newSale);
    saveGuestSandboxSales(sales);
    return newSale;
  }
}

export async function getSalesByDate(dateStr) {
  await initDatabase();
  if (isStaffLoggedIn() && isFirestoreReady) {
    try {
      const { collection, getDocs, query, where } = firestoreModules;
      const colRef = collection(db, 'sales');
      const q = query(colRef, where('saleDate', '==', dateStr));
      const snapshot = await getDocs(q);
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (err) {
      console.error('Firestore getSalesByDate error:', err);
      return getGuestSandboxSales().filter(s => s.saleDate === dateStr);
    }
  } else {
    return getGuestSandboxSales().filter(s => s.saleDate === dateStr);
  }
}

export async function getSalesByMonth(yearMonthStr) {
  await initDatabase();
  if (isStaffLoggedIn() && isFirestoreReady) {
    try {
      const { collection, getDocs, query, where } = firestoreModules;
      const colRef = collection(db, 'sales');
      const q = query(colRef, where('saleMonth', '==', yearMonthStr));
      const snapshot = await getDocs(q);
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (err) {
      console.error('Firestore getSalesByMonth error:', err);
      return getGuestSandboxSales().filter(s => s.saleMonth === yearMonthStr);
    }
  } else {
    return getGuestSandboxSales().filter(s => s.saleMonth === yearMonthStr);
  }
}

export async function getSalesByYear(yearNum) {
  await initDatabase();
  const year = Number(yearNum);
  if (isStaffLoggedIn() && isFirestoreReady) {
    try {
      const { collection, getDocs, query, where } = firestoreModules;
      const colRef = collection(db, 'sales');
      const q = query(colRef, where('saleYear', '==', year));
      const snapshot = await getDocs(q);
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (err) {
      console.error('Firestore getSalesByYear error:', err);
      return getGuestSandboxSales().filter(s => Number(s.saleYear) === year);
    }
  } else {
    return getGuestSandboxSales().filter(s => Number(s.saleYear) === year);
  }
}

export async function getAllSales() {
  await initDatabase();
  if (isStaffLoggedIn() && isFirestoreReady) {
    try {
      const { collection, getDocs } = firestoreModules;
      const snapshot = await getDocs(collection(db, 'sales'));
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (err) {
      console.error('Firestore getAllSales error:', err);
      return getGuestSandboxSales();
    }
  } else {
    return getGuestSandboxSales();
  }
}

// --------------------------------------------------------------------------
// GUEST SANDBOX HELPERS (LOCAL STORAGE)
// --------------------------------------------------------------------------

function getGuestSandboxProducts(activeOnly = false) {
  try {
    const raw = localStorage.getItem(LS_GUEST_PRODUCTS_KEY);
    let list = raw ? JSON.parse(raw) : null;
    
    // Auto-seed sandbox if empty
    if (!list || list.length === 0) {
      list = INITIAL_MENU.map((item, i) => ({
        id: 'sandbox_seed_' + (i + 1),
        ...item
      }));
      saveGuestSandboxProducts(list);
    }

    const filtered = activeOnly ? list.filter(p => p.active !== false) : list;
    return sortProductsByCategory(filtered);
  } catch (e) {
    return [];
  }
}

function saveGuestSandboxProducts(products) {
  localStorage.setItem(LS_GUEST_PRODUCTS_KEY, JSON.stringify(products));
}

function getGuestSandboxSales() {
  try {
    const raw = localStorage.getItem(LS_GUEST_SALES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveGuestSandboxSales(sales) {
  localStorage.setItem(LS_GUEST_SALES_KEY, JSON.stringify(sales));
}

export function resetGuestSandbox() {
  localStorage.removeItem(LS_GUEST_PRODUCTS_KEY);
  localStorage.removeItem(LS_GUEST_SALES_KEY);
}
