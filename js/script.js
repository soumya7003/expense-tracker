let entries = JSON.parse(localStorage.getItem('paisa_entries') || '[]');

let selectedType = 'expense';

let pieChart = null;

const CURRENCIES = {
    INR: { symbol: '₹', rate: 1, locale: 'en-IN' },
    USD: { symbol: '$', rate: 0.012, locale: 'en-US' },
    EUR: { symbol: '€', rate: 0.011, locale: 'de-DE' },
    GBP: { symbol: '£', rate: 0.0095, locale: 'en-GB' },
    JPY: { symbol: '¥', rate: 1.78, locale: 'ja-JP' },
    AED: { symbol: 'د.إ', rate: 0.044, locale: 'en-US' },
    SGD: { symbol: 'S$', rate: 0.016, locale: 'en-SG' },
    CAD: { symbol: 'C$', rate: 0.016, locale: 'en-CA' },
};

let activeCurrency = localStorage.getItem('paisa_currency') || 'INR';

const savedTheme = localStorage.getItem('paisa_theme') || 'light';

document.documentElement.setAttribute('data-theme', savedTheme);

document.getElementById('themeToggle').textContent = savedTheme === 'dark' ? '☀️' : '🌙';

document.getElementById('currencySelect').value = activeCurrency;

document.getElementById('themeToggle').addEventListener("click", () => {

    const curr = document.documentElement.getAttribute('data-theme');

    const next = curr === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('paisa_theme', next);

    document.getElementById('themeToggle').textContent = next === 'dark' ? '☀️' : '🌙';

    setTimeout(renderChart, 320);
});


function changeCurrency(val) {
    activeCurrency = val;
    localStorage.setItem('paisa_currency', val);
    renderAll();
}


function fmt(inrAmount) {

    const c = CURRENCIES[activeCurrency];
    const converted = inrAmount * c.rate;

    return c.symbol + converted.toLocaleString(c.locale, {
        minimumFractionDigits: activeCurrency === 'JPY' ? 0 : 2,
        maximumFractionDigits: activeCurrency === 'JPY' ? 0 : 2,
    });
}


function setType(t) {

    selectedType = t;

    const expenseBtn = document.getElementById('btnExpense');

    let expenseClass = 'type-btn';

    if (t === 'expense') {
        expenseClass = expenseClass + ' active-expense';
    }

    expenseBtn.className = expenseClass;

    const incomeBtn = document.getElementById('btnIncome');

    let incomeClass = 'type-btn';

    if (t === 'income') {
        incomeClass = incomeClass + ' active-income';
    }

    incomeBtn.className = incomeClass;
}


function save() {
    localStorage.setItem('paisa_entries', JSON.stringify(entries));
}

