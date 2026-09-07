/**
 * ==========================================================================
 * JV SIPS - SALES REPORTS & ANALYTICS CONTROLLER
 * ==========================================================================
 */

import { getSalesByDate, getSalesByMonth, getSalesByYear } from './db.js';
import { 
  formatRM, 
  formatDateLong, 
  formatDateDisplay, 
  formatTimeDisplay, 
  toDateInputValue, 
  toMonthInputValue, 
  escapeHtml, 
  getCategoryBadgeClass 
} from './utils.js';

// State
let currentTab = 'daily';
let selectedDate = new Date(); // Daily report target date
let selectedMonth = toMonthInputValue(new Date()); // YYYY-MM
let selectedYear = new Date().getFullYear(); // YYYY

// Chart Instances
let monthlyChartInstance = null;
let yearlyChartInstance = null;

// Tab Elements
const tabButtons = document.querySelectorAll('.tab-btn');
const sectionDaily = document.getElementById('section-daily');
const sectionMonthly = document.getElementById('section-monthly');
const sectionYearly = document.getElementById('section-yearly');

// Daily DOM Elements
const dailyDateDisplay = document.getElementById('daily-date-display');
const dailyDatePicker = document.getElementById('daily-date-picker');
const btnPrevDay = document.getElementById('btn-prev-day');
const btnNextDay = document.getElementById('btn-next-day');
const btnToday = document.getElementById('btn-today');
const dailyMetricSales = document.getElementById('daily-metric-sales');
const dailyMetricOrders = document.getElementById('daily-metric-orders');
const dailyMetricItems = document.getElementById('daily-metric-items');
const dailyMetricDiscount = document.getElementById('daily-metric-discount');
const dailyMetricCash = document.getElementById('daily-metric-cash');
const dailyMetricQr = document.getElementById('daily-metric-qr');
const dailyTransactionsTbody = document.getElementById('daily-transactions-tbody');

// Monthly DOM Elements
const monthlyMonthPicker = document.getElementById('monthly-month-picker');
const monthlyPeriodDisplay = document.getElementById('monthly-period-display');
const monthlyMetricSales = document.getElementById('monthly-metric-sales');
const monthlyMetricOrders = document.getElementById('monthly-metric-orders');
const monthlyMetricItems = document.getElementById('monthly-metric-items');
const monthlyMetricDiscount = document.getElementById('monthly-metric-discount');
const monthlyMetricCash = document.getElementById('monthly-metric-cash');
const monthlyMetricQr = document.getElementById('monthly-metric-qr');
const monthlyBestsellersTbody = document.getElementById('monthly-bestsellers-tbody');

// Yearly DOM Elements
const yearlyYearPicker = document.getElementById('yearly-year-picker');
const yearlyPeriodDisplay = document.getElementById('yearly-period-display');
const yearlyMetricSales = document.getElementById('yearly-metric-sales');
const yearlyMetricOrders = document.getElementById('yearly-metric-orders');
const yearlyMetricItems = document.getElementById('yearly-metric-items');
const yearlyMetricDiscount = document.getElementById('yearly-metric-discount');
const yearlyMetricCash = document.getElementById('yearly-metric-cash');
const yearlyMetricQr = document.getElementById('yearly-metric-qr');
const yearlyBestsellersTbody = document.getElementById('yearly-bestsellers-tbody');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  initDatePickers();
  loadDailyReport();
});

