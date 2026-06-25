/* ============================================
   VibeOS Dock - VibeOS Style
   Matching VibeOS Dock order and icons
   ============================================ */

const Dock = {
  items: [
    { id: 'files',      name: 'Files',     iconId: 'files',      action: 'openApp' },
    { id: 'notepad',    name: 'TextEdit',  iconId: 'notepad',    action: 'openApp' },
    { id: 'vibecode',   name: 'VibeCode',  iconId: 'vibecode',   action: 'openApp' },
    { id: 'terminal',   name: 'Terminal',  iconId: 'terminal',   action: 'openApp' },
    { id: 'browser',    name: 'Browser',   iconId: 'browser',    action: 'openApp' },
    { id: 'calculator', name: 'Calc',      iconId: 'calculator', action: 'openApp' },
    { id: 'music',      name: 'Music',     iconId: 'music',      action: 'openApp' },
    { id: null, separator: true },
    { id: 'sysmon',     name: 'SysMon',    iconId: 'sysmon',     action: 'openApp' },
    { id: 'imageview',  name: 'Viewer',    iconId: 'imageview',  action: 'openApp' },
    { id: 'snake',      name: 'Snake',     iconId: 'snake',      action: 'openApp' },
    { id: 'tetris',     name: 'Tetris',    iconId: 'tetris',     action: 'openApp' },
    { id: null, separator: true },
    { id: 'switcher',   name: 'Switcher',  iconId: 'switcher',   action: 'switcher' },
    { id: 'app-store',  name: 'App Store', iconId: 'app-store',  action: 'openApp' },
    { id: 'settings',   name: 'Settings',  iconId: 'settings',   action: 'openApp' },
  ],

  _running: new Set(),

  init() {
    this._render();
    this._setupEvents();
  },

  setRunning(appId, running) {
    if (running) this._running.add(appId);
    else this._running.delete(appId);
    this._updateIndicators();
  },

  setActive(appId) {
    document.querySelectorAll('.dock-item.active').forEach((el) => el.classList.remove('active'));
    if (appId) {
      const el = document.querySelector(`.dock-item[data-app-id="${appId}"]`);
      if (el) el.classList.add('active');
    }
  },

  _updateIndicators() {
    document.querySelectorAll('.dock-item').forEach((el) => {
      const appId = el.dataset.appId;
      if (!appId) return;
      el.classList.toggle('running', this._running.has(appId));
    });
  },

  _render() {
    const desktop = document.getElementById('desktop');
    if (!desktop) return;

    const dock = document.createElement('div');
    dock.id = 'dock';
    dock.setAttribute('role', 'toolbar');
    dock.setAttribute('aria-label', 'Dock');

    dock.innerHTML = this.items.map((item) => {
      if (item.separator) return '<div class="dock-separator" aria-hidden="true"></div>';
      return `
        <div class="dock-item" data-app-id="${item.id}" title="${item.name}" role="button" tabindex="0" aria-label="${item.name}">
          <span class="dock-label" aria-hidden="true">${item.name}</span>
          <span class="dock-icon">${Icons.app(item.iconId || item.id)}</span>
          <span class="dock-indicator" aria-hidden="true"></span>
        </div>`;
    }).join('');
    desktop.appendChild(dock);
  },

  _setupEvents() {
    document.querySelectorAll('.dock-item').forEach((item) => {
      const appId = item.dataset.appId;
      if (!appId) return;
      const activate = () => {
        if (appId === 'switcher') WindowManager.showAppSwitcher();
        else Desktop.openApp(appId);
      };
      item.addEventListener('click', activate);
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate();
        }
      });
    });
  },
};
