let transactions = JSON.parse(localStorage.getItem('transactions')) || [];

const elements = {
  form: document.getElementById('transaction-form'),
  title: document.getElementById('title'),
  amount: document.getElementById('amount'),
  type: document.getElementById('type'),
  date: document.getElementById('date'),
  incomeList: document.getElementById('income-list'),
  expenseList: document.getElementById('expense-list'),
  balance: document.getElementById('total-balance'),
  incomeSum: document.getElementById('income-sum'),
  expenseSum: document.getElementById('expense-sum'),
  filterType: document.getElementById('filter-type'),
  search: document.getElementById('search'),
  filterDate: document.getElementById('filter-date'),
  clearAll: document.getElementById('clear-all'),
  themeToggle: document.getElementById('toggle-theme'),
};

let incomeChart = null;
let expenseChart = null;

elements.form.addEventListener('submit', addTransaction);
elements.clearAll.addEventListener('click', clearAll);
elements.filterType.addEventListener('change', render);
elements.search.addEventListener('input', render);
elements.filterDate.addEventListener('change', render);
elements.themeToggle.addEventListener('click', toggleTheme);

function addTransaction(e) {
  e.preventDefault();

  const title = elements.title.value.trim();
  let rawAmount = elements.amount.value.trim().replace(',', '.');

  if (/^0\d+/.test(rawAmount)) {
    rawAmount = rawAmount.replace(/^0+/, '');
  }

  const amount = parseFloat(rawAmount);
  const type = elements.type.value;
  const date = elements.date.value;

  if (!title || !type || !date || isNaN(amount) || amount <= 0) {
    alert('Пожалуйста, введите корректную сумму (например, 0.50 или 1.00).');
    return;
  }

  const transaction = {
    id: Date.now(),
    title,
    amount,
    type,
    date,
  };

  transactions.push(transaction);
  saveAndRender();
  elements.form.reset();
}

function render() {
  const filtered = transactions
    .filter(t => {
      const typeMatch = elements.filterType.value === 'all' || t.type === elements.filterType.value;
      const searchMatch = t.title.toLowerCase().includes(elements.search.value.toLowerCase());
      const dateMatch = elements.filterDate.value ? t.date.startsWith(elements.filterDate.value) : true;
      return typeMatch && searchMatch && dateMatch;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  elements.incomeList.innerHTML = '';
  elements.expenseList.innerHTML = '';

  let income = 0;
  let expense = 0;

  const incomeData = {};
  const expenseData = {};

  function formatDate(isoDate) {
    const [year, month, day] = isoDate.split("-");
    return `${day}.${month}.${year}`;
  }

  filtered.forEach(t => {
    const li = document.createElement('li');
    const formattedDate = formatDate(t.date);
    li.innerHTML = `
      <span>${formattedDate}</span>
      <span>${t.title}</span>
      <span>${t.amount.toFixed(2)} ₽</span>
      <button onclick="removeTransaction(${t.id})">✖</button>
    `;

    if (t.type === 'income') {
      income += t.amount;
      elements.incomeList.appendChild(li);
      incomeData[t.title] = (incomeData[t.title] || 0) + t.amount;
    } else {
      expense += t.amount;
      elements.expenseList.appendChild(li);
      expenseData[t.title] = (expenseData[t.title] || 0) + t.amount;
    }
  });

  elements.incomeSum.textContent = `${income.toFixed(2)} ₽`;
  elements.expenseSum.textContent = `${expense.toFixed(2)} ₽`;
  elements.balance.textContent = `${(income - expense).toFixed(2)} ₽`;

  const incomeGrouped = groupSmallValuesWithMinPercent(incomeData, 0.5);
  const expenseGrouped = groupSmallValuesWithMinPercent(expenseData, 0.5);

  renderChart('income-chart', incomeGrouped.groupedData, incomeChart, c => incomeChart = c, incomeGrouped.othersSum, incomeGrouped.total, incomeData);
  renderChart('expense-chart', expenseGrouped.groupedData, expenseChart, c => expenseChart = c, expenseGrouped.othersSum, expenseGrouped.total, expenseData);
}

function renderChart(id, data, chartRef, setChart, othersSum = 0, total = 0, realData = {}) {
  const ctx = document.getElementById(id);
  if (chartRef) chartRef.destroy();

  const isDark = document.body.classList.contains('dark');
  const textColor = isDark ? '#eee' : '#333';
  const borderColor = isDark ? '#555' : '#ccc';

  const colors = generateColors(Object.keys(data).length);

  setChart(new Chart(ctx, {
    type: 'pie',
    data: {
      labels: Object.keys(data),
      datasets: [{
        data: Object.values(data),
        backgroundColor: colors,
        borderColor: borderColor,
        borderWidth: 1.5,
      }]
    },
    options: {
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: textColor
          }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || '';
              if (label === 'Другие') {
                return `${label}: ${othersSum.toFixed(2)} ₽`;
              } else {
                const value = realData[label] !== undefined ? realData[label] : context.parsed;
                return `${label}: ${value.toFixed(2)} ₽`;
              }
            }
          }
        }
      }
    }
  }));
}

function generateColors(count) {
  const colors = [];
  for (let i = 0; i < count; i++) {
    const hue = Math.floor((360 / count) * i);
    colors.push(`hsl(${hue}, 70%, 60%)`);
  }
  return colors;
}

function removeTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveAndRender();
}

function clearAll() {
  if (confirm('Удалить все данные?')) {
    transactions = [];
    saveAndRender();
  }
}

function saveAndRender() {
  localStorage.setItem('transactions', JSON.stringify(transactions));
  render();
}

function groupSmallValuesWithMinPercent(data, minPercent = 0.5) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);

  let othersSum = 0;
  const grouped = {};

  for (const [key, value] of Object.entries(data)) {
    if (value < 100) {
      othersSum += value;
    } else {
      grouped[key] = value;
    }
  }

  if (othersSum > 0) {
    const minValueForPercent = total * (minPercent / 100);
    const displayedValue = Math.max(othersSum, minValueForPercent);
    grouped['Другие'] = displayedValue;
  }

  return { groupedData: grouped, othersSum, total };
}

function toggleTheme() {
  const body = document.body;
  const isDark = body.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  elements.themeToggle.textContent = isDark ? '☀️ Тема' : '🌙 Тема';
  render();
}

// При загрузке установить сохранённую тему и иконку
(function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    elements.themeToggle.textContent = '☀️ Тема';
  } else {
    elements.themeToggle.textContent = '🌙 Тема';
  }
})();

render();