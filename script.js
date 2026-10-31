// ===== STATE MANAGEMENT =====
let transactions = [];
let chart = null;
let isDarkTheme = false;
let customCategories = [];

// ===== CONSTANTS =====
const STORAGE_KEY = 'expenseTrackerData';
const THEME_KEY = 'expenseTrackerTheme';
const CATEGORIES_KEY = 'expenseTrackerCategories';

const DEFAULT_CATEGORIES = [
    { name: 'Food', emoji: '🍔', color: '#f59e0b' },
    { name: 'Transport', emoji: '🚗', color: '#3b82f6' },
    { name: 'Fun', emoji: '🎉', color: '#ec4899' }
];

const AVAILABLE_COLORS = [
    '#f59e0b', '#3b82f6', '#ec4899', '#10b981', '#ef4444', 
    '#8b5cf6', '#06b6d4', '#f97316', '#84cc16', '#a855f7'
];

const AVAILABLE_EMOJIS = [
    '🍔', '🚗', '🎉', '💼', '🏠', '🏥', '�', '👕', 
    '⚡', '�', '🎮', '📚', '✈️', '🎬', '☕', '�'
];

// ===== DOM ELEMENTS =====
const transactionForm = document.getElementById('transactionForm');
const itemNameInput = document.getElementById('itemName');
const amountInput = document.getElementById('amount');
const categorySelect = document.getElementById('category');
const totalBalanceEl = document.getElementById('totalBalance');
const transactionListEl = document.getElementById('transactionList');
const chartCanvas = document.getElementById('expenseChart');
const emptyChartMessage = document.getElementById('emptyChartMessage');
const themeToggle = document.getElementById('themeToggle');
const categoryModal = document.getElementById('categoryModal');
const addCategoryBtn = document.getElementById('addCategoryBtn');
const closeCategoryModal = document.getElementById('closeCategoryModal');
const categoryForm = document.getElementById('categoryForm');
const recapModal = document.getElementById('recapModal');
const viewRecapBtn = document.getElementById('viewRecapBtn');
const closeRecapModal = document.getElementById('closeRecapModal');
const monthSelect = document.getElementById('monthSelect');
const yearSelect = document.getElementById('yearSelect');

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    loadCustomCategories();
    loadTheme();
    updateCategorySelect();
    updateUI();
    initializeChart();
    populateYearSelect();
});

// ===== EVENT LISTENERS =====
transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addTransaction();
});

themeToggle.addEventListener('click', toggleTheme);

addCategoryBtn.addEventListener('click', () => {
    categoryModal.classList.add('show');
});

closeCategoryModal.addEventListener('click', () => {
    categoryModal.classList.remove('show');
    categoryForm.reset();
});

categoryModal.addEventListener('click', (e) => {
    if (e.target === categoryModal) {
        categoryModal.classList.remove('show');
        categoryForm.reset();
    }
});

categoryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addCustomCategory();
});

viewRecapBtn.addEventListener('click', () => {
    const now = new Date();
    monthSelect.value = now.getMonth();
    yearSelect.value = now.getFullYear();
    generateMonthlyRecap();
    recapModal.classList.add('show');
});

closeRecapModal.addEventListener('click', () => {
    recapModal.classList.remove('show');
});

recapModal.addEventListener('click', (e) => {
    if (e.target === recapModal) {
        recapModal.classList.remove('show');
    }
});

monthSelect.addEventListener('change', generateMonthlyRecap);
yearSelect.addEventListener('change', generateMonthlyRecap);

// ===== TRANSACTION MANAGEMENT =====
function addTransaction() {
    const itemName = itemNameInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const category = categorySelect.value;

    // Validation
    if (!itemName || !amount || !category) {
        alert('Please fill in all fields');
        return;
    }

    if (amount <= 0) {
        alert('Amount must be greater than 0');
        return;
    }

    // Create transaction object
    const transaction = {
        id: Date.now(),
        itemName,
        amount,
        category,
        date: new Date().toISOString()
    };

    // Add to transactions array
    transactions.push(transaction);

    // Save to local storage
    saveToLocalStorage();

    // Update UI
    updateUI();

    // Reset form
    transactionForm.reset();

    // Show success feedback
    flashBalanceCard();
}

function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveToLocalStorage();
    updateUI();
}

// ===== UI UPDATE FUNCTIONS =====
function updateUI() {
    updateBalance();
    renderTransactionList();
    updateChart();
}

function updateBalance() {
    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    totalBalanceEl.textContent = formatCurrency(total);
}

