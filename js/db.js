/**
 * ==========================================================================
 * JV SIPS - DATABASE & DATA ACCESS LAYER (Firestore & Local Fallback)
 * ==========================================================================
 */

import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';

// Firebase imports (loaded dynamically from official CDN)
let db = null;
let isFirestoreReady = false;
let firestoreModules = null;

// LocalStorage fallback keys
const LS_PRODUCTS_KEY = 'jv_sips_products';
const LS_SALES_KEY = 'jv_sips_sales';

/**
 * Initialize Firestore or Local Storage
 */
export async function initDatabase() {
  if (isFirestoreReady) return { isFirestore: true, db };

  if (isFirebaseConfigured()) {
    try {
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
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

      const app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      firestoreModules = { collection, doc, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp };
      isFirestoreReady = true;
      console.log('✅ Firebase Firestore connected successfully.');
      updateHeaderStatus(true);
      return { isFirestore: true, db };
    } catch (err) {
      console.warn('⚠️ Firebase init error, falling back to Local Storage:', err);
      isFirestoreReady = false;
      updateHeaderStatus(false);
      return { isFirestore: false };
    }
  } else {
    console.log('ℹ️ Firebase config has placeholders. Running in Local Mode.');
    updateHeaderStatus(false);
    return { isFirestore: false };
  }
}

/**
 * Update the UI Header status indicator
 */
function updateHeaderStatus(isOnline) {
  const statusEl = document.getElementById('db-status');
  if (!statusEl) return;
  if (isOnline) {
    statusEl.innerHTML = '<span class="db-status-dot"></span> Firebase Live';
    statusEl.className = 'db-status-badge';
    statusEl.style.background = 'var(--primary-light)';
    statusEl.style.color = 'var(--primary-dark)';
    statusEl.title = 'Connected to Firebase Firestore';
  } else {
    statusEl.innerHTML = '<span class="db-status-dot" style="background:var(--accent-mango)"></span> Local Mode';
    statusEl.className = 'db-status-badge';
    statusEl.style.background = 'var(--accent-mango-light)';
    statusEl.style.color = '#b45309';
    statusEl.title = 'Running on browser storage. Add your Firebase keys in js/firebase-config.js to sync online.';
  }
}

// --------------------------------------------------------------------------
// PRODUCTS API
// --------------------------------------------------------------------------

