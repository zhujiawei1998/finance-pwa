// 本地数据存储 — 全部基于 localStorage
const DB = {
  _expenses() { try { return JSON.parse(localStorage.getItem('finance_expenses') || '[]'); } catch(e) { return []; } },
  _saveExpenses(arr) { try { localStorage.setItem('finance_expenses', JSON.stringify(arr)); } catch(e) {} },
  _incomes() { try { return JSON.parse(localStorage.getItem('finance_incomes') || '[]'); } catch(e) { return []; } },
  _saveIncomes(arr) { try { localStorage.setItem('finance_incomes', JSON.stringify(arr)); } catch(e) {} },
  _budgets() { try { return JSON.parse(localStorage.getItem('finance_budgets') || '[]'); } catch(e) { return []; } },
  _saveBudgets(arr) { try { localStorage.setItem('finance_budgets', JSON.stringify(arr)); } catch(e) {} },

  // --- 支出 ---
  addExpense(e) {
    const list = this._expenses();
    e.id = crypto.randomUUID();
    e.created_at = new Date().toISOString();
    list.push(e);
    this._saveExpenses(list);
    Sync.addExpense(e);
    return e;
  },
  getExpenses() { return this._expenses(); },
  deleteExpense(id) {
    const list = this._expenses().filter(e => e.id !== id);
    this._saveExpenses(list);
    Sync.deleteExpense(id);
  },

  // --- 收入 ---
  addIncome(i) {
    const list = this._incomes();
    i.id = crypto.randomUUID();
    i.created_at = new Date().toISOString();
    list.push(i);
    this._saveIncomes(list);
    Sync.addIncome(i);
    return i;
  },
  getIncomes() { return this._incomes(); },
  deleteIncome(id) {
    const list = this._incomes().filter(i => i.id !== id);
    this._saveIncomes(list);
    Sync.deleteIncome(id);
  },

  // --- 预算 ---
  getBudgets() { return this._budgets(); },
  saveBudget(b) {
    const list = this._budgets().filter(x => x.category !== b.category);
    b.id = crypto.randomUUID();
    list.push(b);
    this._saveBudgets(list);
  },
  deleteBudget(id) {
    this._saveBudgets(this._budgets().filter(x => x.id !== id));
  },

  // --- 全量导出/导入（用于设备间同步）---
  exportAll() {
    return JSON.stringify({
      version: 1,
      exported_at: new Date().toISOString(),
      expenses: this.getExpenses(),
      incomes: this.getIncomes(),
      budgets: this.getBudgets()
    }, null, 2);
  },
  importAll(jsonStr) {
    const data = JSON.parse(jsonStr);
    if (!data.expenses && !data.incomes) throw new Error('无效的数据文件');
    // 合并而非覆盖（保留两边的数据）
    const oldExp = this._expenses();
    const oldInc = this._incomes();
    const mergedExp = [...oldExp, ...(data.expenses || [])];
    const mergedInc = [...oldInc, ...(data.incomes || [])];
    // 去重（按 id）
    const seenExp = new Set();
    const seenInc = new Set();
    this._saveExpenses(mergedExp.filter(e => { const ok = !seenExp.has(e.id); seenExp.add(e.id); return ok; }));
    this._saveIncomes(mergedInc.filter(i => { const ok = !seenInc.has(i.id); seenInc.add(i.id); return ok; }));
    // 预算直接覆盖
    if (data.budgets) this._saveBudgets(data.budgets);
  }
};
