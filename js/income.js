const IncomeForm = {
  init() {
    document.getElementById('income-date').value = Stats.today();
    document.getElementById('income-form').addEventListener('submit', e => { e.preventDefault(); this.submit(); });
  },

  submit() {
    const amount = parseFloat(document.getElementById('income-amount').value);
    const date = document.getElementById('income-date').value;
    const category = document.getElementById('income-category').value;
    const note = document.getElementById('income-note').value.trim();
    const err = document.getElementById('income-error');
    if (!amount || amount <= 0) { err.textContent = '请输入有效金额'; err.classList.remove('hidden'); return; }
    err.classList.add('hidden');
    DB.addIncome({ amount, date, note, category });
    Toast.show('收入记录成功', 'success');
    this.reset();
    refreshDashboard();
  },

  reset() {
    document.getElementById('income-amount').value = '';
    document.getElementById('income-note').value = '';
    document.getElementById('income-date').value = Stats.today();
    document.getElementById('income-category').value = '工资';
  }
};
