/* ============================================
   VibeOS Menubar - VibeOS Style + Spotlight Search
   ============================================ */

const Menubar = {
  _activeMenu: null,
  _clockInterval: null,
  _spotlight: null,
  _spotlightTimer: null,

  init() {
    this._render();
    this._setupEvents();
    this._updateClock();
    this._clockInterval = setInterval(() => this._updateClock(), 1000);
    // Global shortcut: Cmd+Space for spotlight
    document.addEventListener('keydown', (e) => {
      if (e.metaKey && e.key === ' ') { e.preventDefault(); this._toggleSpotlight(); }
      if (e.key === 'Escape') this._closeSpotlight();
    });
  },

  _menus: {
    vibeos: {
      items: [
        { label: 'About VibeOS…', action: 'about' },
        { separator: true },
        { label: 'LLM 设置…', action: 'openLLMSettings' },
        { label: 'AI Chat…', action: 'openAIChat' },
        { label: 'System Preferences…', action: 'openSettings' },
        { separator: true },
        { label: 'Shut Down…', action: 'shutdown' },
      ],
    },
    File: {
      items: [
        { label: 'New Window', shortcut: '⌘N', action: 'newWindow' },
        { separator: true },
        { label: 'Close Window', shortcut: '⌘W', action: 'closeWindow' },
      ],
    },
    Edit: {
      items: [
        { label: 'Cut', shortcut: '⌘X', action: 'noop' },
        { label: 'Copy', shortcut: '⌘C', action: 'noop' },
        { label: 'Paste', shortcut: '⌘V', action: 'noop' },
        { label: 'Select All', shortcut: '⌘A', action: 'noop' },
      ],
    },
  },

  _render() {
    const desktop = document.getElementById('desktop');
    if (!desktop) return;

    const menubar = document.createElement('div');
    menubar.id = 'menubar';
    menubar.setAttribute('role', 'menubar');
    menubar.setAttribute('aria-label', '菜单栏');
    menubar.innerHTML = `
      <div class="menubar-left" role="none">
        <div class="menubar-apple" title="搜索应用 / 生成应用 (⌘Space)" onclick="Menubar._toggleSpotlight()" role="button" tabindex="0" aria-label="Spotlight 搜索"><span class="apple-logo" aria-hidden="true">${Icons.glyph('apple')}</span></div>
        <div class="menubar-item active-app" data-menu="vibeos" role="menuitem" tabindex="0" aria-label="VibeOS 菜单">VibeOS</div>
        <div class="menubar-item" data-menu="File" role="menuitem" tabindex="0" aria-label="文件菜单">File</div>
        <div class="menubar-item" data-menu="Edit" role="menuitem" tabindex="0" aria-label="编辑菜单">Edit</div>
      </div>
      <div class="menubar-right" role="none">
        <span class="menubar-status-item icon-btn" id="spotlight-btn" onclick="Menubar._toggleSpotlight()" title="搜索 (⌘Space)" role="button" tabindex="0" aria-label="Spotlight 搜索"><span class="status-icon" aria-hidden="true">${Icons.glyph('search')}</span></span>
        <span class="menubar-status-item icon-btn" id="notif-icon" onclick="Menubar._toggleNotifications(event)" title="通知中心" role="button" tabindex="0" aria-label="通知中心"><span class="status-icon" aria-hidden="true">${Icons.glyph('bell')}</span><span id="notif-badge" class="notif-badge" style="display:none;" aria-hidden="true"></span></span>
        <span class="menubar-status-item icon-btn" id="diag-btn" onclick="VibeOS._toggleDiagnostics()" title="系统诊断" role="button" tabindex="0" aria-label="系统诊断"><span class="status-icon" aria-hidden="true">${Icons.glyph('wrench')}</span></span>
        <span class="menubar-status-item menubar-date" id="menubar-date" aria-live="off"></span>
        <span class="menubar-status-item menubar-clock" id="menubar-clock" aria-live="off"></span>
      </div>
    `;
    desktop.appendChild(menubar);

    // Build spotlight overlay (hidden by default)
    this._buildSpotlight(desktop);
    this._buildNotificationPanel(desktop);
  },

  /* Notification Center */
  _notifPanel: null,

  _buildNotificationPanel(desktop) {
    const panel = document.createElement('div');
    panel.className = 'notif-panel';
    panel.style.cssText = 'display:none;position:fixed;top:36px;right:8px;width:340px;max-height:70vh;background:rgba(255,255,255,0.95);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.15);z-index:5001;overflow:hidden;border:1px solid rgba(0,0,0,0.06);';
    panel.innerHTML = `<div style="padding:12px 16px;font-weight:600;font-size:14px;border-bottom:1px solid #e0e0e0;display:flex;justify-content:space-between;align-items:center;"><span style="display:inline-flex;align-items:center;gap:8px;"><span style="display:inline-flex;width:18px;height:18px;color:#1d1d1f;">${Icons.glyph('bell')}</span>通知中心</span><span style="font-size:12px;color:#007aff;cursor:pointer;" onclick="Notification._history=[];Menubar._refreshNotifications();">清除</span></div><div id="notif-list" style="max-height:60vh;overflow-y:auto;"></div>`;
    desktop.appendChild(panel);
    this._notifPanel = panel;
  },

  _toggleNotifications(e) {
    e?.stopPropagation();
    if (!this._notifPanel) return;
    if (this._notifPanel.style.display === 'block') { this._notifPanel.style.display = 'none'; return; }
    this._notifPanel.style.display = 'block';
    this._refreshNotifications();
    this._closeAllMenus();
  },

  _refreshNotifications() {
    const list = document.getElementById('notif-list');
    if (!list) return;
    const history = Notification?.getHistory?.() || [];
    if (history.length === 0) { list.innerHTML = '<div style="padding:24px;text-align:center;color:#999;font-size:13px;">暂无通知</div>'; return; }
    // 通知图标按类型选用配色
    const colorOf = (name) => {
      if (typeof name !== 'string') return '#0a84ff';
      const n = name.toLowerCase();
      if (n.includes('warn') || n.includes('exclaim')) return '#ff9f0a';
      if (n.includes('cross') || n.includes('error') || n.includes('fail') || n.includes('ban')) return '#ff453a';
      if (n.includes('check') || n.includes('ok') || n.includes('success')) return '#30d158';
      if (n.includes('trash')) return '#ff453a';
      return '#0a84ff';
    };
    list.innerHTML = history.map(n => {
      const ago = Math.floor((Date.now()-n.time)/60000);
      const ts = ago<1?'刚刚':ago<60?`${ago}分钟前`:`${Math.floor(ago/60)}小时前`;
      const isSvg = (typeof n.icon === 'string' && n.icon.trim().startsWith('<svg'));
      const ic = isSvg ? n.icon : Icons.resolveGlyph(n.icon || 'info');
      const color = colorOf(n.icon || 'info');
      return `
        <div class="notif-row" style="display:flex;gap:12px;padding:12px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;align-items:flex-start;">
          <span class="notif-icon-wrap" style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:${color}1a;color:${color};flex-shrink:0;">
            <span style="display:inline-flex;width:18px;height:18px;align-items:center;justify-content:center;">${ic}</span>
          </span>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;color:#1d1d1f;line-height:1.3;">${n.title || ''}</div>
            <div style="color:#3c3c43;font-size:12px;line-height:1.4;margin-top:2px;word-break:break-word;">${n.body || ''}</div>
            <div style="color:#8e8e93;font-size:11px;margin-top:4px;">${ts}</div>
          </div>
        </div>`;
    }).join('');
  },

  /* ==========================================
     Spotlight Search
     ========================================== */
  _buildSpotlight(desktop) {
    const overlay = document.createElement('div');
    overlay.id = 'spotlight-overlay';
    overlay.className = 'spotlight-hidden';
    overlay.setAttribute('role', 'search');
    overlay.setAttribute('aria-label', 'Spotlight 搜索');
    overlay.innerHTML = `
      <div class="spotlight-panel">
        <div class="spotlight-bar">
          <span style="display:inline-flex;width:22px;height:22px;margin-right:12px;color:var(--color-text-tertiary);flex-shrink:0;">${Icons.glyph('search')}</span>
          <input id="spotlight-input" class="spotlight-input" type="text" placeholder="搜索应用 · 输入名称生成新应用…" autocomplete="off" aria-label="搜索">
          <span class="spotlight-esc">esc</span>
        </div>
        <div id="spotlight-results" class="spotlight-results"></div>
        <div id="spotlight-hint" class="spotlight-hint">输入应用名称搜索 · 找不到时回车可让 AI 生成</div>
      </div>
    `;
    desktop.appendChild(overlay);
    this._spotlight = overlay;

    const input = overlay.querySelector('#spotlight-input');
    input.addEventListener('input', () => this._onSpotlightInput(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); this._closeSpotlight(); }
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this._closeSpotlight(); });
  },

  _toggleSpotlight() {
    if (!this._spotlight) return;
    if (this._spotlight.classList.contains('spotlight-open')) {
      this._closeSpotlight(); return;
    }
    this._spotlight.classList.add('spotlight-open');
    this._spotlight.classList.remove('spotlight-hidden');
    const input = this._spotlight.querySelector('#spotlight-input');
    if (input) { input.value = ''; input.focus(); }
    this._showInstalledApps();
    this._closeAllMenus();
  },

  _closeSpotlight() {
    if (this._spotlight) {
      this._spotlight.classList.remove('spotlight-open');
      this._spotlight.classList.add('spotlight-hidden');
    }
    clearTimeout(this._spotlightTimer);
  },

  _showInstalledApps() {
    const apps = AppRegistry.getAll();
    const resultsEl = this._spotlight.querySelector('#spotlight-results');
    const hintEl = this._spotlight.querySelector('#spotlight-hint');
    hintEl.textContent = '已安装应用 — 点击打开';
    resultsEl.innerHTML = apps.map(a => `
      <div class="spotlight-result" data-app-id="${a.id}" style="display:flex;align-items:center;gap:14px;padding:10px 18px;cursor:pointer;font-size:14px;color:var(--color-text-primary);" role="button" tabindex="0">
        <span style="width:44px;height:44px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">${Icons.app(a.iconId || a.id)}</span>
        <span style="font-weight:500;flex:1;">${a.name}</span>
        <span style="color:var(--color-text-tertiary);font-size:12px;">${a.category}</span>
      </div>
    `).join('');
    this._bindResultClicks(resultsEl);
  },

  _onSpotlightInput(query) {
    clearTimeout(this._spotlightTimer);
    const resultsEl = this._spotlight.querySelector('#spotlight-results');
    const hintEl = this._spotlight.querySelector('#spotlight-hint');
    const input = this._spotlight.querySelector('#spotlight-input');

    if (!query) { this._showInstalledApps(); return; }

    // 1. Show installed matches immediately
    const apps = AppRegistry.getAll().filter(a =>
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.description.toLowerCase().includes(query.toLowerCase())
    );
    let html = '';
    if (apps.length > 0) {
      hintEl.textContent = `已安装 (${apps.length} 个匹配)`;
      html = apps.map(a => `
        <div class="spotlight-result" data-app-id="${a.id}" style="display:flex;align-items:center;gap:14px;padding:10px 18px;cursor:pointer;font-size:14px;color:var(--color-text-primary);" role="button" tabindex="0">
          <span style="width:44px;height:44px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">${Icons.app(a.iconId || a.id)}</span>
          <span style="font-weight:500;flex:1;">${a.name}</span>
          <span style="color:var(--color-text-tertiary);font-size:12px;">${a.category}</span>
        </div>`).join('');
    }

    // 2. Debounced AI search for more suggestions
    if (query.length >= 2) {
      hintEl.textContent = (apps.length > 0 ? `已安装 (${apps.length}) · ` : '') + 'AI 搜索中…';
      resultsEl.innerHTML = html + `<div style="padding:12px 16px;color:var(--color-text-tertiary);font-size:13px;text-align:center;display:flex;align-items:center;justify-content:center;gap:6px;"><span style="display:inline-flex;width:14px;height:14px;color:var(--color-text-tertiary);">${Icons.glyph('hourglass')}</span>AI 正在搜索…</div>`;
      this._bindResultClicks(resultsEl);

      this._spotlightTimer = setTimeout(() => this._aiSearch(query, apps, html), 1200);
    } else {
      resultsEl.innerHTML = html;
      this._bindResultClicks(resultsEl);
    }

    // Enter key: generate app
    input.onkeydown = (e) => {
      if (e.key === 'Enter' && query.length >= 2) {
        this._closeSpotlight();
        this._generateAppFromQuery(query);
      }
    };
  },

  /** Call LLM for app search suggestions */
  async _aiSearch(query, installedApps, installedHtml) {
    const resultsEl = this._spotlight.querySelector('#spotlight-results');
    const hintEl = this._spotlight.querySelector('#spotlight-hint');
    const input = this._spotlight.querySelector('#spotlight-input');
    if (!resultsEl) return;

    // Abort if query changed since timer was set
    if (input.value.trim() !== query) return;

    try {
      const config = VibeOSConfig.llm;
      const resp = await fetch(`${config.apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
        body: JSON.stringify({
          model: config.model,
          messages: [{
            role: 'user',
            content: `用户搜索："${query}"。列出5个最相关的应用名称和一句话描述，用JSON数组格式：[{"name":"应用名","desc":"描述","icon":"emoji"}]。只输出JSON数组，不要其他内容。`
          }],
          max_tokens: 500, temperature: 0.3, stream: false
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!resp.ok) throw new Error('API error');

      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content || '';
      // Parse JSON array or fallback to text parsing
      let suggestions = [];
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) suggestions = JSON.parse(jsonMatch[0]);
      } catch (e) {
        // Fallback: parse lines
        suggestions = content.split('\n').filter(l => l.includes('name') || l.includes('"'))
          .map(l => { try { return JSON.parse(l.trim().replace(/,$/,'')); } catch(e) { return null; } })
          .filter(Boolean);
      }

      if (suggestions.length === 0) {
        // Show generic suggestion
        const html = installedHtml + `
          <div style="margin:4px 0;border-top:1px solid var(--color-border-light);"></div>
          <div class="spotlight-result ai-suggest" data-query="${query}" style="display:flex;align-items:center;gap:14px;padding:10px 18px;cursor:pointer;font-size:14px;color:var(--color-accent);" role="button" tabindex="0">
            <span style="width:44px;height:44px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">${Icons.app('vibecode')}</span>
            <span style="font-weight:500;">AI 生成 "${query}"</span>
          </div>`;
        hintEl.textContent = (installedApps.length > 0 ? `已安装 (${installedApps.length}) · ` : '') + 'AI 建议';
        resultsEl.innerHTML = html;
      } else {
        const aiHtml = suggestions.map((s, i) => {
          const sIc = Icons.fromEmoji(s.icon) ? Icons.app(Icons.fromEmoji(s.icon)) : Icons.app('generic');
          return `
          <div class="spotlight-result ai-suggest" data-query="${s.name}" style="display:flex;align-items:center;gap:14px;padding:10px 18px;cursor:pointer;font-size:14px;color:var(--color-text-primary);" role="button" tabindex="0">
            <span style="width:44px;height:44px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">${sIc}</span>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:500;">${s.name}</div>
              <div style="font-size:12px;color:var(--color-text-tertiary);">${s.desc || ''}</div>
            </div>
          </div>`;
        }).join('');
        hintEl.textContent = (installedApps.length > 0 ? `已安装 (${installedApps.length}) · ` : '') + `AI 建议 (${suggestions.length})`;
        resultsEl.innerHTML = installedHtml + '<div style="margin:4px 0;border-top:1px solid var(--color-border-light);"></div>' + aiHtml;
      }
    } catch (e) {
      // AI search failed — show basic option
      const html = installedHtml + `
        <div style="margin:4px 0;border-top:1px solid var(--color-border-light);"></div>
        <div class="spotlight-result ai-suggest" data-query="${query}" style="display:flex;align-items:center;gap:14px;padding:10px 18px;cursor:pointer;font-size:14px;color:var(--color-accent);" role="button" tabindex="0">
          <span style="width:44px;height:44px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">${Icons.app('vibecode')}</span>
          <span style="font-weight:500;">AI 生成 "${query}"</span>
        </div>`;
      hintEl.textContent = (installedApps.length > 0 ? `已安装 (${installedApps.length}) · ` : '') + '点击生成';
      resultsEl.innerHTML = html;
    }

    // Bind clicks on AI suggestions
    this._bindResultClicks(resultsEl);
    resultsEl.querySelectorAll('.ai-suggest').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const q = el.dataset.query;
        this._closeSpotlight();
        this._generateAppFromQuery(q);
      });
      el.addEventListener('mouseenter', () => { el.style.background = '#f0f0f0'; });
      el.addEventListener('mouseleave', () => { el.style.background = ''; });
    });
  },

  _bindResultClicks(container) {
    container.querySelectorAll('.spotlight-result:not(.ai-suggest)').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const appId = el.dataset.appId;
        this._closeSpotlight();
        WindowManager.openApp(appId);
      });
      el.addEventListener('mouseenter', () => { el.style.background = '#f0f0f0'; });
      el.addEventListener('mouseleave', () => { el.style.background = ''; });
    });
  },

  /** Generate a new app from user query — uses full pipeline */
  async _generateAppFromQuery(query) {
    WindowManager.openCustomApp(query, 'vibecode', query);
  },

  /* ==========================================
     Menu System
     ========================================== */
  _setupEvents() {
    // File / Edit menu items + active app menu (Apple Logo 不再触发菜单，已绑定到 Spotlight)
    document.querySelectorAll('.menubar-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation(); this._toggleMenu(item.dataset.menu, item);
      });
    });
    document.addEventListener('click', () => this._closeAllMenus());
  },

  _toggleMenu(menuName, el) {
    if (this._activeMenu && this._activeMenu.el !== el) this._closeAllMenus();
    if (el.classList.contains('active')) { this._closeAllMenus(); return; }
    document.querySelectorAll('.menubar-item.active, .menubar-apple.active').forEach(i => {
      i.classList.remove('active'); i.querySelector('.menubar-dropdown')?.remove();
    });
    el.classList.add('active');
    const menu = this._menus[menuName];
    if (!menu) return;
    const dropdown = document.createElement('div');
    dropdown.className = 'menubar-dropdown';
    menu.items.forEach(item => {
      if (item.separator) dropdown.innerHTML += '<div class="separator"></div>';
      else dropdown.innerHTML += `<div class="menubar-dropdown-item" data-action="${item.action||'noop'}"><span>${item.label}</span>${item.shortcut?`<span class="shortcut">${item.shortcut}</span>`:''}</div>`;
    });
    el.appendChild(dropdown);
    this._activeMenu = { name: menuName, el };
    dropdown.querySelectorAll('.menubar-dropdown-item').forEach(dd => {
      dd.addEventListener('click', (e) => { e.stopPropagation(); this._handleAction(dd.dataset.action); this._closeAllMenus(); });
    });
  },

  _closeAllMenus() {
    document.querySelectorAll('.menubar-item.active, .menubar-apple.active').forEach(el => {
      el.classList.remove('active'); el.querySelector('.menubar-dropdown')?.remove();
    });
    this._activeMenu = null;
  },

  _handleAction(action) {
    switch (action) {
      case 'about': Notification?.show('VibeOS', 'AI 驱动的 macOS Aqua 风格桌面系统', 'info', 4000); break;
      case 'openLLMSettings': SettingsPanel.open(); break;
      case 'openAIChat': WindowManager.openApp('aichat'); break;
      case 'openSettings': WindowManager.openApp('settings'); break;
      case 'newWindow': WindowManager.openApp('vibecode'); break;
      case 'shutdown': this._confirmShutdown(); break;
      case 'closeWindow': if (WindowManager.focusedId) WindowManager.close(WindowManager.focusedId); break;
    }
  },

  _confirmShutdown() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:99999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
      <div style="width:320px;background:#fff;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.3);overflow:hidden;font-family:-apple-system,sans-serif;">
        <div style="padding:18px 20px 10px;font-size:14px;font-weight:600;color:#1d1d1f;">关机</div>
        <div style="padding:0 20px 16px;font-size:13px;color:#555;">确定要关闭 VibeOS 吗？</div>
        <div style="display:flex;border-top:1px solid #e5e5ea;">
          <button id="sd-cancel" style="flex:1;padding:10px;border:none;background:none;font-size:13px;color:#007aff;cursor:pointer;border-right:1px solid #e5e5ea;">取消</button>
          <button id="sd-ok" style="flex:1;padding:10px;border:none;background:none;font-size:13px;color:#ff3b30;cursor:pointer;font-weight:600;">关机</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const doShutdown = () => {
      document.body.style.opacity = '0';
      setTimeout(() => {
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#1a1a1a;color:#666;font-size:20px;font-family:monospace">现在可以安全关闭此窗口了。</div>';
        document.body.style.opacity = '1';
      }, 400);
    };
    overlay.querySelector('#sd-cancel').onclick = () => overlay.remove();
    overlay.querySelector('#sd-ok').onclick = () => { overlay.remove(); doShutdown(); };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  },

  _updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2,'0'), m = String(now.getMinutes()).padStart(2,'0');
    const wd = ['周日','周一','周二','周三','周四','周五','周六'][now.getDay()];
    const mo = now.getMonth()+1, d = now.getDate();
    document.getElementById('menubar-clock') && (document.getElementById('menubar-clock').textContent = `${wd} ${h}:${m}`);
    document.getElementById('menubar-date') && (document.getElementById('menubar-date').textContent = `${mo}月${d}日`);
  },
};
