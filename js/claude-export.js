// Claude Finance Agents 报告生成器
// 生成 CONTEXT.md / SNAPSHOT.md / monthly-summary.json / budget.json
const ClaudeExport = {

  // --- 数据采集 ---
  _allExpenses() { return DB.getExpenses(); },
  _allIncomes() { return DB.getIncomes(); },
  _budgets() { return DB.getBudgets(); },

  _monthRange(y, m) {
    const d = new Date(y, m);
    const first = new Date(y, m, 1).toISOString().split('T')[0];
    const last = new Date(y, m + 1, 0).toISOString().split('T')[0];
    return [first, last];
  },

  _sum(list) { return list.reduce((s, r) => s + parseFloat(r.amount), 0); },

  _filterMonth(list, y, m) {
    const [f, t] = this._monthRange(y, m);
    return list.filter(r => r.date >= f && r.date <= t);
  },

  _groupBy(list, key) {
    const map = {};
    list.forEach(r => {
      const k = r[key] || '未知';
      map[k] = (map[k] || 0) + parseFloat(r.amount);
    });
    return map;
  },

  // --- 月度趋势 (6个月) ---
  _monthlyTrend(monthsCount = 6) {
    const result = [];
    const now = new Date();
    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const label = `${y}-${String(m + 1).padStart(2, '0')}`;
      const monthExp = this._filterMonth(this._allExpenses(), y, m);
      const monthInc = this._filterMonth(this._allIncomes(), y, m);
      const totalExp = this._sum(monthExp);
      const totalInc = this._sum(monthInc);
      const expByCat = this._groupBy(monthExp, 'category');
      const incByCat = this._groupBy(monthInc, 'category');
      result.push({
        month: label, total_income: Math.round(totalInc * 100) / 100,
        total_expense: Math.round(totalExp * 100) / 100,
        savings: Math.round((totalInc - totalExp) * 100) / 100,
        savings_rate: totalInc > 0 ? Math.round((totalInc - totalExp) / totalInc * 10000) / 100 : 0,
        expense_by_category: expByCat,
        income_by_category: incByCat,
        transaction_count: monthExp.length + monthInc.length
      });
    }
    return result;
  },

  // --- 本月明细 ---
  _currentMonth() {
    const now = new Date();
    return this._filterMonthReport(now.getFullYear(), now.getMonth());
  },

  _filterMonthReport(y, m) {
    const exps = this._filterMonth(this._allExpenses(), y, m);
    const incs = this._filterMonth(this._allIncomes(), y, m);
    const totalExp = this._sum(exps);
    const totalInc = this._sum(incs);
    const expByCat = this._groupBy(exps, 'category');
    const incByCat = this._groupBy(incs, 'category');
    const expByType = this._groupBy(exps, 'expense_type');
    return { totalExp: Math.round(totalExp * 100) / 100, totalInc: Math.round(totalInc * 100) / 100,
      savings: Math.round((totalInc - totalExp) * 100) / 100,
      savingsRate: totalInc > 0 ? Math.round((totalInc - totalExp) / totalInc * 100) : 0,
      expByCat, incByCat, expByType, expCount: exps.length, incCount: incs.length };
  },

  // --- 预算合规 ---
  _budgetCompliance(monthData) {
    const budgets = this._budgets();
    if (budgets.length === 0) return [];
    return EXPENSE_CATEGORIES.map(cat => {
      const budget = budgets.find(b => b.category === cat.value);
      const spent = monthData.expByCat[cat.value] || 0;
      const limit = budget ? parseFloat(budget.amount) : 0;
      const rate = limit > 0 ? Math.round(spent / limit * 100) : (spent > 0 ? 100 : 0);
      let status = '未设预算';
      if (limit > 0) {
        if (rate < 80) status = '安全';
        else if (rate <= 100) status = '警告';
        else status = '超支';
      }
      return { category: cat.value, budget: limit, spent: Math.round(spent * 100) / 100, rate, status };
    });
  },

  // --- 生涯总计 ---
  _lifetime() {
    const totalInc = this._sum(this._allIncomes());
    const totalExp = this._sum(this._allExpenses());
    return { totalIncome: Math.round(totalInc * 100) / 100,
      totalExpense: Math.round(totalExp * 100) / 100,
      savings: Math.round((totalInc - totalExp) * 100) / 100,
      savingsRate: totalInc > 0 ? Math.round((totalInc - totalExp) / totalInc * 100) : 0 };
  },

  // --- 生成文件内容 ---

  generateCONTEXT() {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const cur = this._currentMonth();
    const lt = this._lifetime();
    const trend = this._monthlyTrend(6);

    // 本月前三支出分类
    const topExpCats = Object.entries(cur.expByCat).sort((a, b) => b[1] - a[1]).slice(0, 3);

    // 月均（基于有数据的月份）
    const monthsWithData = trend.filter(m => m.total_expense > 0 || m.total_income > 0);
    const avgExpense = monthsWithData.length > 0
      ? Math.round(monthsWithData.reduce((s, m) => s + m.total_expense, 0) / monthsWithData.length * 100) / 100 : 0;
    const avgIncome = monthsWithData.length > 0
      ? Math.round(monthsWithData.reduce((s, m) => s + m.total_income, 0) / monthsWithData.length * 100) / 100 : 0;

    return `# 财务上下文

> 由「个人记账」PWA 自动生成于 ${dateStr}
> 放置位置：\`claude-finance-agents/knowledge/finance/CONTEXT.md\`

## 收入

| 来源 | 本月 | 月均 (近${monthsWithData.length}月) |
|------|------|------|
${INCOME_CATEGORIES.map(c => {
  const thisMonth = cur.incByCat[c.value] || 0;
  return `| ${c.icon} ${c.value} | ¥ ${thisMonth.toFixed(2)} | - |`;
}).join('\n')}
| **合计** | **¥ ${cur.totalInc.toFixed(2)}** | **¥ ${avgIncome.toFixed(2)}** |

## 支出

| 分类 | 本月 | 月均 |
|------|------|------|
${EXPENSE_CATEGORIES.map(c => {
  const thisMonth = cur.expByCat[c.value] || 0;
  return `| ${c.icon} ${c.value} | ¥ ${thisMonth.toFixed(2)} | - |`;
}).join('\n')}
| **合计** | **¥ ${cur.totalExp.toFixed(2)}** | **¥ ${avgExpense.toFixed(2)}** |

## 支出构成

| 类型 | 本月金额 | 占比 |
|------|---------|------|
| 🗑️ 浪费 | ¥ ${(cur.expByType['waste'] || 0).toFixed(2)} | ${cur.totalExp > 0 ? Math.round((cur.expByType['waste'] || 0) / cur.totalExp * 100) : 0}% |
| 🛒 消费 | ¥ ${(cur.expByType['consumption'] || 0).toFixed(2)} | ${cur.totalExp > 0 ? Math.round((cur.expByType['consumption'] || 0) / cur.totalExp * 100) : 0}% |
| 📈 投资 | ¥ ${(cur.expByType['investment'] || 0).toFixed(2)} | ${cur.totalExp > 0 ? Math.round((cur.expByType['investment'] || 0) / cur.totalExp * 100) : 0}% |

## 储蓄

- **本月储蓄率**: ${cur.savingsRate}%
- **生涯储蓄率**: ${lt.savingsRate}%
- **当前净资产**: ¥ ${lt.savings.toFixed(2)}

## 月度趋势 (近6月)

| 月份 | 收入 | 支出 | 储蓄 | 储蓄率 |
|------|------|------|------|--------|
${trend.map(m => `| ${m.month} | ¥ ${m.total_income.toFixed(2)} | ¥ ${m.total_expense.toFixed(2)} | ¥ ${m.savings.toFixed(2)} | ${m.savings_rate}% |`).join('\n')}

## 退休账户

<!-- 手动填写你的退休账户余额 -->
- EPF / 401k / 养老金: ¥ _______
- 其他投资账户: ¥ _______
- 目标退休年龄: _______
`;
  },

  generateSNAPSHOT() {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const cur = this._currentMonth();
    const lt = this._lifetime();
    const budgets = this._budgets();
    const compliance = this._budgetCompliance(cur);

    // 超支警报
    const overspent = compliance.filter(c => c.status === '超支');
    const warnings = compliance.filter(c => c.status === '警告');

    // 趋势
    const trend = this._monthlyTrend(6);
    const lastMonth = trend[trend.length - 2];
    const savingsTrend = lastMonth ? cur.savingsRate - lastMonth.savings_rate : 0;

    return `# 财务快照

> 生成于 ${dateStr}
> 放置位置：\`claude-finance-agents/knowledge/finance/SNAPSHOT.md\`

## 📊 本月概览 (${now.getFullYear()}年${now.getMonth()+1}月)

| 指标 | 数值 |
|------|------|
| 总收入 | ¥ ${cur.totalInc.toFixed(2)} |
| 总支出 | ¥ ${cur.totalExp.toFixed(2)} |
| 净储蓄 | ¥ ${cur.savings.toFixed(2)} |
| 储蓄率 | ${cur.savingsRate}% ${savingsTrend > 0 ? '↑' : savingsTrend < 0 ? '↓' : '→'} |
| 交易笔数 | ${cur.expCount} 笔支出 + ${cur.incCount} 笔收入 |
| 生涯净资产 | ¥ ${lt.savings.toFixed(2)} |

## ⚠️ 警报

${overspent.length === 0 && warnings.length === 0
  ? '本月无警报。所有预算分类均在安全范围内。\n'
  : ''}
${overspent.map(c => `- 🔴 **${c.category}**: 已超支！预算 ¥${c.budget.toFixed(2)}，实际 ¥${c.spent.toFixed(2)} (${c.rate}%)\n`).join('')}
${warnings.map(c => `- 🟡 **${c.category}**: 接近预算上限，已用 ${c.rate}%\n`).join('')}

## 📈 预算执行

| 分类 | 预算 | 已用 | 使用率 | 状态 |
|------|------|------|--------|------|
${compliance.map(c => `| ${c.category} | ${c.budget > 0 ? '¥ ' + c.budget.toFixed(2) : '—'} | ¥ ${c.spent.toFixed(2)} | ${c.rate}% | ${c.status} |`).join('\n')}

## 💡 本月要点

<!-- AI 代理分析后会自动填充此区域 -->

## 📋 待办

<!-- AI 代理分析后会自动填充此区域 -->
`;
  },

  generateMonthlySummary() {
    const trend = this._monthlyTrend(6);
    const budgets = this._budgets();
    const cur = this._currentMonth();
    const compliance = this._budgetCompliance(cur);

    return JSON.stringify({
      generated: new Date().toISOString(),
      source: '个人记账 PWA',
      period: { months: 6 },
      monthly: trend,
      current_month_summary: {
        expense_by_category: cur.expByCat,
        income_by_category: cur.incByCat,
        expense_by_type: cur.expByType
      },
      budget_compliance: compliance.map(c => ({
        category: c.category,
        budget: c.budget,
        spent: c.spent,
        compliance_rate: c.rate,
        status: c.status
      })),
      budgets: budgets.map(b => ({ category: b.category, monthly_limit: parseFloat(b.amount), id: b.id }))
    }, null, 2);
  },

  generateBudgetJSON() {
    const budgets = this._budgets();
    const cur = this._currentMonth();
    const compliance = this._budgetCompliance(cur);

    return JSON.stringify({
      generated: new Date().toISOString(),
      source: '个人记账 PWA',
      budgets: budgets.map(b => {
        const comp = compliance.find(c => c.category === b.category);
        return {
          category: b.category,
          monthly_limit: parseFloat(b.amount),
          current_spent: comp ? comp.spent : 0,
          compliance_rate: comp ? comp.rate : 0,
          status: comp ? comp.status : 'unknown'
        };
      })
    }, null, 2);
  },

  // --- 文件列表 ---
  getFiles() {
    return [
      { name: 'CONTEXT.md', content: this.generateCONTEXT(), type: 'text/markdown',
        desc: '财务上下文 — 收入/支出/储蓄完整画像', path: 'knowledge/finance/CONTEXT.md' },
      { name: 'SNAPSHOT.md', content: this.generateSNAPSHOT(), type: 'text/markdown',
        desc: '财务快照 — 本月仪表板 + 警报', path: 'knowledge/finance/SNAPSHOT.md' },
      { name: 'monthly-summary.json', content: this.generateMonthlySummary(), type: 'application/json',
        desc: '月度汇总 — 结构化数据供代理计算', path: 'data/finance/monthly-summary.json' },
      { name: 'budget.json', content: this.generateBudgetJSON(), type: 'application/json',
        desc: '预算配置与执行情况', path: 'data/finance/budget.json' }
    ];
  },

  // --- iOS 兼容的文件下载 ---
  downloadFile(name, content, type) {
    const blob = new Blob([content], { type: `${type};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    // iOS Safari 有时不触发 download，延迟清理
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 500);
  },

  // 预览文件内容（在新标签页打开 — iOS 后备方案）
  previewFile(name, content, type) {
    const blob = new Blob([content], { type: `${type};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  // 复制到剪贴板
  async copyContent(content) {
    try {
      await navigator.clipboard.writeText(content);
      Toast.show('已复制到剪贴板', 'success');
    } catch (e) {
      // iOS 降级方案
      const ta = document.createElement('textarea');
      ta.value = content;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      Toast.show('已复制到剪贴板', 'success');
    }
  }
};
