// 主入口 — 纯本地版本，无登录
let miniPieChartInstance = null;

const pageTitles = {
  dashboard: '首页', 'add-expense': '记录支出', 'add-income': '记录收入',
  history: '历史记录', charts: '统计图表', budget: '预算管理', sync: '数据管理',
  'claude-report': 'AI报告'
};

async function initApp() {
  // 绑定表单事件
  ExpenseForm.init();
  IncomeForm.init();

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

  // 启动自动同步
  initSupabase();
  if (supabase) {
    Sync.init().then(function() {
      refreshDashboard();
      if (typeof refreshBudget === 'function') refreshBudget();
    });
  }

  await refreshDashboard();
}

function onPageChanged() {
  const name = Router.currentPage || 'dashboard';
  document.getElementById('page-title').textContent = pageTitles[name] || name;
  if (name === 'dashboard') refreshDashboard();
  if (name === 'history') refreshHistory();
  if (name === 'sync') renderSyncPage();
  if (name === 'claude-report') initClaudeReport();
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

// --- AI 报告 (Claude 数据管道) ---
function initClaudeReport() {
  const btn = document.getElementById('gen-report-btn');
  if (btn) {
    btn.onclick = () => {
      btn.textContent = '⏳ 生成中...';
      btn.disabled = true;
      setTimeout(() => {
        renderReportFiles();
        btn.textContent = '🔄 重新生成';
        btn.disabled = false;
      }, 100);
    };
  }
  // 如果已经生成过，直接显示（保持在页面切换间）
  const container = document.getElementById('report-files');
  if (container && !container.classList.contains('hidden')) {
    return;
  }
}

function renderReportFiles() {
  const container = document.getElementById('report-files');
  if (!container) return;
  container.classList.remove('hidden');

  const files = ClaudeExport.getFiles();
  // 缓存供按钮使用
  window.__reportFiles = files;

  const totalExp = DB.getExpenses().length;
  const totalInc = DB.getIncomes().length;

  let html = `
    <div class="card" style="text-align:center;margin-bottom:12px">
      <p style="color:var(--text-secondary);font-size:14px">
        基于 <strong>${totalExp}</strong> 条支出 + <strong>${totalInc}</strong> 条收入 生成
      </p>
    </div>`;

  files.forEach((f, i) => {
    const preview = f.content.length > 500
      ? f.content.slice(0, 500) + '\n... (点击展开查看全文)'
      : f.content;
    html += `
      <div class="card report-file-card">
        <div class="report-file-header">
          <div>
            <div class="report-file-name">📄 ${escapeHTML(f.name)}</div>
            <div class="report-file-desc">${escapeHTML(f.desc)}</div>
            <div style="font-size:11px;color:var(--text-secondary);margin-top:2px">→ ${escapeHTML(f.path)}</div>
          </div>
        </div>
        <pre class="report-preview" data-file-index="${i}">${escapeHTML(preview)}</pre>
        <div class="report-actions">
          <button class="btn btn-primary download-btn" data-file-index="${i}">📥 下载</button>
          <button class="btn btn-secondary copy-btn" data-file-index="${i}">📋 复制</button>
          <button class="btn btn-secondary preview-btn" data-file-index="${i}">👁 预览</button>
        </div>
      </div>`;
  });

  html += `
    <div class="card" style="text-align:center;margin-top:12px">
      <button class="btn btn-primary btn-full" id="download-all-btn">📦 一键下载全部 (4个文件)</button>
      <p style="font-size:11px;color:var(--text-secondary);margin-top:8px">iOS: 每个文件会依次弹出保存。下载后请放入 claude-finance-agents 对应目录。</p>
    </div>`;

  container.innerHTML = html;

  // 绑定事件
  container.querySelectorAll('.download-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const f = window.__reportFiles[parseInt(this.dataset.fileIndex)];
      ClaudeExport.downloadFile(f.name, f.content, f.type);
    });
  });

  container.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const f = window.__reportFiles[parseInt(this.dataset.fileIndex)];
      ClaudeExport.copyContent(f.content);
    });
  });

  container.querySelectorAll('.preview-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const f = window.__reportFiles[parseInt(this.dataset.fileIndex)];
      ClaudeExport.previewFile(f.name, f.content, f.type);
    });
  });

  // 预览框点击展开/收起
  container.querySelectorAll('.report-preview').forEach(pre => {
    pre.addEventListener('click', function() {
      const idx = parseInt(this.dataset.fileIndex);
      const full = window.__reportFiles[idx].content;
      if (this.classList.contains('expanded')) {
        this.classList.remove('expanded');
        this.textContent = full.length > 500 ? full.slice(0, 500) + '\n... (点击展开查看全文)' : full;
      } else {
        this.classList.add('expanded');
        this.textContent = full;
      }
    });
  });

  const downloadAllBtn = document.getElementById('download-all-btn');
  if (downloadAllBtn) {
    downloadAllBtn.addEventListener('click', downloadAllReports);
  }
}

function downloadAllReports() {
  const files = window.__reportFiles || ClaudeExport.getFiles();
  let i = 0;
  function next() {
    if (i >= files.length) { Toast.show('4 个文件下载完成', 'success'); return; }
    ClaudeExport.downloadFile(files[i].name, files[i].content, files[i].type);
    i++;
    setTimeout(next, 600);
  }
  next();
}

document.addEventListener('DOMContentLoaded', initApp);
