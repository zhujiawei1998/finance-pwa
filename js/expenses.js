// 支出模块 — 使用事件委托，不依赖元素初始可见性
const ExpenseForm = {
  selectedType: 'consumption',
  selectedCategory: null,

  init() {
    // 日期默认今天
    var d = document.getElementById('expense-date');
    if (d) d.value = Stats.today();

    // 事件委托：从 document 层监听所有支出表单的点击
    document.addEventListener('click', function(e) {
      // 类型切换
      var seg = e.target.closest('#expense-type-toggle .segment');
      if (seg) {
        document.querySelectorAll('#expense-type-toggle .segment').forEach(function(b) { b.classList.remove('active'); });
        seg.classList.add('active');
        ExpenseForm.selectedType = seg.dataset.value;
        return;
      }
      // 分类选择
      var chip = e.target.closest('#expense-category-grid .chip');
      if (chip) {
        document.querySelectorAll('#expense-category-grid .chip').forEach(function(c) { c.classList.remove('active'); });
        chip.classList.add('active');
        ExpenseForm.selectedCategory = chip.dataset.value;
        return;
      }
    });

    // 表单提交
    var form = document.getElementById('expense-form');
    if (form) form.addEventListener('submit', function(e) { e.preventDefault(); ExpenseForm.submit(); });
  },

  submit() {
    var amount = parseFloat(document.getElementById('expense-amount').value);
    var date = document.getElementById('expense-date').value;
    var note = document.getElementById('expense-note').value.trim();
    var err = document.getElementById('expense-error');
    if (!amount || amount <= 0) { err.textContent = '请输入有效金额'; err.classList.remove('hidden'); return; }
    if (!this.selectedCategory) { err.textContent = '请选择分类'; err.classList.remove('hidden'); return; }
    err.classList.add('hidden');
    DB.addExpense({ amount: amount, date: date, note: note, expense_type: this.selectedType, category: this.selectedCategory });
    Toast.show('支出记录成功', 'success');
    this.reset();
    refreshDashboard();
    if (typeof refreshBudget === 'function') refreshBudget();
  },

  reset() {
    document.getElementById('expense-amount').value = '';
    document.getElementById('expense-note').value = '';
    var d = document.getElementById('expense-date');
    if (d) d.value = Stats.today();
    var tg = document.getElementById('expense-type-toggle');
    if (tg) {
      tg.querySelectorAll('.segment').forEach(function(b) { b.classList.remove('active'); });
      var def = tg.querySelector('[data-value="consumption"]');
      if (def) def.classList.add('active');
    }
    this.selectedType = 'consumption';
    document.querySelectorAll('#expense-category-grid .chip').forEach(function(c) { c.classList.remove('active'); });
    this.selectedCategory = null;
  }
};
