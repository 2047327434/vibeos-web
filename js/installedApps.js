/* ============================================
   Installed Apps Manager
   Save AI-generated apps for reuse
   ============================================ */

const InstalledApps = {
  _storeKey: 'vibeos_installed_apps',

  init() {
    if (!localStorage.getItem(this._storeKey)) {
      localStorage.setItem(this._storeKey, '[]');
    }
  },

  /** Save a generated app */
  save(appId, name, icon, html) {
    const apps = this.getAll();
    // Remove existing with same id
    const idx = apps.findIndex(a => a.id === appId);
    if (idx !== -1) apps.splice(idx, 1);
    apps.unshift({ id: appId, name, icon, html, installedAt: Date.now() });
    try {
      localStorage.setItem(this._storeKey, JSON.stringify(apps));
    } catch (e) {
      if (typeof Notification !== 'undefined') {
        Notification.show('保存失败', '存储空间不足，无法保存应用', 'warn');
      }
      console.error('InstalledApps save error:', e);
      return false;
    }
    // Refresh desktop icons
    if (typeof Desktop !== 'undefined' && Desktop._renderIcons) {
      Desktop._renderIcons();
    }
    return true;
  },

  /** Remove an installed app */
  remove(appId) {
    const apps = this.getAll().filter(a => a.id !== appId);
    try {
      localStorage.setItem(this._storeKey, JSON.stringify(apps));
    } catch (e) {
      console.error('InstalledApps remove error:', e);
    }
    // Close any open windows for this app
    const winId = 'installed-' + appId;
    if (typeof WindowManager !== 'undefined' && WindowManager.windows.has(winId)) {
      WindowManager.close(winId);
    }
    if (typeof Desktop !== 'undefined' && Desktop._renderIcons) {
      Desktop._renderIcons();
    }
  },

  /** Get installed app by id */
  get(appId) {
    return this.getAll().find(a => a.id === appId) || null;
  },

  /** Get all installed apps */
  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this._storeKey) || '[]');
    } catch (e) { return []; }
  },

  /** Check if app is installed */
  isInstalled(appId) {
    return this.getAll().some(a => a.id === appId);
  },
};
