/**
 * ==========================================================================
 * JV SIPS - INITIAL MENU SEED DATA
 * ==========================================================================
 */

import { addProduct, getProducts, deleteProduct } from './db.js';

export const INITIAL_MENU = [
  // MANGO SERIES
  {
    name: "Mango Lime Soda",
    chineseName: "芒果青柠气泡水",
    category: "Mango Series",
    price: 10.00,
    allowOatMilk: false,
    oatMilkPrice: 0,
    active: true
  },
  {
    name: "Mango Milk",
    chineseName: "芒果牛奶",
    category: "Mango Series",
    price: 12.00,
    allowOatMilk: true,
    oatMilkPrice: 2.00,
    active: true
  },

  // BLUEBERRY SERIES
  {
    name: "Blueberry Lemon Soda",
    chineseName: "蓝莓柠檬气泡水",
    category: "Blueberry Series",
    price: 10.00,
    allowOatMilk: false,
    oatMilkPrice: 0,
    active: true
  },
  {
    name: "Blueberry Milk",
    chineseName: "蓝莓牛奶",
    category: "Blueberry Series",
    price: 12.00,
    allowOatMilk: true,
    oatMilkPrice: 2.00,
    active: true
  },

  // GREEN GRAPE SERIES
  {
    name: "Green Grape Lemon Soda",
    chineseName: "青提柠檬气泡水",
    category: "Green Grape Series",
    price: 10.00,
    allowOatMilk: false,
    oatMilkPrice: 0,
    active: true
  },
  {
    name: "Green Grape Milk",
    chineseName: "青提牛奶",
    category: "Green Grape Series",
    price: 12.00,
    allowOatMilk: true,
    oatMilkPrice: 2.00,
    active: true
  }
];

/**
 * Seed initial menu products into Firestore or Local database
 * @param {boolean} clearExisting If true, deletes existing products before seeding
 */
export async function seedInitialMenu(clearExisting = false) {
  const existing = await getProducts();
  
  if (clearExisting && existing.length > 0) {
    for (const p of existing) {
      await deleteProduct(p.id);
    }
  } else if (!clearExisting && existing.length > 0) {
    return { success: false, count: 0, message: 'Products already exist. Pass clearExisting=true to reset.' };
  }

  let count = 0;
  for (const item of INITIAL_MENU) {
    await addProduct(item);
    count++;
  }

  return { success: true, count, message: `Successfully seeded ${count} menu drinks!` };
}
