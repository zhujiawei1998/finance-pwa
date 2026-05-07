// 认证模块
const Auth = {
  currentUser: null,

  async init() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      this.currentUser = session.user;
      this.onLogin();
    } else {
      this.onLogout();
    }
  },

  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (data.session) {
      this.currentUser = data.user;
      this.onLogin();
      return { success: true };
    }
    // 需要邮箱确认
    return { success: '注册成功！请查收确认邮件后重新登录。' };
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Invalid login')) return { error: '邮箱或密码错误' };
      if (error.message.includes('Email not confirmed')) return { error: '邮箱尚未确认，请先点击邮件中的确认链接' };
      return { error: error.message };
    }
    this.currentUser = data.user;
    this.onLogin();
    return { success: true };
  },

  async resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/#auth'
    });
    if (error) return { error: error.message };
    return { success: '重置密码邮件已发送，请查收' };
  },

  async signOut() {
    await supabase.auth.signOut();
    this.currentUser = null;
    this.onLogout();
    Router.go('auth');
  },

  onLogin() {
    document.getElementById('auth-page').classList.add('hidden');
    document.getElementById('app-shell').classList.remove('hidden');
    document.getElementById('bottom-tab-bar').classList.remove('hidden');
    if (this.currentUser) {
      document.getElementById('user-email-display').textContent = this.currentUser.email;
    }
    Router.go('dashboard');
  },

  onLogout() {
    document.getElementById('auth-page').classList.remove('hidden');
    document.getElementById('app-shell').classList.add('hidden');
    document.getElementById('bottom-tab-bar').classList.add('hidden');
  }
};
