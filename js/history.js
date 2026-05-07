const History = {
  page: 0,
  pageSize: 50,

  async load() {
    const search = document.getElementById('history-search').value.trim().toLowerCase();
    const dateFrom = document.getElementById('history-date-from').value;
    const dateTo = document.getElementById('history-date-to').value;
    const typeFilter = document.getElementById('history-type-filter').value;
    const container = document.getElementById('history-list');
    const loadMoreBtn = document.getElementById('history-load-more');

    if (this.page === 0) container.innerHTML = '<p class="empty-hint">加载中...</p>';

    let items = [];
    if (typeFilter !== 'income') {
      DB.getExpenses().forEach(e => {
        if (dateFrom && e.date < dateFrom) return;
        if (dateTo && e.date > dateTo) return;
        if (search && !(e.note||'').toLowerCase().includes(search) && !e.category.includes(search)) return;
        items.push({ ...e, kind: 'expense' });
      });
    }
    if (typeFilter !== 'expense') {
      DB.getIncomes().forEach(i => {
        if (dateFrom && i.date < dateFrom) return;
        if (dateTo && i.date > dateTo) return;
        if (search && !(i.note||'').toLowerCase().includes(search) && !i.category.includes(search)) return;
        items.push({ ...i, kind: 'income' });
      });
    }
    items.sort((a, b) => new Date(b.date) - new Date(a.date));
    const sliced = items.slice(this.page * this.pageSize, (this.page + 1) * this.pageSize);

    if (this.page === 0 && sliced.length === 0) {
      container.innerHTML = '<p class="empty-hint">暂无匹配记录</p>';
      loadMoreBtn.classList.add('hidden');
      return;
    }
    if (this.page === 0) container.innerHTML = '';

    const typeLabels = { waste: '浪费', consumption: '消费', investment: '投资' };
    container.innerHTML += sliced.map(t => {
      const isExp = t.kind === 'expense';
      const icon = isExp ? (EXPENSE_CATEGORIES.find(c => c.value === t.category)?.icon || '💸')
                         : (INCOME_CATEGORIES.find(c => c.value === t.category)?.icon || '💰');
      const sign = isExp ? '-' : '+';
      const cls = isExp ? 'expense' : 'income';
      return `
        <div class="txn-item">
          <div class="txn-icon ${cls}">${icon}</div>
          <div class="txn-info">
            <div class="txn-category">${safeText(t.category)}</div>
            ${t.note ? `<div class="txn-note">${escapeHTML(t.note)}</div>` : ''}
            <div class="txn-date">${safeText(t.date)}</div>
          </div>
          ${isExp ? `<span class="txn-type-badge ${t.expense_type}">${typeLabels[t.expense_type]||t.expense_type}</span>` : ''}
          <div class="txn-amount ${cls}">${sign} ¥${parseFloat(t.amount).toFixed(2)}</div>
          <button class="txn-delete" data-id="${safeText(t.id)}" data-kind="${safeText(t.kind)}" title="删除">🗑️</button>
        </div>`;
    }).join('');

    loadMoreBtn.classList.toggle('hidden', sliced.length < this.pageSize);

    container.querySelectorAll('.txn-delete').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        if (await ConfirmModal.show(`确定要删除这条${btn.dataset.kind==='expense'?'支出':'收入'}记录吗？`)) {
          if (btn.dataset.kind === 'expense') DB.deleteExpense(btn.dataset.id);
          else DB.deleteIncome(btn.dataset.id);
          Toast.show('已删除', 'success');
          refreshHistory();
          refreshDashboard();
          if (typeof refreshBudget === 'function') refreshBudget();
        }
      });
    });
  },

  async refresh() { this.page = 0; await this.load(); },
  async loadMore() { this.page++; await this.load(); }
};

async function refreshHistory() { await History.refresh(); }

document.addEventListener('DOMContentLoaded', () => {
  ['history-search','history-date-from','history-date-to'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => refreshHistory());
  });
  const tf = document.getElementById('history-type-filter');
  if (tf) tf.addEventListener('change', () => refreshHistory());
  const lm = document.getElementById('history-load-more');
  if (lm) lm.addEventListener('click', () => History.loadMore());
  document.getElementById('export-csv-btn').addEventListener('click', () => ExportCSV.run());
});

// 确认弹窗
const ConfirmModal = {
  _queue: [],
  show(msg) {
    return new Promise(resolve => {
      this._queue.push(resolve);
      if (this._queue.length === 1) {
        document.getElementById('confirm-modal-message').textContent = msg;
        document.getElementById('confirm-modal').classList.remove('hidden');
      }
    });
  },
  _resolveAndNext(result) {
    const r = this._queue.shift();
    if (r) r(result);
    while (this._queue.length > 0) this._queue.shift()(false);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('confirm-modal-cancel').addEventListener('click', () => {
    document.getElementById('confirm-modal').classList.add('hidden');
    ConfirmModal._resolveAndNext(false);
  });
  document.getElementById('confirm-modal-ok').addEventListener('click', () => {
    document.getElementById('confirm-modal').classList.add('hidden');
    ConfirmModal._resolveAndNext(true);
  });
});
