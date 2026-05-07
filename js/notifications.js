// 通知模块 — 周日 14:00 检查
const Notifications = {

  init() {
    // 检查是否需要弹通知（每次打开 app 时触发）
    this.checkWeeklyReminder();

    // 请求通知权限（在用户交互时触发）
    this.maybeShowPermissionBanner();
  },

  async maybeShowPermissionBanner() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted' || Notification.permission === 'denied') return;
    try { if (localStorage.getItem('notification_permission_asked') === 'true') return; } catch (e) {}

    setTimeout(() => {
      const banner = document.getElementById('notification-banner');
      if (banner && Notification.permission === 'default') {
        banner.classList.remove('hidden');
      }
    }, 3000);
  },

  async requestPermission() {
    if (!('Notification' in window)) {
      Toast.show('您的设备不支持通知', 'error');
      return;
    }
    const result = await Notification.requestPermission();
    try { localStorage.setItem('notification_permission_asked', 'true'); } catch (e) {}
    document.getElementById('notification-banner').classList.add('hidden');
    if (result === 'granted') {
      Toast.show('通知已开启，每周日下午将收到提醒', 'success');
    } else {
      Toast.show('通知未开启。建议设置 iPhone 日历每周日 14:00 提醒查阅', 'warning');
    }
  },

  async checkWeeklyReminder() {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const now = new Date();
    if (now.getDay() !== 0 || now.getHours() < 14) return;

    const today = now.toISOString().split('T')[0];
    try {
      if (localStorage.getItem('last_notification_date') === today) return;
    } catch (e) { return; }

    const userId = Auth.currentUser?.id;
    if (!userId) return;

    const [weekExp, weekInc, savings] = await Promise.all([
      Stats.getWeekExpense(),
      Stats.getWeekIncome(),
      Stats.getSavings()
    ]);

    const body = `本周支出 ¥${weekExp.toFixed(0)} | 收入 ¥${weekInc.toFixed(0)} | 当前储蓄 ¥${savings.toFixed(0)}`;
    new Notification('📊 本周财务总结', {
      body,
      icon: '/icons/icon-192.png',
      tag: 'weekly-summary',
      renotify: true
    });

    try { localStorage.setItem('last_notification_date', today); } catch (e) { /* quota exceeded */ }
  }
};

// 通知权限横幅按钮
document.addEventListener('DOMContentLoaded', () => {
  const banner = document.getElementById('notification-banner');
  if (banner) {
    banner.querySelector('button')?.addEventListener('click', () => Notifications.requestPermission());
  }
});