function renderTransactionList() {
    if (transactions.length === 0) {
        transactionListEl.innerHTML = `
            <div class="empty-message">
                No transactions yet. Start adding your expenses!
            </div>
        `;
        return;
    }

    // Sort transactions by date (newest first)
    const sortedTransactions = [...transactions].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );

    transactionListEl.innerHTML = sortedTransactions.map(transaction => `
        <div class="transaction-item">
            <div class="transaction-info">
                <div class="transaction-name">
                    ${getCategoryEmoji(transaction.category)} ${escapeHtml(transaction.itemName)}
                </div>
                <span class="transaction-category" style="background-color: ${getCategoryColor(transaction.category)}22; color: ${getCategoryColor(transaction.category)};">
                    ${transaction.category}
                </span>
                <div class="transaction-date">
                    ${formatDate(transaction.date)}
                </div>
            </div>
            <div class="transaction-details">
                <span class="transaction-amount">-${formatCurrency(transaction.amount)}</span>
                <button class="btn-delete" onclick="deleteTransaction(${transaction.id})">
                    Delete
                </button>
            </div>
        </div>
    `).join('');
}

// ===== CHART FUNCTIONS =====
function initializeChart() {
    const ctx = chartCanvas.getContext('2d');
    
    chart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 14
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function updateChart() {
    if (transactions.length === 0) {
        chartCanvas.classList.add('hidden');
        emptyChartMessage.classList.remove('hidden');
        return;
    }

    chartCanvas.classList.remove('hidden');
    emptyChartMessage.classList.add('hidden');

    // Calculate spending by category
    const categoryTotals = transactions.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
    }, {});

    // Prepare chart data
    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);
    const colors = labels.map(category => getCategoryColor(category));

    // Update chart
    chart.data.labels = labels.map(label => `${getCategoryEmoji(label)} ${label}`);
    chart.data.datasets[0].data = data;
    chart.data.datasets[0].backgroundColor = colors;
    chart.update();
}

// ===== CUSTOM CATEGORY FUNCTIONS =====
function addCustomCategory() {
    const categoryName = document.getElementById('categoryName').value.trim();
    const categoryEmoji = document.getElementById('categoryEmoji').value;
    const categoryColor = document.getElementById('categoryColor').value;

    if (!categoryName) {
        alert('Please enter a category name');
        return;
    }

    // Check if category already exists
    const allCategories = getAllCategories();
    if (allCategories.find(c => c.name.toLowerCase() === categoryName.toLowerCase())) {
        alert('Category already exists');
        return;
    }

    const newCategory = {
        name: categoryName,
        emoji: categoryEmoji,
        color: categoryColor
    };

    customCategories.push(newCategory);
    saveCustomCategories();
    updateCategorySelect();
    
    categoryModal.classList.remove('show');
    categoryForm.reset();
}

function getAllCategories() {
    return [...DEFAULT_CATEGORIES, ...customCategories];
}

function getCategoryEmoji(categoryName) {
    const allCategories = getAllCategories();
    const category = allCategories.find(c => c.name === categoryName);
    return category ? category.emoji : '📦';
}

function getCategoryColor(categoryName) {
    const allCategories = getAllCategories();
    const category = allCategories.find(c => c.name === categoryName);
    return category ? category.color : '#6b7280';
}

function updateCategorySelect() {
    const allCategories = getAllCategories();
    const currentValue = categorySelect.value;
    
    categorySelect.innerHTML = '<option value="">Select a category</option>' +
        allCategories.map(cat => 
            `<option value="${cat.name}">${cat.emoji} ${cat.name}</option>`
        ).join('');
    
    // Restore previous selection if still exists
    if (currentValue && allCategories.find(c => c.name === currentValue)) {
        categorySelect.value = currentValue;
    }
}

function saveCustomCategories() {
    try {
        localStorage.setItem(CATEGORIES_KEY, JSON.stringify(customCategories));
    } catch (error) {
        console.error('Error saving categories:', error);
    }
}

