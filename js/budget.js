const Budget = {
  async refresh() {
    const container = document.getElementById('budget-list');
    if (!container) return;
    const limits = DB.getBudgets();
    const monthExp = await Stats.getMonthExpenseByCategory();
    const spentMap = {};
    monthExp.forEach(d => { spentMap[d.category] = d.amount; });
    if (limits.length === 0) {
      container.innerHTML = '<p class="empty-hint">暂无预算设置，点击下方按钮添加</p>';
      return;
    }
    container.innerHTML = limits.map(l => {
      const spent = spentMap[l.category] || 0;
      const pct = l.limit_amount > 0 ? Math.min((spent / l.limit_amount) * 100, 100) : 0;
      let status = 'safe';
      if (pct >= 100) status = 'over';
      else if (pct >= 80) status = 'warn';
      const overspent = spent > l.limit_amount;
      const catIcon = EXPENSE_CATEGORIES.find(c => c.value === l.category)?.icon || '';
      return `
        <div class="card budget-item${overspent ? ' overspent' : ''}">
          <div class="budget-item-header">
            <span class="budget-item-category">${safeText(l.category)} ${catIcon}</span>
            <div class="budget-item-actions">
              <button class="btn btn-secondary" data-action="edit" data-category="${l.category}" data-limit="${l.limit_amount}">编辑</button>
              <button class="btn btn-danger" data-action="delete" data-id="${l.id}">删除</button>
            </div>
          </div>
          <div class="budget-item-amounts">已消费 ¥${spent.toFixed(2)} / 限额 ¥${parseFloat(l.limit_amount).toFixed(2)}${overspent ? ' 🚫 超支！' : ''}</div>
          <div class="budget-item-bar"><div class="budget-item-fill ${status}" style="width:${pct}%"></div></div>
        </div>`;
    }).join('');

    container.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => this.openModal(btn.dataset.category, parseFloat(btn.dataset.limit)));
    });
    container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (await ConfirmModal.show('确定删除此预算？')) {
          DB.deleteBudget(btn.dataset.id);
          Toast.show('预算已删除', 'success');
          await this.refresh();
        }
      });
    });
  },

  openModal(category = '', limit = '') {
    document.getElementById('budget-modal-title').textContent = category ? '编辑预算' : '添加预算';
    const cat = document.getElementById('budget-modal-category');
    cat.innerHTML = BUDGET_CATEGORIES.map(c => `<option value="${c}" ${c===category?'selected':''}>${c}</option>`).join('');
    cat.disabled = !!category;
    document.getElementById('budget-modal-amount').value = limit;
    document.getElementById('budget-modal').classList.remove('hidden');
  }
};

async function refreshBudget() { await Budget.refresh(); }

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('add-budget-btn').addEventListener('click', () => Budget.openModal());
  document.getElementById('budget-modal-cancel').addEventListener('click', () => {
    document.getElementById('budget-modal').classList.add('hidden');
  });
  document.getElementById('budget-modal-save').addEventListener('click', async () => {
    const category = document.getElementById('budget-modal-category').value;
    const amount = parseFloat(document.getElementById('budget-modal-amount').value);
    if (!amount || amount <= 0) { Toast.show('请输入有效限额', 'error'); return; }
    DB.saveBudget({ category, limit_amount: amount, period: 'monthly' });
    Toast.show('预算已保存', 'success');
    document.getElementById('budget-modal').classList.add('hidden');
    await Budget.refresh();
  });
});
