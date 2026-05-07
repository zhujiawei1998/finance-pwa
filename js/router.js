// 基于 hash 的简单路由
const Router = {
  currentPage: '',

  init() {
    window.addEventListener('hashchange', () => this.navigate());
    this.navigate();
  },

  navigate() {
    const hash = location.hash.replace('#', '') || 'dashboard';
    this.showPage(hash);
    this.currentPage = hash;
  },

  showPage(name) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    const page = document.getElementById(`page-${name}`);
    if (page) page.classList.remove('hidden');

    // 更新底部 tab 激活状态
    document.querySelectorAll('.tab-item').forEach(t => {
      t.classList.toggle('active', t.dataset.page === name);
    });
  },

  go(name) {
    location.hash = `#${name}`;
  }
};
