const ExpenseForm = {
  selectedType: 'consumption',
  selectedCategory: null,

  init() {
    document.getElementById('expense-date').value = Stats.today();
    const tg = document.getElementById('expense-type-toggle');
    const cg = document.getElementById('expense-category-grid');

    tg.querySelectorAll('.segment').forEach(btn => {
      btn.addEventListener('click', () => {
        tg.querySelectorAll('.segment').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedType = btn.dataset.value;
      });
    });
    cg.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        cg.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.selectedCategory = chip.dataset.value;
      });
    });
    document.getElementById('expense-form').addEventListener('submit', e => { e.preventDefault(); this.submit(); });
  },

  submit() {
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const date = document.getElementById('expense-date').value;
    const note = document.getElementById('expense-note').value.trim();
    const err = document.getElementById('expense-error');
    if (!amount || amount <= 0) { err.textContent = '请输入有效金额'; err.classList.remove('hidden'); return; }
    if (!this.selectedCategory) { err.textContent = '请选择分类'; err.classList.remove('hidden'); return; }
    err.classList.add('hidden');
    DB.addExpense({ amount, date, note, expense_type: this.selectedType, category: this.selectedCategory });
    Toast.show('支出记录成功', 'success');
    this.reset();
    refreshDashboard();
    if (typeof refreshBudget === 'function') refreshBudget();
  },

  reset() {
    document.getElementById('expense-amount').value = '';
    document.getElementById('expense-note').value = '';
    document.getElementById('expense-date').value = Stats.today();
    const tg = document.getElementById('expense-type-toggle');
    tg.querySelectorAll('.segment').forEach(b => b.classList.remove('active'));
    tg.querySelector('[data-value="consumption"]').classList.add('active');
    this.selectedType = 'consumption';
    document.getElementById('expense-category-grid').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    this.selectedCategory = null;
  }
};