function setupEventListeners() {
  // Tab switching
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;

      sectionDaily.style.display = currentTab === 'daily' ? 'block' : 'none';
      sectionMonthly.style.display = currentTab === 'monthly' ? 'block' : 'none';
      sectionYearly.style.display = currentTab === 'yearly' ? 'block' : 'none';

      if (currentTab === 'daily') loadDailyReport();
      if (currentTab === 'monthly') loadMonthlyReport();
      if (currentTab === 'yearly') loadYearlyReport();
    });
  });

  // Daily Date Navigation
  btnPrevDay.addEventListener('click', () => {
    selectedDate.setDate(selectedDate.getDate() - 1);
    dailyDatePicker.value = toDateInputValue(selectedDate);
    loadDailyReport();
  });

  btnNextDay.addEventListener('click', () => {
    selectedDate.setDate(selectedDate.getDate() + 1);
    dailyDatePicker.value = toDateInputValue(selectedDate);
    loadDailyReport();
  });

  btnToday.addEventListener('click', () => {
    selectedDate = new Date();
    dailyDatePicker.value = toDateInputValue(selectedDate);
    loadDailyReport();
  });

  dailyDatePicker.addEventListener('change', (e) => {
    if (e.target.value) {
      const parts = e.target.value.split('-');
      selectedDate = new Date(parts[0], parts[1] - 1, parts[2]);
      loadDailyReport();
    }
  });

  // Monthly Date Navigation
  monthlyMonthPicker.addEventListener('change', (e) => {
    if (e.target.value) {
      selectedMonth = e.target.value;
      loadMonthlyReport();
    }
  });

  // Yearly Date Navigation
  yearlyYearPicker.addEventListener('change', (e) => {
    selectedYear = parseInt(e.target.value, 10);
    loadYearlyReport();
  });
}

function initDatePickers() {
  dailyDatePicker.value = toDateInputValue(selectedDate);
  monthlyMonthPicker.value = selectedMonth;

  // Populate dynamic years in select
  const thisYear = new Date().getFullYear();
  yearlyYearPicker.innerHTML = `
    <option value="${thisYear - 1}">${thisYear - 1}</option>
    <option value="${thisYear}" selected>${thisYear}</option>
    <option value="${thisYear + 1}">${thisYear + 1}</option>
  `;
}

// --------------------------------------------------------------------------
// 1. DAILY REPORT LOGIC
// --------------------------------------------------------------------------

async function loadDailyReport() {
  const dateStr = toDateInputValue(selectedDate);
  dailyDateDisplay.textContent = formatDateLong(selectedDate);

  try {
    const sales = await getSalesByDate(dateStr);
    renderDailyData(sales);
  } catch (err) {
    console.error('Error fetching daily sales:', err);
  }
}

function renderDailyData(sales) {
  let totalSales = 0;
  let totalOrders = sales.length;
  let totalItems = 0;
  let totalDiscount = 0;
  let totalCash = 0;
  let totalQr = 0;

  sales.forEach(s => {
    totalSales += s.total || 0;
    totalDiscount += s.discount || 0;
    totalItems += s.totalItems || 0;
    if (s.paymentMethod === 'cash') totalCash += s.total || 0;
    if (s.paymentMethod === 'qr') totalQr += s.total || 0;
  });

  dailyMetricSales.textContent = formatRM(totalSales);
  dailyMetricOrders.textContent = totalOrders;
  dailyMetricItems.textContent = totalItems;
  dailyMetricDiscount.textContent = formatRM(totalDiscount);
  dailyMetricCash.textContent = formatRM(totalCash);
  dailyMetricQr.textContent = formatRM(totalQr);

  if (sales.length === 0) {
    dailyTransactionsTbody.innerHTML = `
      <tr>
        <td colspan="7" class="table-empty">
          <p style="font-weight: 600;">No transactions found for this date.</p>
        </td>
      </tr>
    `;
    return;
  }

  // Sort latest first
  sales.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  dailyTransactionsTbody.innerHTML = sales.map(s => {
    const timeFormatted = formatTimeDisplay(s.createdAt);
    const itemsSummary = (s.items || []).map(i => 
      `${i.quantity}× ${escapeHtml(i.name)}${i.oatMilk ? ' (Oat Milk)' : ''}${i.remark ? ` [${escapeHtml(i.remark)}]` : ''}`
    ).join(', ');

    const methodClass = s.paymentMethod === 'cash' ? 'method-cash' : 'method-qr';
    const methodLabel = s.paymentMethod === 'cash' ? 'Cash' : 'QR';

    return `
      <tr>
        <td class="td-order-id">${escapeHtml(s.saleId)}</td>
        <td style="color: var(--text-muted); font-size: 0.85rem;">${timeFormatted}</td>
        <td class="td-items-list" title="${itemsSummary}">${itemsSummary}</td>
        <td>${formatRM(s.subtotal)}</td>
        <td style="color: ${s.discount > 0 ? 'var(--danger)' : 'var(--text-light)'};">
          ${s.discount > 0 ? `-${formatRM(s.discount)}` : 'RM 0.00'}
        </td>
        <td style="font-weight: 800; color: var(--primary-dark);">${formatRM(s.total)}</td>
        <td><span class="method-tag ${methodClass}">${methodLabel}</span></td>
      </tr>
    `;
  }).join('');
}

