// 自动同步 — 先保本地数据，后台推送到 Supabase
var Sync = {
  ready: false,
  _userId: null,

  async init() {
    if (!supabase) return console.warn('Sync: Supabase 未加载');

    try {
      var ok = await this._auth();
      if (!ok) return console.warn('Sync: 自动登录失败，离线模式运行');
    } catch(e) {
      console.warn('Sync: 登录异常', e.message);
      return;
    }

    this.ready = true;
    console.log('Sync: 已连接');

    // 拉取远程数据合并（仅新增，不覆盖本地）
    try { await this._pull(); } catch(e) { console.warn('Sync: 拉取失败', e.message); }

    // 推送本地数据
    try { await this._push(); } catch(e) { console.warn('Sync: 推送失败', e.message); }
  },

  async _auth() {
    // 复用已有 session
    var { data: { session } } = await supabase.auth.getSession();
    if (session) { this._userId = session.user.id; return true; }

    // 设备 ID 自动登录
    var deviceId = null;
    try { deviceId = localStorage.getItem('finance_device_id'); } catch(e) {}
    if (!deviceId) {
      deviceId = 'd_' + crypto.randomUUID().slice(0, 8);
      try { localStorage.setItem('finance_device_id', deviceId); } catch(e) {}
    }

    var email = deviceId + '@sync.local';
    var pwd = 'p_' + deviceId + '_2026';

    // 尝试登录
    var { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({ email: email, password: pwd });
    if (!loginErr && loginData.user) {
      this._userId = loginData.user.id;
      return true;
    }

    // 注册
    var { data: signData, error: signErr } = await supabase.auth.signUp({ email: email, password: pwd });
    if (signErr) {
      console.warn('Sync: 注册失败', signErr.message);
      return false;
    }
    if (signData.user) {
      if (signData.session) {
        this._userId = signData.user.id;
        return true;
      }
      // 需要邮箱确认
      console.warn('Sync: 请在 Supabase 关闭邮箱确认 (Authentication > Confirm sign up)');
      return false;
    }
    return false;
  },

  // 从 Supabase 拉取新数据合并（只新增，不删除不覆盖）
  async _pull() {
    if (!this._userId) return;

    var [expRes, incRes] = await Promise.all([
      supabase.from('expenses').select('id,amount,date,note,expense_type,category,created_at').eq('user_id', this._userId),
      supabase.from('income').select('id,amount,date,note,category,created_at').eq('user_id', this._userId)
    ]);

    var remoteExp = expRes.data || [];
    var remoteInc = incRes.data || [];

    if (remoteExp.length === 0 && remoteInc.length === 0) return;

    var localExp = DB._expenses();
    var localInc = DB._incomes();
    var localExpIds = {};
    var localIncIds = {};

    localExp.forEach(function(e) { localExpIds[e.id] = true; });
    localInc.forEach(function(i) { localIncIds[i.id] = true; });

    var added = 0;
    remoteExp.forEach(function(e) {
      if (!localExpIds[e.id]) {
        localExp.push({ id: e.id, amount: e.amount, date: e.date, note: e.note||'', expense_type: e.expense_type, category: e.category, created_at: e.created_at });
        added++;
      }
    });
    remoteInc.forEach(function(i) {
      if (!localIncIds[i.id]) {
        localInc.push({ id: i.id, amount: i.amount, date: i.date, note: i.note||'', category: i.category, created_at: i.created_at });
        added++;
      }
    });

    if (added > 0) {
      DB._saveExpenses(localExp);
      DB._saveIncomes(localInc);
      console.log('Sync: 从云端同步了 ' + added + ' 条记录');
    }
  },

  // 推送本地独有数据到 Supabase
  async _push() {
    if (!this._userId) return;

    var localExp = DB._expenses();
    var localInc = DB._incomes();

    var [expRes, incRes] = await Promise.all([
      supabase.from('expenses').select('id').eq('user_id', this._userId),
      supabase.from('income').select('id').eq('user_id', this._userId)
    ]);

    var remoteExpIds = {};
    var remoteIncIds = {};
    (expRes.data || []).forEach(function(e) { remoteExpIds[e.id] = true; });
    (incRes.data || []).forEach(function(i) { remoteIncIds[i.id] = true; });

    for (var i = 0; i < localExp.length; i++) {
      var e = localExp[i];
      if (!remoteExpIds[e.id]) {
        await supabase.from('expenses').insert({
          id: e.id, user_id: this._userId, amount: e.amount, date: e.date,
          note: e.note||'', expense_type: e.expense_type, category: e.category, created_at: e.created_at
        });
      }
    }
    for (var j = 0; j < localInc.length; j++) {
      var inc = localInc[j];
      if (!remoteIncIds[inc.id]) {
        await supabase.from('income').insert({
          id: inc.id, user_id: this._userId, amount: inc.amount, date: inc.date,
          note: inc.note||'', category: inc.category, created_at: inc.created_at
        });
      }
    }
  },

  // 实时同步 — 新增
  addExpense: function(e) { if (this.ready) this._insert('expenses', e); },
  addIncome: function(i) { if (this.ready) this._insert('income', i); },

  async _insert(table, row) {
    try {
      var payload = { id: row.id, user_id: this._userId, amount: row.amount, date: row.date, note: row.note||'', category: row.category, created_at: row.created_at };
      if (table === 'expenses') payload.expense_type = row.expense_type;
      await supabase.from(table).insert(payload);
    } catch(err) { /* ignore - will sync on next push */ }
  },

  // 实时同步 — 删除
  deleteExpense: function(id) { if (this.ready) this._del('expenses', id); },
  deleteIncome: function(id) { if (this.ready) this._del('income', id); },

  async _del(table, id) {
    try { await supabase.from(table).delete().eq('id', id); } catch(e) {}
  }
};
