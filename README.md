# JV Sips - POS & Sales Management System

A web-based Point of Sale (POS) and sales management system built for **JV Sips** drink stall operations on laptops, desktops, and tablets.

---

## 🍵 Features Overview

1. **POS Ordering Screen (`/pages/pos.html`)**:
   - Fast category navigation (Mango Series, Blueberry Series, Green Grape Series).
   - Dynamic product customizer modal for quantity and **Oat Milk add-on** (applicable to milk drinks with a tick button/card `[✓] Add Oat Milk (+RM 2.00)`).
   - Real-time shopping cart with line items, oat milk tags, steppers `[-] 1 [+]`, item removal, and full cart clear.
   - **Fixed-Amount Discount** with boundary validation (no negative discounts, cannot exceed subtotal).
   - Instant Cash checkout (with cash received preset buttons & live change calculation) and QR checkout.
   - Double-checkout protection & snapshot history preservation.

2. **Product Catalog Management (`/pages/products.html`)**:
   - Add new drinks with English name, Chinese name (中文名), Category, Base Price (RM), and Oat Milk toggle option with customizable surcharge price.
   - Edit, delete (with confirmation modal), and toggle active/disabled status.
   - **1-Click Seed Menu Button** to load the 6 default drinks.

3. **Sales Analytics & Reports (`/pages/reports.html`)**:
   - **Daily Sales Report**: Total sales, order count, drinks sold count, discounts given, cash vs QR split, transaction history table with time and item details, and `< Previous Day`, `Next Day >`, `Today`, and Date Picker navigators.
   - **Monthly Sales Report**: Month picker, revenue cards, daily sales trend bar chart (Chart.js), and best-selling drinks ranking.
   - **Yearly Sales Report**: Year picker, annual metrics, 12-month revenue chart, and annual best-sellers.

---

## 📂 Project Structure

```text
JV Sips/
├── index.html                  # Main redirect to POS
├── pages/
│   ├── pos.html                # Point of Sale & Shopping Cart
│   ├── products.html           # Product Catalog & Oat Milk Management
│   └── reports.html            # Daily, Monthly, and Yearly Sales Reports
├── css/
│   ├── main.css                # Global design system, typography & variables
│   ├── pos.css                 # POS layout, drink cards, and cart styling
│   ├── products.css            # Product table/card and modal styles
│   └── reports.css             # Metric cards, charts, and table styles
├── js/
│   ├── firebase-config.js      # Firebase configuration keys & instructions
│   ├── db.js                   # Firestore & LocalStorage dual-engine data layer
│   ├── pos.js                  # POS order flow & customizer controller
│   ├── cart.js                 # Cart state management & calculations
│   ├── payment.js              # Cash / QR checkout & anti-duplicate handling
│   ├── products.js             # Product CRUD & toggle controller
│   ├── reports.js              # Sales reporting & Chart.js graph controller
│   ├── seed.js                 # 6-drink initial menu seed definitions
│   └── utils.js                # Currency formatter (RM 0.00), date helpers & toast
├── firestore.rules             # Firestore security rules
└── README.md
```

---

## 🚀 How to Run Locally

You can run this project with any local web server. For example:

### Using Python:
```bash
python -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

### Using Node.js (npx serve / live-server):
```bash
npx serve .
```

---

## ⚙️ Connecting to Firebase Firestore

1. Open `js/firebase-config.js`.
2. Replace the placeholder values with your Firebase Web App credentials:
   ```javascript
   export const firebaseConfig = {
     apiKey: "YOUR_API_KEY_HERE",
     authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_PROJECT_ID.appspot.com",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```
3. In your Firebase Console, open **Firestore Database** and publish the rules from `firestore.rules`.
4. If credentials are left as placeholders, JV Sips automatically runs in **Local Demo Mode** using browser storage.
