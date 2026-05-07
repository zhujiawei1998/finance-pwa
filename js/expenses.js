// 支出模块
const ExpenseForm = {
  selectedType: 'consumption',
  selectedCategory: null,

  init() {
    const form = document.getElementById('expense-form');
    const toggle = document.getElementById('expense-type-toggle');
    const grid = document.getElementById('expense-category-grid');

    // 日期默认今天
    document.getElementById('expense-date').value = Stats.today();

    // 类型切换
    toggle.querySelectorAll('.segment').forEach(btn => {
      btn.addEventListener('click', () => {
        toggle.querySelectorAll('.segment').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedType = btn.dataset.value;
      });
    });

    // 分类选择
    grid.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        grid.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.selectedCategory = chip.dataset.value;
      });
    });

    // 表单提交
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.submit();
    });
  },

  async submit() {
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const date = document.getElementById('expense-date').value;
    const note = document.getElementById('expense-note').value.trim();
    const errorEl = document.getElementById('expense-error');

    if (!amount || amount <= 0) {
      errorEl.textContent = '请输入有效金额';
      errorEl.classList.remove('hidden');
      return;
    }
    if (!this.selectedCategory) {
      errorEl.textContent = '请选择分类';
      errorEl.classList.remove('hidden');
      return;
    }

    const payload = {
      user_id: Auth.currentUser.id,
      amount,
      date,
      note,
      expense_type: this.selectedType,
      category: this.selectedCategory
    };

    const { error } = await supabase.from('expenses').insert(payload);
    if (error) {
      // 离线时加入队列
      if (!navigator.onLine) {
        await Offline.enqueue({ operation: 'insert_expense', payload });
        errorEl.classList.add('hidden');
        Toast.show('已离线保存，网络恢复后同步', 'warning');
        this.resetForm();
        return;
      }
      errorEl.textContent = error.message;
      errorEl.classList.remove('hidden');
      return;
    }

    errorEl.classList.add('hidden');
    Toast.show('支出记录成功', 'success');
    this.resetForm();
    if (typeof refreshDashboard === 'function') refreshDashboard();
    if (typeof refreshBudget === 'function') refreshBudget();
  },

  resetForm() {
    document.getElementById('expense-amount').value = '';
    document.getElementById('expense-note').value = '';
    document.getElementById('expense-date').value = Stats.today();
    document.getElementById('expense-type-toggle').querySelectorAll('.segment').forEach(b => b.classList.remove('active'));
    document.getElementById('expense-type-toggle').querySelector('[data-value="consumption"]').classList.add('active');
    this.selectedType = 'consumption';
    document.getElementById('expense-category-grid').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    this.selectedCategory = null;
  }
};
