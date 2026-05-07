// 自动同步模块 — 设备ID自动登录 + 数据同步
const Sync = {
  ready: false,

  async init() {
    if (!supabase) return;

    // 自动登录
    var ok = await this._autoAuth();
    if (!ok) return;

    this.ready = true;

    // 先从 Supabase 拉取数据合并到本地
    await this.pull();

    // 推送本地独有数据到 Supabase
    await this.push();
  },

  // 设备ID自动注册/登录
  async _autoAuth() {
    // 复用已有 session
    var { data: { session } } = await supabase.auth.getSession();
    if (session) return true;

    // 获取或创建设备ID
    var deviceId = null;
    try { deviceId = localStorage.getItem('finance_device_id'); } catch(e) {}
    if (!deviceId) {
      deviceId = 'dev_' + crypto.randomUUID().slice(0, 8);
      try { localStorage.setItem('finance_device_id', deviceId); } catch(e) {}
    }

    var email = deviceId + '@finance.app';
    var password = '__finance_sync_2026__';

    // 尝试登录
    var { error } = await supabase.auth.signInWithPassword({ email: email, password: password });
    if (!error) return true;

    // 注册
    var { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email: email, password: password });
    if (signUpError) {
      console.warn('自动注册失败:', signUpError.message);
      return false;
    }
    // 有 session = 注册成功无需确认
    if (signUpData.session) return true;
    // 需要邮箱确认 — 提示用户
    console.warn('请在 Supabase 关闭邮箱确认: Authentication > Settings > Confirm email');
    return false;
  },

  // 从 Supabase 拉取数据，合并到本地
  async pull() {
    var userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;

    // 获取所有支出
    var { data: expenses } = await supabase.from('expenses').select('*').eq('user_id', userId);
    // 获取所有收入
    var { data: incomes } = await supabase.from('income').select('*').eq('user_id', userId);

    // 合并到本地（保留本地独有的，Supabase 有而本地没有的加入）
    var localExp = DB.getExpenses();
    var localInc = DB.getIncomes();
    var localExpIds = new Set(localExp.map(function(e) { return e.id; }));
    var localIncIds = new Set(localInc.map(function(i) { return i.id; }));

    var newExp = [];
    var newInc = [];

    (expenses || []).forEach(function(e) {
      if (!localExpIds.has(e.id)) newExp.push({
        id: e.id, amount: e.amount, date: e.date, note: e.note || '',
        expense_type: e.expense_type, category: e.category, created_at: e.created_at
      });
    });
    (incomes || []).forEach(function(i) {
      if (!localIncIds.has(i.id)) newInc.push({
        id: i.id, amount: i.amount, date: i.date, note: i.note || '',
        category: i.category, created_at: i.created_at
      });
    });

    if (newExp.length > 0 || newInc.length > 0) {
      var allExp = localExp.concat(newExp);
      var allInc = localInc.concat(newInc);
      try { localStorage.setItem('finance_expenses', JSON.stringify(allExp)); } catch(e) {}
      try { localStorage.setItem('finance_incomes', JSON.stringify(allInc)); } catch(e) {}
    }
  },

  // 推送本地独有数据到 Supabase
  async push() {
    var userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;

    var { data: remoteExp } = await supabase.from('expenses').select('id').eq('user_id', userId);
    var { data: remoteInc } = await supabase.from('income').select('id').eq('user_id', userId);
    var remoteExpIds = new Set((remoteExp || []).map(function(e) { return e.id; }));
    var remoteIncIds = new Set((remoteInc || []).map(function(i) { return i.id; }));

    var localExp = DB.getExpenses();
    var localInc = DB.getIncomes();

    for (var i = 0; i < localExp.length; i++) {
      var e = localExp[i];
      if (!remoteExpIds.has(e.id)) {
        await supabase.from('expenses').insert({
          id: e.id, user_id: userId, amount: e.amount, date: e.date,
          note: e.note, expense_type: e.expense_type, category: e.category,
          created_at: e.created_at || new Date().toISOString()
        });
      }
    }
    for (var j = 0; j < localInc.length; j++) {
      var inc = localInc[j];
      if (!remoteIncIds.has(inc.id)) {
        await supabase.from('income').insert({
          id: inc.id, user_id: userId, amount: inc.amount, date: inc.date,
          note: inc.note, category: inc.category,
          created_at: inc.created_at || new Date().toISOString()
        });
      }
    }
  },

  // 新增支出时同步到 Supabase
  async addExpense(e) {
    if (!this.ready) return;
    var userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;
    await supabase.from('expenses').insert({
      id: e.id, user_id: userId, amount: e.amount, date: e.date,
      note: e.note, expense_type: e.expense_type, category: e.category,
      created_at: e.created_at
    });
  },

  // 新增收入时同步
  async addIncome(i) {
    if (!this.ready) return;
    var userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;
    await supabase.from('income').insert({
      id: i.id, user_id: userId, amount: i.amount, date: i.date,
      note: i.note, category: i.category,
      created_at: i.created_at
    });
  },

  // 删除时同步
  async deleteExpense(id) {
    if (!this.ready) return;
    await supabase.from('expenses').delete().eq('id', id);
  },
  async deleteIncome(id) {
    if (!this.ready) return;
    await supabase.from('income').delete().eq('id', id);
  }
};
