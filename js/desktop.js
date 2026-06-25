/* ============================================
   VibeOS Desktop Manager
   Desktop icons, context menu, wallpaper
   ============================================ */

const Desktop = {
  /** Desktop icons definition */
  icons: [
    { id: 'computer',    name: 'Hard Disk',     iconId: 'computer',   action: 'openApp', appTarget: 'files' },
    { id: 'files',       name: 'Files',         iconId: 'files',      action: 'openApp' },
    { id: 'notepad',     name: 'TextEdit',      iconId: 'notepad',    action: 'openApp' },
    { id: 'terminal',    name: 'Terminal',      iconId: 'terminal',   action: 'openApp' },
    { id: 'browser',     name: 'Browser',       iconId: 'browser',    action: 'openApp' },
    { id: 'vibecode',    name: 'VibeCode',      iconId: 'vibecode',   action: 'openApp' },
    { id: 'calculator',  name: 'Calculator',    iconId: 'calculator', action: 'openApp' },
    { id: 'music',       name: 'Music',         iconId: 'music',      action: 'openApp' },
    { id: 'sysmon',      name: 'SysMon',        iconId: 'sysmon',     action: 'openApp' },
    { id: 'snake',       name: 'Snake',         iconId: 'snake',      action: 'openApp' },
    { id: 'app-store',   name: 'App Store',     iconId: 'app-store',  action: 'openApp' },
    { id: 'settings',    name: 'Settings',      iconId: 'settings',   action: 'openApp' },
    { id: 'llm-api',     name: 'LLM API',       iconId: 'llm-api',    action: 'openApp' },
    { id: 'recycle',     name: 'Trash',         iconId: 'trash',      action: 'openApp', appTarget: 'files' },
  ],

  /** Currently selected icon id */
  selectedId: null,

  /** Context menu element */
  _contextMenu: null,
  _dragInfo: null,
  _selectedIds: new Set(),
  _iconPositions: {},

  init() {
    this._loadIconPositions();
    this._renderIcons();
    this._setupContextMenu();
    this._setupClickOutside();
    this._setupIconDrag();
  },

  /** Open an app by id */
  openApp(appId) {
    WindowManager.openApp(appId);
  },

  /** Render desktop icons */
  _renderIcons() {
    const container = document.getElementById('desktop-icons');
    if (!container) return;
    container.innerHTML = '';

    // Built-in icons
    this.icons.forEach((item) => {
      const iconEl = document.createElement('div');
      iconEl.className = 'desktop-icon';
      iconEl.setAttribute('data-icon-id', item.id);
      iconEl.setAttribute('role', 'button');
      iconEl.setAttribute('tabindex', '0');
      iconEl.setAttribute('aria-label', item.name);
      iconEl.innerHTML = `
        <div class="icon-img">${Icons.app(item.iconId || item.id)}</div>
        <div class="icon-label">${item.name}</div>
      `;

      // Apply saved drag position (relative offsets from flow layout)
      const pos = this._iconPositions[item.id];
      if (pos) {
        iconEl.style.position = 'relative';
        iconEl.style.left = pos.x + 'px';
        iconEl.style.top = pos.y + 'px';
      }

      // Single click: select
      iconEl.addEventListener('click', (e) => {
        this._selectIcon(item.id);
        e.stopPropagation();
      });

      // Double click: open
      iconEl.addEventListener('dblclick', (e) => {
        if (item.action === 'openApp') {
          this.openApp(item.appTarget || item.id);
        }
        e.stopPropagation();
      });

      // Keyboard: Enter/Space to open
      iconEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (item.action === 'openApp') {
            this.openApp(item.appTarget || item.id);
          }
        }
      });

      container.appendChild(iconEl);
    });

    // Installed apps
    InstalledApps.getAll().forEach(app => {
      const el = document.createElement('div');
      el.className = 'desktop-icon installed-app';
      el.setAttribute('data-installed-id', app.id);
      const iconSvg = Icons.app('custom-app');
      const safeName = (app.name || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
      el.innerHTML = `<div class="icon-img">${iconSvg}</div><div class="icon-label">${safeName}</div>`;
      el.addEventListener('dblclick', () => {
        const data = InstalledApps.get(app.id);
        if (data && data.html && data.html.length > 100) {
          const winId = 'installed-' + app.id;
          // Skip create if window already exists
          if (WindowManager.windows.has(winId)) {
            WindowManager.focus(winId);
            return;
          }
          WindowManager.create(winId, app.name, iconSvg, {
            type: 'iframe', srcdoc: data.html
          });
          Dock.setRunning(winId, true);
        } else {
          Notification.show('加载失败', '应用数据损坏，请重新生成', 'warn');
        }
      });
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault(); e.stopPropagation();
        this._showInstalledContextMenu(e.clientX, e.clientY, app.id);
      });
      container.appendChild(el);
    });
  },

  /** Select a desktop icon */
  _selectIcon(id) {
    // Deselect previous
    if (this.selectedId) {
      const prev = document.querySelector(`[data-icon-id="${this.selectedId}"]`);
      if (prev) prev.classList.remove('selected');
    }

    this.selectedId = id;
    const el = document.querySelector(`[data-icon-id="${id}"]`);
    if (el) el.classList.add('selected');
  },

  /** Deselect all icons */
  _deselectAll() {
    if (this.selectedId) {
      const el = document.querySelector(`[data-icon-id="${this.selectedId}"]`);
      if (el) el.classList.remove('selected');
      this.selectedId = null;
    }
  },

  /** Setup desktop context menu */
  _setupContextMenu() {
    const desktop = document.getElementById('desktop');
    if (!desktop) return;

    // Create context menu element
    this._contextMenu = document.createElement('div');
    this._contextMenu.className = 'context-menu';
    this._contextMenu.setAttribute('role', 'menu');
    this._contextMenu.innerHTML = `
      <div class="menu-item" data-action="refresh" role="menuitem"><span class="menu-icon">${Icons.glyph('refresh')}</span><span class="menu-label">刷新</span></div>
      <div class="menu-separator" role="separator"></div>
      <div class="menu-item" data-action="ai-generate" role="menuitem"><span class="menu-icon">${Icons.glyph('bolt')}</span><span class="menu-label">AI 生成应用…</span></div>
      <div class="menu-item" data-action="new-notepad" role="menuitem"><span class="menu-icon">${Icons.glyph('note')}</span><span class="menu-label">新建文本文档</span></div>
      <div class="menu-item" data-action="new-folder" role="menuitem"><span class="menu-icon">${Icons.glyph('folder')}</span><span class="menu-label">新建文件夹</span></div>
      <div class="menu-separator" role="separator"></div>
      <div class="menu-item" data-action="wallpaper" role="menuitem"><span class="menu-icon">${Icons.glyph('image')}</span><span class="menu-label">更改壁纸</span></div>
      <div class="menu-item" data-action="settings" role="menuitem"><span class="menu-icon">${Icons.glyph('gear')}</span><span class="menu-label">显示设置</span></div>
    `;
    desktop.appendChild(this._contextMenu);

    // Right click handler
    desktop.addEventListener('contextmenu', (e) => {
      // Only show on desktop (not on windows)
      if (e.target.closest('.window') || e.target.closest('#dock') || e.target.closest('#menubar')) return;

      e.preventDefault();
      this._showContextMenu(e.clientX, e.clientY);
    });

    // Context menu actions
    this._contextMenu.addEventListener('click', (e) => {
      const item = e.target.closest('.menu-item');
      if (!item) return;

      const action = item.getAttribute('data-action');
      this._handleContextAction(action);
      this._hideContextMenu();
    });
  },

  /** Show context menu at position */
  _showContextMenu(x, y) {
    const menu = this._contextMenu;
    const menuW = 200;
    const menuH = menu.scrollHeight || 200;

    // Adjust position to stay on screen
    if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 10;
    if (y + menuH > window.innerHeight) y = window.innerHeight - menuH - 10;

    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.classList.add('visible');
  },

  /** Hide context menu */
  _hideContextMenu() {
    if (this._contextMenu) {
      this._contextMenu.classList.remove('visible');
    }
  },

  /** Handle context menu actions */
  _handleContextAction(action) {
    switch (action) {
      case 'refresh':
        // 仅刷新桌面图标，不重载整个系统
        this._renderIcons();
        Notification?.show?.('桌面已刷新', '已重新渲染图标', 'refresh', 1500);
        break;
      case 'new-notepad':
        this.openApp('notepad');
        break;
      case 'new-folder':
        // TODO: Virtual filesystem integration
        Notification?.show?.('提示', '文件夹功能将在文件系统模块中实现', 'folder');
        break;
      case 'wallpaper':
        this.openApp('settings');
        break;
      case 'ai-generate':
        // 走 Spotlight，体验更一致
        Menubar?._toggleSpotlight?.();
        break;
      case 'settings':
        this.openApp('settings');
        break;
    }
  },

  /** Setup click outside to hide context menu and deselect */
  _setupClickOutside() {
    // Close any context menus on click outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.context-menu')) {
        this._hideContextMenu();
        // Also remove any standalone context menus (from installed apps)
        document.querySelectorAll('.context-menu').forEach(m => {
          if (m !== this._contextMenu) m.remove();
        });
      }
      if (e.target.id === 'desktop' || e.target.id === 'desktop-icons') this._deselectAll();
    });
    // Also close on scroll or escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { this._hideContextMenu(); document.querySelectorAll('.context-menu').forEach(m => { if (m !== this._contextMenu) m.remove(); }); }
    });
  },

  /** Render installed apps as desktop icons */
  // _renderInstalledApps removed — dead code, icons rendered in _renderIcons

  _showInstalledContextMenu(x, y, appId) {
    this._hideContextMenu();
    const menu = document.createElement('div');
    menu.className = 'context-menu visible';
    menu.setAttribute('role', 'menu');
    menu.style.left = x + 'px'; menu.style.top = y + 'px';
    menu.innerHTML = `
      <div class="menu-item" data-action="uninstall-${appId}" role="menuitem"><span class="menu-icon">${Icons.glyph('trash')}</span><span class="menu-label">卸载</span></div>
      <div class="menu-item" data-action="edit-${appId}" role="menuitem"><span class="menu-icon">${Icons.glyph('wrench')}</span><span class="menu-label">AI 编辑</span></div>
    `;
    document.body.appendChild(menu);
    menu.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.dataset.action;
        if (action.startsWith('uninstall-')) {
          InstalledApps.remove(action.replace('uninstall-', ''));
          this._renderIcons();
          Notification.show('已卸载', '应用已从桌面移除', 'trash');
        } else if (action.startsWith('edit-')) {
          const id = 'installed-' + action.replace('edit-', '');
          WindowManager.openAppEditor(id);
        }
        this._hideContextMenu();
      });
    });
  },

  /* === Icon Drag (single icon only) === */
  _loadIconPositions() {
    try { this._iconPositions = JSON.parse(localStorage.getItem('vibeos_icon_positions')||'{}'); } catch(e) { this._iconPositions = {}; }
  },
  _saveIconPositions() {
    localStorage.setItem('vibeos_icon_positions', JSON.stringify(this._iconPositions));
  },

  _setupIconDrag() {
    const desktop = document.getElementById('desktop');
    if (!desktop) return;
    const self = this;

    desktop.addEventListener('mousedown', (e) => {
      const icon = e.target.closest('.desktop-icon');
      if (!icon) return;
      const id = icon.dataset.iconId || icon.dataset.installedId || icon.dataset.appId;
      if (!id) return;
      self._dragInfo = { type: 'icon', startX: e.clientX, startY: e.clientY, el: icon, id, moved: false };
    });

    document.addEventListener('mousemove', (e) => {
      if (!self._dragInfo || self._dragInfo.type !== 'icon') return;
      const dx = e.clientX - self._dragInfo.startX;
      const dy = e.clientY - self._dragInfo.startY;
      if (!self._dragInfo.moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      self._dragInfo.moved = true;
      self._dragInfo.el.style.position = 'relative';
      self._dragInfo.el.style.left = (self._dragInfo.el.offsetLeft + dx - (self._dragInfo._lastDx || 0)) + 'px';
      self._dragInfo.el.style.top = (self._dragInfo.el.offsetTop + dy - (self._dragInfo._lastDy || 0)) + 'px';
      self._dragInfo.el.style.zIndex = '10';
      self._dragInfo._lastDx = dx;
      self._dragInfo._lastDy = dy;
    });

    document.addEventListener('mouseup', () => {
      if (!self._dragInfo) return;
      if (self._dragInfo.moved && self._dragInfo.id) {
        self._iconPositions[self._dragInfo.id] = {
          x: parseInt(self._dragInfo.el.style.left) || 0,
          y: parseInt(self._dragInfo.el.style.top) || 0
        };
        self._saveIconPositions();
      }
      if (self._dragInfo.el) {
        self._dragInfo.el.style.position = '';
        self._dragInfo.el.style.left = '';
        self._dragInfo.el.style.top = '';
        self._dragInfo.el.style.zIndex = '';
      }
      self._dragInfo = null;
    });
  },
};
