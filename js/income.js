// 收入模块
const IncomeForm = {
  init() {
    var d = document.getElementById('income-date');
    if (d) d.value = Stats.today();
    var form = document.getElementById('income-form');
    if (form) form.addEventListener('submit', function(e) { e.preventDefault(); IncomeForm.submit(); });
  },

  submit() {
    var amount = parseFloat(document.getElementById('income-amount').value);
    var date = document.getElementById('income-date').value;
    var category = document.getElementById('income-category').value;
    var note = document.getElementById('income-note').value.trim();
    var err = document.getElementById('income-error');
    if (!amount || amount <= 0) { err.textContent = '请输入有效金额'; err.classList.remove('hidden'); return; }
    err.classList.add('hidden');
    DB.addIncome({ amount: amount, date: date, note: note, category: category });
    Toast.show('收入记录成功', 'success');
    this.reset();
    refreshDashboard();
  },

  reset() {
    document.getElementById('income-amount').value = '';
    document.getElementById('income-note').value = '';
    var d = document.getElementById('income-date');
    if (d) d.value = Stats.today();
    document.getElementById('income-category').value = '工资';
  }
};
