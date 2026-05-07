// 主入口 — 纯本地版本，无登录
let miniPieChartInstance = null;

const pageTitles = {
  dashboard: '首页', 'add-expense': '记录支出', 'add-income': '记录收入',
  history: '历史记录', charts: '统计图表', budget: '预算管理', sync: '数据管理'
};

async function initApp() {
  Router.init();
  window.addEventListener('hashchange', onPageChanged);

  document.querySelectorAll('.tab-item').forEach(tab => {
    tab.addEventListener('click', () => Router.go(tab.dataset.page));
  });

  window.addEventListener('hashchange', () => {
    if (location.hash === '#charts') initCharts();
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  Notifications.init();
  await refreshDashboard();
}

function onPageChanged() {
  const name = Router.currentPage || 'dashboard';
  document.getElementById('page-title').textContent = pageTitles[name] || name;
  if (name === 'dashboard') refreshDashboard();
  if (name === 'history') refreshHistory();
  if (name === 'sync') renderSyncPage();
}

// --- 仪表盘 ---
async function refreshDashboard() {
  if (Router.currentPage && Router.currentPage !== 'dashboard') return;

  const [todayExp, todayInc, monthExp, savings, byType, transactions] = await Promise.all([
    Stats.getTodayExpense(), Stats.getTodayIncome(), Stats.getMonthExpense(),
    Stats.getSavings(), Stats.getMonthExpenseByType(), Stats.getRecentTransactions(10)
  ]);

  document.getElementById('stat-today-expense').textContent = `¥ ${todayExp.toFixed(2)}`;
  document.getElementById('stat-today-income').textContent = `¥ ${todayInc.toFixed(2)}`;
  document.getElementById('stat-month-expense').textContent = `¥ ${monthExp.toFixed(2)}`;
  document.getElementById('stat-savings').textContent = `¥ ${savings.toFixed(2)}`;

  renderMiniPie(byType);
  renderRecentTransactions(transactions);
}

function renderMiniPie(data) {
  if (typeof Chart === 'undefined') return;
  const ctx = document.getElementById('mini-pie-chart');
  const legendEl = document.getElementById('mini-pie-legend');
  if (!ctx) return;

  if (miniPieChartInstance) miniPieChartInstance.destroy();
  const labels = { waste: '浪费', consumption: '消费', investment: '投资' };
  const colors = { waste: '#F97316', consumption: '#EF4444', investment: '#8B5CF6' };

  if (data.length === 0) {
    miniPieChartInstance = new Chart(ctx, { type: 'doughnut', data: { labels: ['暂无数据'], datasets: [{ data: [1], backgroundColor: ['#E5E7EB'] }] }, options: { plugins: { legend: { display: false } } } });
    legendEl.innerHTML = '<span style="color:#6B7280">本月暂无支出</span>';
    return;
  }
  miniPieChartInstance = new Chart(ctx, { type: 'doughnut', data: { labels: data.map(d => labels[d.type]||d.type), datasets: [{ data: data.map(d => d.amount), backgroundColor: data.map(d => colors[d.type]||'#6B7280') }] }, options: { plugins: { legend: { display: false } }, cutout: '65%' } });
  legendEl.innerHTML = data.map(d => `<span><span class="legend-dot" style="background:${colors[d.type]||'#6B7280'}"></span>${labels[d.type]||d.type} ¥${d.amount.toFixed(0)}</span>`).join('');
}

function renderRecentTransactions(txns) {
  const container = document.getElementById('recent-transactions');
  if (!container) return;
  if (txns.length === 0) { container.innerHTML = '<p class="empty-hint">暂无交易记录</p>'; return; }
  const typeLabels = { waste: '浪费', consumption: '消费', investment: '投资' };
  container.innerHTML = txns.map(t => {
    const isExp = t.kind === 'expense';
    const icon = isExp ? (EXPENSE_CATEGORIES.find(c => c.value === t.category)?.icon || '💸') : (INCOME_CATEGORIES.find(c => c.value === t.category)?.icon || '💰');
    const sign = isExp ? '-' : '+';
    const cls = isExp ? 'expense' : 'income';
    return `<div class="txn-item" onclick="Router.go('history')"><div class="txn-icon ${cls}">${icon}</div><div class="txn-info"><div class="txn-category">${safeText(t.category)}</div>${t.note?`<div class="txn-note">${escapeHTML(t.note)}</div>`:''}<div class="txn-date">${safeText(t.date)}</div></div>${isExp?`<span class="txn-type-badge ${t.expense_type}">${typeLabels[t.expense_type]||t.expense_type}</span>`:''}<div class="txn-amount ${cls}">${sign} ¥${parseFloat(t.amount).toFixed(2)}</div></div>`;
  }).join('');
}

function renderSyncPage() {
  const page = document.getElementById('page-sync');
  if (!page) return;
  const expCount = DB.getExpenses().length;
  const incCount = DB.getIncomes().length;
  page.innerHTML = `
    <div class="card" style="text-align:center">
      <div style="font-size:48px;margin-bottom:12px">💾</div>
      <div class="card-title">数据管理</div>
      <p style="color:#6B7280;margin-bottom:16px">${expCount} 条支出 | ${incCount} 条收入</p>
      <button class="btn btn-primary btn-full" onclick="SyncManager.exportJSON()">📤 导出备份</button>
      <button class="btn btn-secondary btn-full" style="margin-top:10px" onclick="SyncManager.importJSON()">📥 导入同步</button>
      <p style="font-size:12px;color:#9CA3AF;margin-top:12px">在A设备上导出 → 通过 AirDrop/微信 发送到B设备 → 在B设备上导入，即可完成同步</p>
    </div>`;
}

function escapeHTML(str) { if (!str) return ''; const el = document.createElement('span'); el.textContent = String(str); return el.innerHTML; }
function safeText(val) { return escapeHTML(String(val ?? '')); }

const Toast = {
  show(msg, type) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast ${type||''}`;
    el.classList.remove('hidden');
    clearTimeout(this._timer);
    this._timer = setTimeout(() => el.classList.add('hidden'), 2000);
  }
};

document.addEventListener('DOMContentLoaded', initApp);
