// 认证模块 — 匿名自动登录，无需邮箱密码
const Auth = {
  currentUser: null,

  async init() {
    // 先尝试恢复已有 session
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      this.currentUser = session.user;
      return true;
    }
    // 匿名登录
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error('匿名登录失败:', error.message);
      return false;
    }
    this.currentUser = data.user;
    return true;
  }
};
