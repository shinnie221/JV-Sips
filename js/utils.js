/**
 * JV SIPS - UTILITY FUNCTIONS & HELPERS
 */

// Format numbers as Malaysian Ringgit (RM 12.00)
export function formatRM(amount) {
  const num = parseFloat(amount) || 0;
  return `RM ${num.toFixed(2)}`;
}

// Format Date for display (e.g. "2 Sep 2026")
export function formatDateDisplay(dateObj) {
  if (!dateObj) return '';
  const d = (dateObj instanceof Date) ? dateObj : new Date(dateObj);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

// Format Date for display with full month (e.g. "2 September 2026")
export function formatDateLong(dateObj) {
  if (!dateObj) return '';
  const d = (dateObj instanceof Date) ? dateObj : new Date(dateObj);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

// Format Time (e.g. "02:45 PM")
export function formatTimeDisplay(dateObj) {
  if (!dateObj) return '';
  const d = (dateObj instanceof Date) ? dateObj : new Date(dateObj);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

// Convert Date to YYYY-MM-DD string
export function toDateInputValue(dateObj) {
  const d = (dateObj instanceof Date) ? dateObj : new Date(dateObj);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Convert Date to YYYY-MM string
export function toMonthInputValue(dateObj) {
  const d = (dateObj instanceof Date) ? dateObj : new Date(dateObj);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// Generate unique readable sale ID, e.g. "JV-20260907-A4B1"
export function generateSaleId() {
  const now = new Date();
  const dateStr = toDateInputValue(now).replace(/-/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `JV-${dateStr}-${randomSuffix}`;
}

// Category Badge Color Helper
export function getCategoryBadgeClass(category) {
  if (!category) return 'badge-default';
  const catLower = category.toLowerCase();
  if (catLower.includes('mango')) return 'badge-mango';
  if (catLower.includes('blueberry')) return 'badge-blueberry';
  if (catLower.includes('grape')) return 'badge-grape';
  return 'badge-default';
}

// Toast notification helper
export function showToast(message, type = 'info', duration = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconSvg = '';
  if (type === 'success') {
    iconSvg = '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>';
  } else if (type === 'error') {
    iconSvg = '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>';
  } else if (type === 'warning') {
    iconSvg = '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
  } else {
    iconSvg = '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
  }

  toast.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;color:inherit">${iconSvg}</div>
    <div class="toast-message">${escapeHtml(message)}</div>
  `;

  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, duration);
}

// Basic HTML escaping for safety
export function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>"']/g, function (m) {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#039;';
      default: return m;
    }
  });
}

// Standard category ordering
export const CATEGORY_ORDER = [
  'mango series',
  'blueberry series',
  'green grape series'
];

export function getCategoryEmoji(category) {
  if (!category) return '🍵';
  const cat = category.toLowerCase();
  if (cat.includes('mango')) return '🥭';
  if (cat.includes('blueberry')) return '🫐';
  if (cat.includes('grape')) return '🍇';
  if (cat.includes('tea')) return '🧋';
  if (cat.includes('coffee')) return '☕';
  return '🍵';
}

export function getCategoryChineseTitle(category) {
  if (!category) return '';
  const cat = category.toLowerCase();
  if (cat.includes('mango')) return '芒果系列';
  if (cat.includes('blueberry')) return '蓝莓系列';
  if (cat.includes('grape')) return '青提系列';
  return '';
}

/**
 * Sort products array according to category order, then item name/type
 * @param {Array} products 
 * @returns {Array} sorted products array
 */
export function sortProductsByCategory(products) {
  if (!Array.isArray(products)) return [];
  return [...products].sort((a, b) => {
    const catA = (a.category || '').trim().toLowerCase();
    const catB = (b.category || '').trim().toLowerCase();

    let indexA = CATEGORY_ORDER.indexOf(catA);
    let indexB = CATEGORY_ORDER.indexOf(catB);

    if (indexA === -1) indexA = 999;
    if (indexB === -1) indexB = 999;

    if (indexA !== indexB) {
      if (indexA === 999 && indexB === 999) {
        return catA.localeCompare(catB);
      }
      return indexA - indexB;
    }

    // Secondary sort within the same category:
    // Soda drinks before Milk drinks
    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
    const isSodaA = nameA.includes('soda');
    const isSodaB = nameB.includes('soda');
    if (isSodaA && !isSodaB) return -1;
    if (!isSodaA && isSodaB) return 1;

    // Price ascending
    const priceA = parseFloat(a.price) || 0;
    const priceB = parseFloat(b.price) || 0;
    if (priceA !== priceB) {
      return priceA - priceB;
    }

    // Alphabetical by name
    return nameA.localeCompare(nameB);
  });
}

/**
 * Group an array of products into ordered categories with metadata
 * @param {Array} products 
 * @returns {Array<{category: string, chineseTitle: string, emoji: string, badgeClass: string, items: Array}>}
 */
export function groupProductsByCategory(products) {
  const sorted = sortProductsByCategory(products);
  const groupsMap = new Map();

  for (const item of sorted) {
    const cat = item.category || 'Other';
    if (!groupsMap.has(cat)) {
      groupsMap.set(cat, {
        category: cat,
        chineseTitle: getCategoryChineseTitle(cat),
        emoji: getCategoryEmoji(cat),
        badgeClass: getCategoryBadgeClass(cat),
        items: []
      });
    }
    groupsMap.get(cat).items.push(item);
  }

  return Array.from(groupsMap.values());
}


