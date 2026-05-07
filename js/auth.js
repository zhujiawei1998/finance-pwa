// 自动登录 — 用设备 ID 生成唯一账号，无需用户操作
const Auth = {
  currentUser: null,

  async init() {
    // 复用已有 session
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      this.currentUser = session.user;
      return true;
    }

    // 生成/读取设备唯一 ID
    let deviceId = null;
    try { deviceId = localStorage.getItem('finance_device_id'); } catch(e) {}
    if (!deviceId) {
      deviceId = 'device_' + crypto.randomUUID();
      try { localStorage.setItem('finance_device_id', deviceId); } catch(e) {}
    }

    const email = deviceId + '@finance.local';
    const password = 'finance_app_2026';

    // 先尝试登录
    let { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (s) { this.currentUser = s.user; return true; }
    }

    // 登录失败则注册新账号
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      // 如果注册也失败（比如邮箱确认未关闭），尝试匿名登录作为兜底
      try {
        const { data: anonData } = await supabase.auth.signInAnonymously();
        if (anonData.user) { this.currentUser = anonData.user; return true; }
      } catch(e) {}
      console.error('自动登录失败:', signUpError.message);
      return false;
    }
    if (signUpData.session) {
      this.currentUser = signUpData.user;
      return true;
    }
    // 注册成功但需要邮箱确认——这种情况需要去 Supabase 关掉邮箱确认
    console.error('注册成功但需要邮箱确认，请在 Supabase 关闭 Confirm email');
    return false;
  }
};
