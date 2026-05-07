// 收入模块 — 与支出页面风格统一
const IncomeForm = {
  selectedCategory: '工资',

  init() {
    var d = document.getElementById('income-date');
    if (d) d.value = Stats.today();

    // 事件委托：分类网格
    document.addEventListener('click', function(e) {
      var chip = e.target.closest('#income-category-grid .chip');
      if (chip) {
        document.querySelectorAll('#income-category-grid .chip').forEach(function(c) { c.classList.remove('active'); });
        chip.classList.add('active');
        IncomeForm.selectedCategory = chip.dataset.value;
        return;
      }
    });

    var form = document.getElementById('income-form');
    if (form) form.addEventListener('submit', function(e) { e.preventDefault(); IncomeForm.submit(); });
  },

  submit() {
    var amount = parseFloat(document.getElementById('income-amount').value);
    var date = document.getElementById('income-date').value;
    var note = document.getElementById('income-note').value.trim();
    var err = document.getElementById('income-error');
    if (!amount || amount <= 0) { err.textContent = '请输入有效金额'; err.classList.remove('hidden'); return; }
    err.classList.add('hidden');
    DB.addIncome({ amount: amount, date: date, note: note, category: this.selectedCategory });
    Toast.show('收入记录成功', 'success');
    this.reset();
    refreshDashboard();
  },

  reset() {
    document.getElementById('income-amount').value = '';
    document.getElementById('income-note').value = '';
    var d = document.getElementById('income-date');
    if (d) d.value = Stats.today();
    document.querySelectorAll('#income-category-grid .chip').forEach(function(c) { c.classList.remove('active'); });
    var def = document.querySelector('#income-category-grid .chip[data-value="工资"]');
    if (def) def.classList.add('active');
    this.selectedCategory = '工资';
  }
};
