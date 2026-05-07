// 历史记录模块
const History = {
  page: 0,
  pageSize: 50,

  async refresh() {
    this.page = 0;
    await this.load();
  },

  async load() {
    const userId = Auth.currentUser?.id;
    if (!userId) return;

    const search = document.getElementById('history-search').value.trim().toLowerCase();
    const dateFrom = document.getElementById('history-date-from').value;
    const dateTo = document.getElementById('history-date-to').value;
    const typeFilter = document.getElementById('history-type-filter').value;

    const container = document.getElementById('history-list');
    const loadMoreBtn = document.getElementById('history-load-more');

    if (this.page === 0) {
      container.innerHTML = '<p class="empty-hint">加载中...</p>';
    }

    // 并行获取支出和收入。合并模式下取足量数据客户端排序分页
    const fetchSize = typeFilter === 'all' ? 200 : this.pageSize;
    const offset = this.page * this.pageSize;

    let expensePromise = Promise.resolve([]);
    let incomePromise = Promise.resolve([]);

    if (typeFilter === 'all' || typeFilter === 'expense') {
      let q = supabase.from('expenses').select('id, amount, date, note, expense_type, category, created_at')
        .eq('user_id', userId).order('date', { ascending: false });
      if (dateFrom) q = q.gte('date', dateFrom);
      if (dateTo) q = q.lte('date', dateTo);
      if (search) q = q.ilike('note', `%${search}%`);
      q = q.limit(fetchSize);
      expensePromise = q.then(({ data }) => (data || []).map(e => ({ ...e, kind: 'expense' })));
    }

    if (typeFilter === 'all' || typeFilter === 'income') {
      let q = supabase.from('income').select('id, amount, date, note, category, created_at')
        .eq('user_id', userId).order('date', { ascending: false });
      if (dateFrom) q = q.gte('date', dateFrom);
      if (dateTo) q = q.lte('date', dateTo);
      if (search) q = q.ilike('note', `%${search}%`);
      q = q.limit(fetchSize);
      incomePromise = q.then(({ data }) => (data || []).map(i => ({ ...i, kind: 'income' })));
    }

    const [expenses, incomes] = await Promise.all([expensePromise, incomePromise]);
    let combined = [...expenses, ...incomes];
    combined.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 客户端分页切片
    const sliced = combined.slice(offset, offset + this.pageSize);

    if (this.page === 0 && sliced.length === 0) {
      container.innerHTML = '<p class="empty-hint">暂无匹配记录</p>';
      loadMoreBtn.classList.add('hidden');
      return;
    }

    if (this.page === 0) container.innerHTML = '';

    const typeLabels = { waste: '浪费', consumption: '消费', investment: '投资' };
    container.innerHTML += sliced.map(t => {
      const isExpense = t.kind === 'expense';
      const icon = isExpense
        ? (EXPENSE_CATEGORIES.find(c => c.value === t.category)?.icon || '💸')
        : (INCOME_CATEGORIES.find(c => c.value === t.category)?.icon || '💰');
      const sign = isExpense ? '-' : '+';
      const cls = isExpense ? 'expense' : 'income';
      const typeBadge = isExpense
        ? `<span class="txn-type-badge ${t.expense_type}">${typeLabels[t.expense_type] || t.expense_type}</span>`
        : '';
      return `
        <div class="txn-item">
          <div class="txn-icon ${cls}">${icon}</div>
          <div class="txn-info">
            <div class="txn-category">${safeText(t.category)}</div>
            ${t.note ? `<div class="txn-note">${escapeHTML(t.note)}</div>` : ''}
            <div class="txn-date">${safeText(t.date)}</div>
          </div>
          ${typeBadge}
          <div class="txn-amount ${cls}">${sign} ¥${parseFloat(t.amount).toFixed(2)}</div>
          <button class="txn-delete" data-id="${safeText(t.id)}" data-kind="${safeText(t.kind)}" title="删除">🗑️</button>
        </div>`;
    }).join('');

    loadMoreBtn.classList.toggle('hidden', sliced.length < this.pageSize);

    // 删除事件
    container.querySelectorAll('.txn-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const kind = btn.dataset.kind;
        const confirmed = await ConfirmModal.show(`确定要删除这条${kind === 'expense' ? '支出' : '收入'}记录吗？`);
        if (confirmed) {
          const table = kind === 'expense' ? 'expenses' : 'income';
          const { error } = await supabase.from(table).delete().eq('id', id);
          if (!error) {
            Toast.show('已删除', 'success');
            await refreshHistory();
            if (typeof refreshDashboard === 'function') refreshDashboard();
            if (typeof refreshBudget === 'function') refreshBudget();
          }
        }
      });
    });
  },

  async loadMore() {
    this.page++;
    await this.load();
  }
};

async function refreshHistory() { await History.refresh(); }

// --- 历史页初始化 ---
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('history-search');
  const dateFrom = document.getElementById('history-date-from');
  const dateTo = document.getElementById('history-date-to');
  const typeFilter = document.getElementById('history-type-filter');
  const loadMoreBtn = document.getElementById('history-load-more');
  const exportBtn = document.getElementById('export-csv-btn');

  // 监听筛选条件变化
  [searchInput, dateFrom, dateTo, typeFilter].forEach(el => {
    if (el) el.addEventListener('input', () => refreshHistory());
  });
  if (typeFilter) typeFilter.addEventListener('change', () => refreshHistory());
  if (loadMoreBtn) loadMoreBtn.addEventListener('click', () => History.loadMore());
  if (exportBtn) exportBtn.addEventListener('click', () => ExportCSV.run());
});

// --- 确认弹窗（支持并发调用）---
const ConfirmModal = {
  _queue: [],

  show(message) {
    return new Promise(resolve => {
      this._queue.push(resolve);
      if (this._queue.length === 1) {
        this._showModal(message);
      }
    });
  },

  _showModal(message) {
    document.getElementById('confirm-modal-message').textContent = message;
    document.getElementById('confirm-modal').classList.remove('hidden');
  },

  _resolveAndNext(result) {
    const resolve = this._queue.shift();
    if (resolve) resolve(result);
    // 队列中还有等待的确认请求？暂不支持并发 Modal，仅消费队列
    while (this._queue.length > 0) {
      const next = this._queue.shift();
      next(false);
    }
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
