// 收入模块
const IncomeForm = {
  init() {
    const form = document.getElementById('income-form');
    document.getElementById('income-date').value = Stats.today();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.submit();
    });
  },

  async submit() {
    const amount = parseFloat(document.getElementById('income-amount').value);
    const date = document.getElementById('income-date').value;
    const category = document.getElementById('income-category').value;
    const note = document.getElementById('income-note').value.trim();
    const errorEl = document.getElementById('income-error');

    if (!amount || amount <= 0) {
      errorEl.textContent = '请输入有效金额';
      errorEl.classList.remove('hidden');
      return;
    }

    const payload = {
      user_id: Auth.currentUser.id,
      amount,
      date,
      note,
      category
    };

    const { error } = await supabase.from('income').insert(payload);
    if (error) {
      if (!navigator.onLine) {
        await Offline.enqueue({ operation: 'insert_income', payload });
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
    Toast.show('收入记录成功', 'success');
    this.resetForm();
    if (typeof refreshDashboard === 'function') refreshDashboard();
  },

  resetForm() {
    document.getElementById('income-amount').value = '';
    document.getElementById('income-note').value = '';
    document.getElementById('income-date').value = Stats.today();
    document.getElementById('income-category').value = '工资';
  }
};