function today() {
    return new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function escHtml(S) {
    return S
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function addEntry() {

    const desc = document.getElementById('inputDesc').value.trim();
    const amt = parseFloat(document.getElementById('inputAmount').value);
    const cat = document.getElementById('inputCategory').value;

    if (!desc) { showToast('⚠️ Please enter a description!'); return; }
    if (!amt || amt <= 0) { showToast('⚠️ Please enter a valid amount!'); return; }

    const inrAmount = amt / CURRENCIES[activeCurrency].rate;

    entries.unshift({
        id: Date.now(),
        desc,
        amount: inrAmount,
        category: cat,
        type: selectedType,
        date: today()
    });

    save();

    document.getElementById('inputDesc').value = '';
    document.getElementById('inputAmount').value = '';

    renderAll();

    showToast(selectedType === 'income' ? '✅ Income Added!' : '✅ Expense recorded!')
}

function deleteEntry(id) {
    entries = entries.filter(e => e.id !== id)
    save();
    renderAll();
    showToast('🥛 Entry Deleted.')
}


let editingid = null;

let editSelectedType = 'expense';

function openEditModal(id) {
    const entry = entries.find(e => e.id === id);

    if (!entry) return;

    editingid = id;

    editSelectedType = entry.type;

    document.getElementById('editDesc').value = entry.desc;

    document.getElementById('editAmount').value = (
        entry.amount * CURRENCIES[activeCurrency].rate
    ).toFixed(activeCurrency === 'JPY' ? 0 : 2);

    document.getElementById('editCategory').value = entry.category;

    setEditType(entry.type);

    document.getElementById('editModal').classList.add('show');
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('show');
    editingid = null;
}

function setEditType(t) {
    editSelectedType = t;

    const exptBtn = document.getElementById('editBtnExpense');
    const incBtn = document.getElementById('editBtnIncome');

    exptBtn.className = 'type-btn' + (t === 'expense' ? ' active-expense' : '');
    incBtn.className = 'type-btn' + (t === 'income' ? ' active-income' : '');
}


function saveEdit() {

    const desc = document.getElementById('editDesc').value.trim();
    const amt = parseFloat(document.getElementById('editAmount').value);
    const cat = document.getElementById('editCategory').value;

    if (!desc) { showToast('⚠️ Please enter a description!'); return; }
    if (!amt || amt <= 0) { showToast('⚠️ Please enter a valid amount!'); return; }

    const inrAmount = amt / CURRENCIES[activeCurrency].rate;

    entries = entries.map(e => {
        if (e.id === editingid) {
            return {
                ...e, desc, amount: inrAmount, category: cat, type: editSelectedType
            };
        }
        return e;
    });

    save();

    closeEditModal();
    renderAll();

    showToast('✏️ Entry updated!')
}

document.getElementById('editModal').addEventListener('click', function (e) {
    if (e.target === this) closeEditModal();
});


function parseEntryDate(dateStr) {

    const [day, monthStr, year] = dateStr.split(' ');

    const months = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3,
        May: 4, Jun: 5, Jul: 6, Aug: 7,
        Sep: 8, Oct: 9, Nov: 10, Dec: 11
    };

    return new Date(
        Number(year),
        months[monthStr],
        Number(day)
    );
}


function matchesPeriod(entry, period) {

    if (period === 'all') return true;

    const entryDate = parseEntryDate(entry.date);

    const now = new Date();

    if (period === 'this_month') {
        return (
            entryDate.getMonth() === now.getMonth() &&
            entryDate.getFullYear() === now.getFullYear()
        );
    }

    if (period === 'last_month') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return (
            entryDate.getMonth() === lastMonth.getMonth() &&
            entryDate.getFullYear() === lastMonth.getFullYear()
        );
    }

    if (period === 'this_week') {

        const startOfWeek = new Date(now);

        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);

        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        return entryDate >= startOfWeek && entryDate <= endOfWeek;
    }

    return true;
}

function getFiltered() {

    const q = document.getElementById('searchInput').value.toLowerCase();
    const ft = document.getElementById('filterType').value;
    const fc = document.getElementById('filterCat').value;
    const fp = document.getElementById('filterPeriod') ? document.getElementById('filterPeriod').value : 'all';

    return entries.filter(e => {

        const mQ = !q || e.desc.toLowerCase().includes(q) || e.category.toLowerCase().includes(q);
        const mT = ft === 'all' || e.type === ft;
        const mC = fc === 'all' || e.category === fc;
        const mP = matchesPeriod(e, fp);

        return mQ && mT && mC && mP;
    });
}


function renderSumary() {
    const income = entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
    const expense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);

    document.getElementById('totalBalance').textContent = fmt(income - expense);
    document.getElementById('totalIncome').textContent = fmt(income);
    document.getElementById('totalExpense').textContent = fmt(expense);
}


