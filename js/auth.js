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
    // 注册成功后可能需要确认邮箱，取决于 Supabase 配置
    if (data.user) {
      this.currentUser = data.user;
      this.onLogin();
    }
    return { success: '注册成功！' + (data.session ? '' : '请查收确认邮件。') };
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    this.currentUser = data.user;
    this.onLogin();
    return { success: true };
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