export async function getProducts(activeOnly = false) {
  await initDatabase();

  if (isFirestoreReady) {
    try {
      const { collection, getDocs, query, where, orderBy } = firestoreModules;
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
      return list;
    } catch (err) {
      console.error('Firestore getProducts error:', err);
      return getLocalProducts(activeOnly);
    }
  } else {
    return getLocalProducts(activeOnly);
  }
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

  if (isFirestoreReady) {
    const { collection, addDoc, serverTimestamp } = firestoreModules;
    const docRef = await addDoc(collection(db, 'products'), {
      ...productPayload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { id: docRef.id, ...productPayload };
  } else {
    const products = getLocalProducts();
    const newProduct = {
      id: 'prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ...productPayload
    };
    products.push(newProduct);
    saveLocalProducts(products);
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

  if (isFirestoreReady) {
    const { doc, updateDoc, serverTimestamp } = firestoreModules;
    const docRef = doc(db, 'products', id);
    await updateDoc(docRef, {
      ...updatePayload,
      updatedAt: serverTimestamp()
    });
    return { id, ...updatePayload };
  } else {
    const products = getLocalProducts();
    const index = products.findIndex(p => p.id === id);
    if (index !== -1) {
      products[index] = { ...products[index], ...updatePayload };
      saveLocalProducts(products);
      return products[index];
    }
    throw new Error('Product not found in local store');
  }
}

export async function deleteProduct(id) {
  await initDatabase();
  if (isFirestoreReady) {
    const { doc, deleteDoc } = firestoreModules;
    await deleteDoc(doc(db, 'products', id));
    return true;
  } else {
    let products = getLocalProducts();
    products = products.filter(p => p.id !== id);
    saveLocalProducts(products);
    return true;
  }
}

export async function toggleProductActive(id, active) {
  await initDatabase();
  if (isFirestoreReady) {
    const { doc, updateDoc, serverTimestamp } = firestoreModules;
    const docRef = doc(db, 'products', id);
    await updateDoc(docRef, { active: Boolean(active), updatedAt: serverTimestamp() });
    return true;
  } else {
    const products = getLocalProducts();
    const product = products.find(p => p.id === id);
    if (product) {
      product.active = Boolean(active);
      product.updatedAt = new Date().toISOString();
      saveLocalProducts(products);
      return true;
    }
    return false;
  }
}

// --------------------------------------------------------------------------
// SALES API
// --------------------------------------------------------------------------

export async function addSale(saleData) {
  await initDatabase();
  const salePayload = {
    saleId: saleData.saleId,
    items: saleData.items, // Array of snapshot objects
    totalItems: Number(saleData.totalItems),
    subtotal: Number(parseFloat(saleData.subtotal).toFixed(2)),
    discount: Number(parseFloat(saleData.discount || 0).toFixed(2)),
    total: Number(parseFloat(saleData.total).toFixed(2)),
    paymentMethod: saleData.paymentMethod, // 'cash' | 'qr'
    cashReceived: saleData.cashReceived ? Number(parseFloat(saleData.cashReceived).toFixed(2)) : null,
    change: saleData.change ? Number(parseFloat(saleData.change).toFixed(2)) : null,
    saleDate: saleData.saleDate,   // YYYY-MM-DD
    saleMonth: saleData.saleMonth, // YYYY-MM
    saleYear: Number(saleData.saleYear),
    createdAt: new Date().toISOString()
  };

  if (isFirestoreReady) {
    const { collection, addDoc, serverTimestamp } = firestoreModules;
    const docRef = await addDoc(collection(db, 'sales'), {
      ...salePayload,
      createdAt: serverTimestamp()
    });
    return { id: docRef.id, ...salePayload };
  } else {
    const sales = getLocalSales();
    const newSale = {
      id: 'sale_' + Date.now(),
      ...salePayload
    };
    sales.unshift(newSale);
    saveLocalSales(sales);
    return newSale;
  }
}

export async function getSalesByDate(dateStr) {
  await initDatabase();
  if (isFirestoreReady) {
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
      return getLocalSales().filter(s => s.saleDate === dateStr);
    }
  } else {
    return getLocalSales().filter(s => s.saleDate === dateStr);
  }
}

export async function getSalesByMonth(monthStr) {
  await initDatabase();
  if (isFirestoreReady) {
    try {
      const { collection, getDocs, query, where } = firestoreModules;
      const colRef = collection(db, 'sales');
      const q = query(colRef, where('saleMonth', '==', monthStr));
      const snapshot = await getDocs(q);
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (err) {
      console.error('Firestore getSalesByMonth error:', err);
      return getLocalSales().filter(s => s.saleMonth === monthStr);
    }
  } else {
    return getLocalSales().filter(s => s.saleMonth === monthStr);
  }
}

export async function getSalesByYear(yearNum) {
  await initDatabase();
  const year = Number(yearNum);
  if (isFirestoreReady) {
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
      return getLocalSales().filter(s => Number(s.saleYear) === year);
    }
  } else {
    return getLocalSales().filter(s => Number(s.saleYear) === year);
  }
}

export async function getAllSales() {
  await initDatabase();
  if (isFirestoreReady) {
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
      return getLocalSales();
    }
  } else {
    return getLocalSales();
  }
}

// --------------------------------------------------------------------------
// LOCAL STORAGE HELPERS
// --------------------------------------------------------------------------

function getLocalProducts(activeOnly = false) {
  try {
    const raw = localStorage.getItem(LS_PRODUCTS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (activeOnly) {
      return list.filter(p => p.active !== false);
    }
    return list;
  } catch (e) {
    return [];
  }
}

function saveLocalProducts(products) {
  localStorage.setItem(LS_PRODUCTS_KEY, JSON.stringify(products));
}

function getLocalSales() {
  try {
    const raw = localStorage.getItem(LS_SALES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalSales(sales) {
  localStorage.setItem(LS_SALES_KEY, JSON.stringify(sales));
}