function loadCustomCategories() {
    try {
        const data = localStorage.getItem(CATEGORIES_KEY);
        if (data) {
            customCategories = JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        customCategories = [];
    }
}

// ===== MONTHLY RECAP FUNCTIONS =====
function populateYearSelect() {
    const currentYear = new Date().getFullYear();
    const years = [];
    
    // Get years from transactions
    transactions.forEach(t => {
        const year = new Date(t.date).getFullYear();
        if (!years.includes(year)) {
            years.push(year);
        }
    });
    
    // Add current year if not in list
    if (!years.includes(currentYear)) {
        years.push(currentYear);
    }
    
    years.sort((a, b) => b - a);
    
    yearSelect.innerHTML = years.map(year => 
        `<option value="${year}">${year}</option>`
    ).join('');
}

function generateMonthlyRecap() {
    const month = parseInt(monthSelect.value);
    const year = parseInt(yearSelect.value);
    
    // Filter transactions for selected month
    const monthTransactions = transactions.filter(t => {
        const date = new Date(t.date);
        return date.getMonth() === month && date.getFullYear() === year;
    });
    
    // Calculate statistics
    const totalSpent = monthTransactions.reduce((sum, t) => sum + t.amount, 0);
    const transactionCount = monthTransactions.length;
    const avgPerTransaction = transactionCount > 0 ? totalSpent / transactionCount : 0;
    
    // Calculate by category
    const categoryBreakdown = monthTransactions.reduce((acc, t) => {
        if (!acc[t.category]) {
            acc[t.category] = { total: 0, count: 0 };
        }
        acc[t.category].total += t.amount;
        acc[t.category].count += 1;
        return acc;
    }, {});
    
    // Find top category
    let topCategory = null;
    let topAmount = 0;
    Object.keys(categoryBreakdown).forEach(cat => {
        if (categoryBreakdown[cat].total > topAmount) {
            topAmount = categoryBreakdown[cat].total;
            topCategory = cat;
        }
    });
    
    // Display results
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    document.getElementById('recapTitle').textContent = `${monthNames[month]} ${year} Recap`;
    document.getElementById('recapTotal').textContent = formatCurrency(totalSpent);
    document.getElementById('recapCount').textContent = transactionCount;
    document.getElementById('recapAverage').textContent = formatCurrency(avgPerTransaction);
    
    if (topCategory) {
        document.getElementById('recapTopCategory').textContent = 
            `${getCategoryEmoji(topCategory)} ${topCategory} (${formatCurrency(topAmount)})`;
    } else {
        document.getElementById('recapTopCategory').textContent = 'N/A';
    }
    
    // Display category breakdown
    const breakdownEl = document.getElementById('recapBreakdown');
    if (Object.keys(categoryBreakdown).length === 0) {
        breakdownEl.innerHTML = '<p class="empty-message">No transactions this month</p>';
    } else {
        breakdownEl.innerHTML = Object.keys(categoryBreakdown)
            .sort((a, b) => categoryBreakdown[b].total - categoryBreakdown[a].total)
            .map(cat => {
                const percentage = totalSpent > 0 ? (categoryBreakdown[cat].total / totalSpent * 100).toFixed(1) : 0;
                return `
                    <div class="recap-category-item">
                        <div class="recap-category-info">
                            <span class="recap-category-name">
                                ${getCategoryEmoji(cat)} ${cat}
                            </span>
                            <span class="recap-category-count">${categoryBreakdown[cat].count} transactions</span>
                        </div>
                        <div class="recap-category-amount">
                            <div class="recap-category-bar">
                                <div class="recap-category-fill" style="width: ${percentage}%; background-color: ${getCategoryColor(cat)};"></div>
                            </div>
                            <span class="recap-amount-text">${formatCurrency(categoryBreakdown[cat].total)}</span>
                            <span class="recap-percentage">(${percentage}%)</span>
                        </div>
                    </div>
                `;
            }).join('');
    }
}

// ===== LOCAL STORAGE FUNCTIONS =====
function saveToLocalStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (error) {
        console.error('Error saving to local storage:', error);
        alert('Failed to save data. Your browser may have storage restrictions.');
    }
}

function loadFromLocalStorage() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            transactions = JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading from local storage:', error);
        transactions = [];
    }
}

// ===== THEME FUNCTIONS =====
function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    applyTheme();
    saveTheme();
}

function applyTheme() {
    if (isDarkTheme) {
        document.body.classList.add('dark-theme');
        themeToggle.querySelector('.theme-icon').textContent = '☀️';
    } else {
        document.body.classList.remove('dark-theme');
        themeToggle.querySelector('.theme-icon').textContent = '🌙';
    }
    
    // Update chart colors for theme
    if (chart) {
        chart.options.plugins.legend.labels.color = isDarkTheme ? '#f9fafb' : '#1f2937';
        chart.update();
    }
}

function saveTheme() {
    try {
        localStorage.setItem(THEME_KEY, isDarkTheme ? 'dark' : 'light');
    } catch (error) {
        console.error('Error saving theme:', error);
    }
}

function loadTheme() {
    try {
        const savedTheme = localStorage.getItem(THEME_KEY);
        isDarkTheme = savedTheme === 'dark';
        applyTheme();
    } catch (error) {
        console.error('Error loading theme:', error);
    }
}

// ===== UTILITY FUNCTIONS =====
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    // If today
    if (diffDays === 0) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `Today at ${hours}:${minutes}`;
    }
    
    // If yesterday
    if (diffDays === 1) {
        return 'Yesterday';
    }
    
    // If within a week
    if (diffDays < 7) {
        return `${diffDays} days ago`;
    }
    
    // Otherwise show full date
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function flashBalanceCard() {
    const balanceCard = document.querySelector('.balance-card');
    balanceCard.style.transform = 'scale(1.05)';
    setTimeout(() => {
        balanceCard.style.transform = 'scale(1)';
    }, 200);
}

// ===== GLOBAL FUNCTIONS (for inline event handlers) =====
// Make deleteTransaction available globally for onclick handlers
window.deleteTransaction = deleteTransaction;
