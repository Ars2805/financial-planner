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
  clearAll: document.getElementById('clear-all')
};

let incomeChart = null;
let expenseChart = null;

elements.form.addEventListener('submit', addTransaction);
elements.clearAll.addEventListener('click', clearAll);
elements.filterType.addEventListener('change', render);
elements.search.addEventListener('input', render);
elements.filterDate.addEventListener('change', render);

function addTransaction(e) {
  e.preventDefault();

  const title = elements.title.value.trim();
  const amount = parseFloat(elements.amount.value);
  const type = elements.type.value;
  const date = elements.date.value;

  if (!title || !amount || !type || !date || amount <= 0) {
    alert('Пожалуйста, заполните все поля корректно.');
    return;
  }

  const transaction = {
    id: Date.now(),
    title,
    amount,
    type,
    date
  };

  transactions.push(transaction);
  saveAndRender();
  elements.form.reset();
}

function render() {
  const filtered = transactions
    .filter(t => {
      const typeMatch =
        elements.filterType.value === 'all' || t.type === elements.filterType.value;
      const searchMatch = t.title.toLowerCase().includes(elements.search.value.toLowerCase());
      const dateMatch = elements.filterDate.value
        ? t.date.startsWith(elements.filterDate.value)
        : true;
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

  renderChart('income-chart', incomeData, 'green', incomeChart, c => incomeChart = c);
  renderChart('expense-chart', expenseData, 'red', expenseChart, c => expenseChart = c);
}

function renderChart(id, data, _, chartRef, setChart) {
  const ctx = document.getElementById(id);
  if (chartRef) chartRef.destroy();

  const colors = generateColors(Object.keys(data).length);

  setChart(new Chart(ctx, {
    type: 'pie',
    data: {
      labels: Object.keys(data),
      datasets: [{
        data: Object.values(data),
        backgroundColor: colors
      }]
    },
    options: {
      plugins: {
        legend: { position: 'bottom' }
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

render();