// --------------------------------------------------------------------------
// 2. MONTHLY REPORT LOGIC
// --------------------------------------------------------------------------

async function loadMonthlyReport() {
  const [yearStr, monthStr] = selectedMonth.split('-');
  const monthDate = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
  monthlyPeriodDisplay.textContent = monthDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  try {
    const sales = await getSalesByMonth(selectedMonth);
    renderMonthlyData(sales, parseInt(yearStr, 10), parseInt(monthStr, 10));
  } catch (err) {
    console.error('Error fetching monthly sales:', err);
  }
}

function renderMonthlyData(sales, year, month) {
  let totalSales = 0;
  let totalOrders = sales.length;
  let totalItems = 0;
  let totalDiscount = 0;
  let totalCash = 0;
  let totalQr = 0;

  // Best seller map: key = name
  const productStats = {};

  // Daily breakdown map for chart: day 1..daysInMonth
  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyTotals = new Array(daysInMonth).fill(0);

  sales.forEach(s => {
    totalSales += s.total || 0;
    totalDiscount += s.discount || 0;
    totalItems += s.totalItems || 0;
    if (s.paymentMethod === 'cash') totalCash += s.total || 0;
    if (s.paymentMethod === 'qr') totalQr += s.total || 0;

    // Daily breakdown for chart
    if (s.saleDate) {
      const dayNum = parseInt(s.saleDate.split('-')[2], 10);
      if (dayNum >= 1 && dayNum <= daysInMonth) {
        dailyTotals[dayNum - 1] += s.total || 0;
      }
    }

    // Product stats
    if (Array.isArray(s.items)) {
      s.items.forEach(item => {
        if (!productStats[item.name]) {
          productStats[item.name] = {
            name: item.name,
            chineseName: item.chineseName,
            category: item.category,
            quantity: 0,
            revenue: 0
          };
        }
        productStats[item.name].quantity += item.quantity || 1;
        productStats[item.name].revenue += item.subtotal || (item.unitPrice * item.quantity);
      });
    }
  });

  monthlyMetricSales.textContent = formatRM(totalSales);
  monthlyMetricOrders.textContent = totalOrders;
  monthlyMetricItems.textContent = totalItems;
  monthlyMetricDiscount.textContent = formatRM(totalDiscount);
  monthlyMetricCash.textContent = formatRM(totalCash);
  monthlyMetricQr.textContent = formatRM(totalQr);

  // Render Daily Sales Trend Chart
  renderMonthlyTrendChart(dailyTotals, daysInMonth);

  // Render Best-selling table
  renderBestSellersTable(monthlyBestsellersTbody, productStats);
}

function renderMonthlyTrendChart(dailyTotals, daysInMonth) {
  const canvas = document.getElementById('monthly-trend-chart');
  if (!canvas) return;

  const labels = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);

  if (monthlyChartInstance) {
    monthlyChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  monthlyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Daily Sales (RM)',
        data: dailyTotals,
        backgroundColor: 'rgba(16, 185, 129, 0.75)',
        borderColor: '#059669',
        borderWidth: 1.5,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (val) => `RM ${val}`
          }
        },
        x: {
          grid: { display: false }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `Revenue: ${formatRM(ctx.raw)}`
          }
        }
      }
    }
  });
}

// --------------------------------------------------------------------------
// 3. YEARLY REPORT LOGIC
// --------------------------------------------------------------------------

