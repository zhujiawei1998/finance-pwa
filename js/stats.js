// 统计模块 — 基于本地数据
const Stats = {
  _filter(list, dateFrom, dateTo) {
    return list.filter(r => r.date >= dateFrom && r.date <= dateTo);
  },
  _sum(list) { return list.reduce((s, r) => s + parseFloat(r.amount), 0); },

  today() { return new Date().toISOString().split('T')[0]; },

  weekRange(d) {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.getFullYear(), d.getMonth(), diff);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return [mon.toISOString().split('T')[0], sun.toISOString().split('T')[0]];
  },

  monthRange(d) {
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return [first.toISOString().split('T')[0], last.toISOString().split('T')[0]];
  },

  async getTodayExpense() {
    const today = this.today();
    return this._sum(DB.getExpenses().filter(e => e.date === today));
  },
  async getTodayIncome() {
    const today = this.today();
    return this._sum(DB.getIncomes().filter(i => i.date === today));
  },

  async getMonthExpense(y, m) {
    const d = new Date(y ?? new Date().getFullYear(), m ?? new Date().getMonth());
    const [f, t] = this.monthRange(d);
    return this._sum(this._filter(DB.getExpenses(), f, t));
  },
  async getMonthIncome(y, m) {
    const d = new Date(y ?? new Date().getFullYear(), m ?? new Date().getMonth());
    const [f, t] = this.monthRange(d);
    return this._sum(this._filter(DB.getIncomes(), f, t));
  },

  async getSavings() {
    const totalInc = this._sum(DB.getIncomes());
    const totalExp = this._sum(DB.getExpenses());
    return totalInc - totalExp;
  },

  async getWeekExpense() {
    const [f, t] = this.weekRange(new Date());
    return this._sum(this._filter(DB.getExpenses(), f, t));
  },
  async getWeekIncome() {
    const [f, t] = this.weekRange(new Date());
    return this._sum(this._filter(DB.getIncomes(), f, t));
  },

  async getMonthExpenseByCategory(y, m) {
    const d = new Date(y ?? new Date().getFullYear(), m ?? new Date().getMonth());
    const [f, t] = this.monthRange(d);
    const map = {};
    this._filter(DB.getExpenses(), f, t).forEach(e => {
      map[e.category] = (map[e.category] || 0) + parseFloat(e.amount);
    });
    return Object.entries(map).map(([category, amount]) => ({ category, amount }));
  },

  async getMonthExpenseByType(y, m) {
    const d = new Date(y ?? new Date().getFullYear(), m ?? new Date().getMonth());
    const [f, t] = this.monthRange(d);
    const map = {};
    this._filter(DB.getExpenses(), f, t).forEach(e => {
      map[e.expense_type] = (map[e.expense_type] || 0) + parseFloat(e.amount);
    });
    return Object.entries(map).map(([type, amount]) => ({ type, amount }));
  },

  async getMonthlyTrend(monthsCount = 6) {
    const result = [];
    const now = new Date();
    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const [f, t] = this.monthRange(d);
      const expense = this._sum(this._filter(DB.getExpenses(), f, t));
      const income = this._sum(this._filter(DB.getIncomes(), f, t));
      result.push({
        label: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
        expense, income, savings: income - expense
      });
    }
    return result;
  },

  async getRecentTransactions(limit = 10) {
    const exps = DB.getExpenses().map(e => ({ ...e, kind: 'expense' }));
    const incs = DB.getIncomes().map(i => ({ ...i, kind: 'income' }));
    return [...exps, ...incs].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);
  }
};
