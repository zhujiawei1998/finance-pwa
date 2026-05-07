// 统计数据模块 — 日/周/月汇总 + 储蓄计算
const Stats = {

  async _sum(collection, dateFrom, dateTo) {
    const userId = Auth.currentUser?.id;
    if (!userId) return 0;
    let q = supabase.from(collection)
      .select('amount')
      .eq('user_id', userId)
      .gte('date', dateFrom);
    if (dateTo) q = q.lte('date', dateTo);
    const { data, error } = await q;
    if (error) { console.error(error); return 0; }
    return data.reduce((s, r) => s + parseFloat(r.amount), 0);
  },

  async _sumAllTime(collection) {
    const userId = Auth.currentUser?.id;
    if (!userId) return 0;
    const { data, error } = await supabase.from(collection)
      .select('amount')
      .eq('user_id', userId);
    if (error) { console.error(error); return 0; }
    return data.reduce((s, r) => s + parseFloat(r.amount), 0);
  },

  today() {
    const d = new Date();
    return d.toISOString().split('T')[0];
  },

  weekRange(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.setDate(diff));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return [mon.toISOString().split('T')[0], sun.toISOString().split('T')[0]];
  },

  monthRange(date) {
    const d = new Date(date);
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return [first.toISOString().split('T')[0], last.toISOString().split('T')[0]];
  },

  async getTodayExpense() { return this._sum('expenses', this.today(), this.today()); },
  async getTodayIncome()  { return this._sum('income', this.today(), this.today()); },

  async getMonthExpense(year, month) {
    const d = new Date(year ?? new Date().getFullYear(), month ?? new Date().getMonth());
    const [from, to] = this.monthRange(d);
    return this._sum('expenses', from, to);
  },
  async getMonthIncome(year, month) {
    const d = new Date(year ?? new Date().getFullYear(), month ?? new Date().getMonth());
    const [from, to] = this.monthRange(d);
    return this._sum('income', from, to);
  },

  async getSavings() {
    const totalIncome = await this._sumAllTime('income');
    const totalExpense = await this._sumAllTime('expenses');
    return totalIncome - totalExpense;
  },

  async getWeekExpense() {
    const [mon, sun] = this.weekRange(new Date());
    return this._sum('expenses', mon, sun);
  },
  async getWeekIncome() {
    const [mon, sun] = this.weekRange(new Date());
    return this._sum('income', mon, sun);
  },

  async getMonthExpenseByCategory(year, month) {
    const userId = Auth.currentUser?.id;
    if (!userId) return [];
    const d = new Date(year ?? new Date().getFullYear(), month ?? new Date().getMonth());
    const [from, to] = this.monthRange(d);
    const { data, error } = await supabase.from('expenses')
      .select('category, amount')
      .eq('user_id', userId)
      .gte('date', from)
      .lte('date', to);
    if (error) { console.error(error); return []; }
    const map = {};
    data.forEach(r => {
      map[r.category] = (map[r.category] || 0) + parseFloat(r.amount);
    });
    return Object.entries(map).map(([category, amount]) => ({ category, amount }));
  },

  async getMonthExpenseByType(year, month) {
    const userId = Auth.currentUser?.id;
    if (!userId) return [];
    const d = new Date(year ?? new Date().getFullYear(), month ?? new Date().getMonth());
    const [from, to] = this.monthRange(d);
    const { data, error } = await supabase.from('expenses')
      .select('expense_type, amount')
      .eq('user_id', userId)
      .gte('date', from)
      .lte('date', to);
    if (error) { console.error(error); return []; }
    const map = {};
    data.forEach(r => {
      map[r.expense_type] = (map[r.expense_type] || 0) + parseFloat(r.amount);
    });
    return Object.entries(map).map(([type, amount]) => ({ type, amount }));
  },

  async getMonthlyTrend(monthsCount = 6) {
    const userId = Auth.currentUser?.id;
    if (!userId) return [];
    const result = [];
    const now = new Date();
    for (let i = monthsCount - 1; i >= 0; i--) {
      const y = now.getFullYear();
      const m = now.getMonth() - i;
      const d = new Date(y, m, 1);
      const [from, to] = this.monthRange(d);
      const expense = await this._sum('expenses', from, to);
      const income = await this._sum('income', from, to);
      result.push({
        label: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        expense,
        income,
        savings: income - expense
      });
    }
    return result;
  },

  async getRecentTransactions(limit = 10) {
    const userId = Auth.currentUser?.id;
    if (!userId) return [];
    const { data: expenses } = await supabase.from('expenses')
      .select('id, amount, date, note, expense_type, category, created_at')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);
    const { data: incomes } = await supabase.from('income')
      .select('id, amount, date, note, category, created_at')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);

    const combined = [
      ...(expenses || []).map(e => ({ ...e, kind: 'expense' })),
      ...(incomes || []).map(i => ({ ...i, kind: 'income' }))
    ];
    combined.sort((a, b) => new Date(b.date) - new Date(a.date));
    return combined.slice(0, limit);
  }
};
