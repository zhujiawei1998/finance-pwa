// 离线模块 — IndexedDB 离线队列 + 在线/离线检测
const Offline = {
  db: null,

  init() {
    this.initDB();
    this.initBanner();
    this.initListeners();
  },

  async initDB() {
    return new Promise((resolve) => {
      const req = indexedDB.open('finance-offline', 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('queue')) {
          db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = (e) => {
        this.db = e.target.result;
        this.flushQueue();
        resolve();
      };
      req.onerror = () => resolve();
    });
  },

  initBanner() {
    const banner = document.createElement('div');
    banner.id = 'offline-banner';
    banner.classList.add('hidden');
    banner.textContent = '📡 当前离线 — 数据将在恢复网络后同步';
    document.body.insertBefore(banner, document.body.firstChild);
  },

  initListeners() {
    window.addEventListener('online', () => {
      document.getElementById('offline-banner')?.classList.add('hidden');
      Toast.show('网络已恢复，正在同步...', 'success');
      this.flushQueue();
    });
    window.addEventListener('offline', () => {
      document.getElementById('offline-banner')?.classList.remove('hidden');
    });
    if (!navigator.onLine) {
      document.getElementById('offline-banner')?.classList.remove('hidden');
    }
  },

  async enqueue(operation) {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction('queue', 'readwrite');
        const store = tx.objectStore('queue');
        store.add({ ...operation, created_at: new Date().toISOString() });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (e) {
        reject(e);
      }
    });
  },

  async flushQueue() {
    if (!this.db || !navigator.onLine) return;

    const items = await new Promise((resolve) => {
      const tx = this.db.transaction('queue', 'readonly');
      const req = tx.objectStore('queue').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    if (items.length === 0) return;

    for (const item of items) {
      try {
        if (item.operation === 'insert_expense') {
          const { error } = await supabase.from('expenses').insert(item.payload);
          if (error) throw error;
        } else if (item.operation === 'insert_income') {
          const { error } = await supabase.from('income').insert(item.payload);
          if (error) throw error;
        }
        // 逐条删除已成功的项
        await new Promise((resolve) => {
          const tx = this.db.transaction('queue', 'readwrite');
          tx.objectStore('queue').delete(item.id);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
      } catch (e) {
        console.warn('离线同步单条失败:', e);
        // 失败项保留在队列中，下次继续尝试
      }
    }
  }
};
