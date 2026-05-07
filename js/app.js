// 全局错误捕获
window.onerror = function(msg, url, line) {
  console.error('App error:', msg, url, line);
  var el = document.getElementById('global-error');
  if (el) { el.classList.remove('hidden'); el.textContent = '出错: ' + msg; }
};

// 主入口 — 连接所有模块
let miniPieChartInstance = null;

// 页面标题映射
const pageTitles = {
  dashboard: '首页',
  'add-expense': '记录支出',
  'add-income': '记录收入',
  history: '历史记录',
  charts: '统计图表',
  budget: '预算管理'
};

async function initApp() {
  initSupabase();
  if (!supabase) {
    document.body.innerHTML = '<div style="padding:40px;text-align:center;font-family:sans-serif"><h2>加载失败</h2><p>请检查网络连接后刷新页面</p></div>';
    return;
  }

  Offline.init();

  const ok = await Auth.init();
  if (!ok) {
    document.body.innerHTML = '<div style="padding:40px;text-align:center;font-family:sans-serif"><h2>连接失败</h2><p>请确认已在 Supabase 后台启用匿名登录后刷新页面</p></div>';
    return;
  }

  Router.init();
  window.addEventListener('hashchange', onPageChanged);

  document.querySelectorAll('.tab-item').forEach(tab => {
    tab.addEventListener('click', () => Router.go(tab.dataset.page));
  });

  window.addEventListener('hashchange', () => {
    if (location.hash === '#charts') initCharts();
  });

  Notifications.init();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  await refreshDashboard();
}

function onPageChanged() {
  const name = Router.currentPage || 'dashboard';
  document.getElementById('page-title').textContent = pageTitles[name] || name;
  if (name === 'dashboard') refreshDashboard();
  if (name === 'history') refreshHistory();
}

// --- 仪表盘渲染 ---
async function refreshDashboard() {
  if (!Auth.currentUser) return;
  if (Router.currentPage !== 'dashboard' && Router.currentPage !== '') return;

  const [todayExp, todayInc, monthExp, savings, byType, transactions] = await Promise.all([
    Stats.getTodayExpense(),
    Stats.getTodayIncome(),
    Stats.getMonthExpense(),
    Stats.getSavings(),
    Stats.getMonthExpenseByType(),
    Stats.getRecentTransactions(10)
  ]);

  document.getElementById('stat-today-expense').textContent = `¥ ${todayExp.toFixed(2)}`;
  document.getElementById('stat-today-income').textContent = `¥ ${todayInc.toFixed(2)}`;
  document.getElementById('stat-month-expense').textContent = `¥ ${monthExp.toFixed(2)}`;
  document.getElementById('stat-savings').textContent = `¥ ${savings.toFixed(2)}`;

  // 迷你饼图
  renderMiniPie(byType);

  // 近期交易
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
    miniPieChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: { labels: ['暂无数据'], datasets: [{ data: [1], backgroundColor: ['#E5E7EB'] }] },
      options: { plugins: { legend: { display: false } } }
    });
    legendEl.innerHTML = '<span style="color:#6B7280">本月暂无支出</span>';
    return;
  }

  miniPieChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(d => labels[d.type] || d.type),
      datasets: [{
        data: data.map(d => d.amount),
        backgroundColor: data.map(d => colors[d.type] || '#6B7280')
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      cutout: '65%'
    }
  });

  legendEl.innerHTML = data.map(d => {
    const lbl = labels[d.type] || d.type;
    const clr = colors[d.type] || '#6B7280';
    return `<span><span class="legend-dot" style="background:${clr}"></span>${lbl} ¥${d.amount.toFixed(0)}</span>`;
  }).join('');
}

function renderRecentTransactions(txns) {
  const container = document.getElementById('recent-transactions');
  if (!container) return;
  if (txns.length === 0) {
    container.innerHTML = '<p class="empty-hint">暂无交易记录</p>';
    return;
  }

  const typeLabels = { waste: '浪费', consumption: '消费', investment: '投资' };
  container.innerHTML = txns.map(t => {
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
      <div class="txn-item" data-id="${safeText(t.id)}" data-kind="${safeText(t.kind)}">
        <div class="txn-icon ${cls}">${icon}</div>
        <div class="txn-info">
          <div class="txn-category">${safeText(t.category)}</div>
          ${t.note ? `<div class="txn-note">${escapeHTML(t.note)}</div>` : ''}
          <div class="txn-date">${safeText(t.date)}</div>
        </div>
        ${typeBadge}
        <div class="txn-amount ${cls}">${sign} ¥${parseFloat(t.amount).toFixed(2)}</div>
      </div>`;
  }).join('');

  // 点击交易项跳转到历史页
  container.querySelectorAll('.txn-item').forEach(item => {
    item.addEventListener('click', () => Router.go('history'));
  });
}

function escapeHTML(str) {
  if (!str) return '';
  const el = document.createElement('span');
  el.textContent = String(str);
  return el.innerHTML;
}

function safeText(val) {
  return escapeHTML(String(val ?? ''));
}

// --- Toast ---
const Toast = {
  show(message, type = '') {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.className = `toast ${type}`;
    el.classList.remove('hidden');
    clearTimeout(this._timer);
    this._timer = setTimeout(() => el.classList.add('hidden'), 2000);
  }
};

// --- 启动 ---
document.addEventListener('DOMContentLoaded', initApp);