async function loadYearlyReport() {
  yearlyPeriodDisplay.textContent = `Year ${selectedYear}`;

  try {
    const sales = await getSalesByYear(selectedYear);
    renderYearlyData(sales);
  } catch (err) {
    console.error('Error fetching yearly sales:', err);
  }
}

function renderYearlyData(sales) {
  let totalSales = 0;
  let totalOrders = sales.length;
  let totalItems = 0;
  let totalDiscount = 0;
  let totalCash = 0;
  let totalQr = 0;

  const productStats = {};
  const monthlyTotals = new Array(12).fill(0); // Jan..Dec

  sales.forEach(s => {
    totalSales += s.total || 0;
    totalDiscount += s.discount || 0;
    totalItems += s.totalItems || 0;
    if (s.paymentMethod === 'cash') totalCash += s.total || 0;
    if (s.paymentMethod === 'qr') totalQr += s.total || 0;

    // Monthly bucket
    if (s.saleMonth) {
      const monthNum = parseInt(s.saleMonth.split('-')[1], 10);
      if (monthNum >= 1 && monthNum <= 12) {
        monthlyTotals[monthNum - 1] += s.total || 0;
      }
    }

    // Product stats
    if (Array.isArray(s.items)) {
      s.items.forEach(item => {
        if (!productStats[item.name]) {
          productStats[item.name] = {
            name: item.name,
            chineseName: item.chineseName,
            category: item.category,
            quantity: 0,
            revenue: 0
          };
        }
        productStats[item.name].quantity += item.quantity || 1;
        productStats[item.name].revenue += item.subtotal || (item.unitPrice * item.quantity);
      });
    }
  });

  yearlyMetricSales.textContent = formatRM(totalSales);
  yearlyMetricOrders.textContent = totalOrders;
  yearlyMetricItems.textContent = totalItems;
  yearlyMetricDiscount.textContent = formatRM(totalDiscount);
  yearlyMetricCash.textContent = formatRM(totalCash);
  yearlyMetricQr.textContent = formatRM(totalQr);

  // Render 12-Month Revenue Chart
  renderYearlyRevenueChart(monthlyTotals);

  // Render Best Sellers
  renderBestSellersTable(yearlyBestsellersTbody, productStats);
}

function renderYearlyRevenueChart(monthlyTotals) {
  const canvas = document.getElementById('yearly-revenue-chart');
  if (!canvas) return;

  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (yearlyChartInstance) {
    yearlyChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  yearlyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: monthLabels,
      datasets: [{
        label: 'Monthly Revenue (RM)',
        data: monthlyTotals,
        backgroundColor: 'rgba(99, 102, 241, 0.75)',
        borderColor: '#4f46e5',
        borderWidth: 1.5,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (val) => `RM ${val}`
          }
        },
        x: {
          grid: { display: false }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `Revenue: ${formatRM(ctx.raw)}`
          }
        }
      }
    }
  });
}

function renderBestSellersTable(tbodyEl, productStats) {
  const list = Object.values(productStats).sort((a, b) => b.quantity - a.quantity);

  if (list.length === 0) {
    tbodyEl.innerHTML = `
      <tr>
        <td colspan="5" class="table-empty">
          <p style="font-weight: 600;">No sales data available for this period.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbodyEl.innerHTML = list.map((item, index) => {
    const badgeClass = getCategoryBadgeClass(item.category);
    return `
      <tr>
        <td style="font-weight: 800; color: ${index === 0 ? 'var(--accent-mango)' : 'var(--text-muted)'};">
          #${index + 1}
        </td>
        <td>
          <span style="font-weight: 700;">${escapeHtml(item.name)}</span>
          ${item.chineseName ? `<span style="color:var(--text-muted); font-size:0.85rem; margin-left:6px;">(${escapeHtml(item.chineseName)})</span>` : ''}
        </td>
        <td><span class="badge ${badgeClass}">${escapeHtml(item.category || 'Standard')}</span></td>
        <td style="font-weight: 700; font-size: 1.05rem;">${item.quantity} cups</td>
        <td style="font-weight: 800; color: var(--primary-dark);">${formatRM(item.revenue)}</td>
      </tr>
    `;
  }).join('');
}