function renderTable() {

    const filtered = getFiltered();

    const tbody = document.getElementById('tableBody');
    const empty = document.getElementById('emptyState');

    document.getElementById('entryCount').textContent = filtered.length + ' entr' + (filtered.length === 1 ? 'y' : 'ies');

    if (filtered.length === 0) {
        tbody.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';

    tbody.innerHTML = filtered
        .map(
            (e, i) => `
      <tr style="animation-delay: ${i * 0.03}s">
        <td class="desc-cell">${escHtml(e.desc)}</td>
        <td><span class="cat-badge">${escHtml(e.category)}</span></td>
        <td class="date-cell">${escHtml(e.date)}</td>
        <td class="amount-cell amount-${e.type}">
          ${e.type === "income" ? "+ " : "- "}${fmt(e.amount)}
        </td>
        <td class="actions-cell">
          <button class="btn-edit" onclick="openEditModal(${e.id})" title="Edit">✏️</button>
          <button class="btn-delete" onclick="deleteEntry(${e.id})" title="Delete">✖</button>
        </td>
      </tr>
    `
        )
        .join("");
}

const PIE_COLORS = [
    '#d4400a', '#2d7a4f', '#c0392b', '#e8640a',
    '#1a6b9a', '#7b4ea6', '#b07d2d', '#2e7d8a', '#8a5c2e'
];

function renderChart() {

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    const expenses = entries.filter(e => e.type === 'expense');
    const section = document.getElementById('chartSection');

    if (expenses.length === 0) {
        if (pieChart) { pieChart.destroy(); pieChart = null; }

        section.innerHTML = '<div class="chart-empty">No expense data yet - add some entries to see the chart! 🌗 </div>';
        return;
    }

    if (!document.getElementById('pieChart')) {
        section.innerHTML = `
            <h4 class="chart-header">Expense by Category</h4>
            <div class="wrapper-main">
                <div class="chart-wrap">
                    <canvas id="pieChart"></canvas>
                </div>
                <div class="breakdown-col">
                    <h4 class="chart-header">Breakdown</h4>
                    <div class="chart-legend" id="chartLegend"></div>
                </div>
            </div>
        `;
    }

    const totals = {};
    let grand = 0;

    expenses.forEach(e => {
        totals[e.category] = (totals[e.category] || 0) + e.amount;
        grand += e.amount;
    });

    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const labels = sorted.map(x => x[0]);
    const data = sorted.map(x => x[1]);
    const colors = labels.map((_, i) => PIE_COLORS[i % PIE_COLORS.length]);

    document.getElementById('chartLegend').innerHTML = sorted.map(([cat, amt], i) => {
        const pct = grand > 0 ? ((amt / grand) * 100).toFixed(1) : 0;
        return `
        <div class="legend-item">
            <div class="legend-left">
                <span class="legend-dot" style="background:${colors[i]}"></span>
                <span class="legend-name">${cat}</span>
            </div>
            <div class="legend-bar-wrap">
                <div class="legend-bar" style="width:${pct}%;background:${colors[i]}"></div>
            </div>
            <span class="legend-pct">${pct}%</span>
        </div>
        `;
    }).join('');

    if (pieChart) pieChart.destroy();

    pieChart = new Chart(document.getElementById('pieChart'), {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderColor: isDark ? '#1a1612' : '#fffdf7',
                borderWidth: 3,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '62%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const pct = grand > 0 ? ((ctx.parsed / grand) * 100).toFixed(1) : 0;
                            return `${fmt(ctx.parsed)} (${pct}%)`;
                        }
                    },
                    backgroundColor: isDark ? '#252018' : '#fff',
                    titleColor: isDark ? '#f0e8d8' : '#1a1510',
                    bodyColor: isDark ? '#9a8878' : '#6b5e4e',
                    borderColor: isDark ? '#2e2820' : '#e0d8c8',
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 8
                }
            }
        }
    });
}


function downloadCSV() {
    const filtered = getFiltered();


    if (filtered.length === 0) { showToast('⚠️ No data to export!'); return; }

    const c = CURRENCIES[activeCurrency];
    const header = ['Date', 'Description', 'Category', 'Type', `Amount(${activeCurrency})`];

    const rows = filtered.map(e => [
        e.date,
        `"${e.desc.replace(/"/g, '""')}"`,
        e.category,
        e.type,
        (e.amount * c.rate).toFixed(activeCurrency === 'JPY' ? 0 : 2)
    ]);

    const csv = [header, ...rows].map(r => r.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'paisa_expenses_' + new Date().toISOString().split('T')[0] + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('⬇️ CSV downloaded!')
}


let toastTimer;
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        t.classList.remove('show');
    }, 2500);
}


let descInput = document.getElementById('inputDesc');
descInput.addEventListener('keydown', function (e) {
    if (e.key === "Enter") addEntry();
});

let amountInput = document.getElementById('inputAmount');
amountInput.addEventListener('keydown', function (e) {
    if (e.key === "Enter") addEntry();
});


// Scroll to top button visibility
window.addEventListener('scroll', () => {
    const btn = document.getElementById('scrollTopBtn');
    if (window.scrollY > 100) {
        btn.classList.add('visible');
    } else {
        btn.classList.remove('visible');
    }
});

function renderAll() {
    renderSumary();
    renderTable();
    renderChart();
}

renderAll();