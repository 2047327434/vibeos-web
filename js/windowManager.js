/* ============================================
   VibeOS Window Manager
   Core window lifecycle: create, destroy, focus,
   drag, resize, minimize, maximize, restore, close, snap
   ============================================ */

const WindowManager = {
  /** Map of all windows by id */
  windows: new Map(),
  /** Monotonically increasing z-index */
  zIndexCounter: 100,
  /** Currently focused window id */
  focusedId: null,
  /** Container element */
  container: null,
  /** Generated app cache */
  _appCache: {},
  /** Per-window prompt info (system + user + model + ts) for "查看 prompt" 按钮 */
  _appPrompts: {},

  /** State of a drag operation */
  _drag: null,
  /** State of a resize operation */
  _resize: null,
  /** Whether to snap windows */
  snapEnabled: true,
  /** Snap threshold (px) */
  snapThreshold: 30,

  /* ---- Init ---- */
  init() {
    this.container = document.getElementById('desktop');
    this._bindGlobalEvents();
  },

  /* ==============================================
     Window Lifecycle
     ============================================== */

  /**
   * Create a new window
   * @param {string} id - unique window id
   * @param {string} title - window title
   * @param {string} icon - emoji icon
   * @param {object} content - { type: 'iframe'|'placeholder', html?, srcdoc?, icon?, message? }
   * @param {object} options - { width?, height?, x?, y?, maximized? }
   */
  create(id, title, icon, content = {}, options = {}) {
    // If window already exists, just focus it
    if (this.windows.has(id)) {
      const w = this.windows.get(id);
      if (w.minimized) this.restore(id);
      this.focus(id);
      return w.el;
    }

    // 兜底标题：避免 undefined 进入 DOM
    if (!title || typeof title !== 'string') {
      title = (typeof id === 'string' ? id.replace(/^custom-\d+$/,'New App').replace(/^installed-/,'') : 'Untitled') || 'Untitled';
    }

    const w = {
      id,
      title,
      icon,
      x: options.x ?? (60 + (this.windows.size * 36) % 480),
      y: options.y ?? (52 + (this.windows.size * 32) % 280),
      width: options.width ?? VibeOSConfig.window.defaultWidth,
      height: options.height ?? VibeOSConfig.window.defaultHeight,
      prevX: 0,
      prevY: 0,
      prevWidth: 0,
      prevHeight: 0,
      zIndex: ++this.zIndexCounter,
      minimized: false,
      maximized: options.maximized ?? false,
      el: null,
      iframe: null,
    };

    // Build DOM
    w.el = this._buildWindowDOM(w, content);
    this.container.appendChild(w.el);

    // Opening animation
    requestAnimationFrame(() => {
      w.el.classList.add('opening');
      w.el.addEventListener('animationend', () => {
        w.el.classList.remove('opening');
      }, { once: true });
    });

    // Maximize immediately if requested
    if (w.maximized) {
      // Store initial bounds before maximizing
      w.prevX = w.x;
      w.prevY = w.y;
      w.prevWidth = w.width;
      w.prevHeight = w.height;
      w.el.classList.add('maximized');
    } else {
      this._applyBounds(w);
    }

    // Set initial z-index
    w.el.style.zIndex = w.zIndex;

    // Setup drag on titlebar
    this._setupDrag(w);

    // Setup resize on handles
    this._setupResize(w);

    this.windows.set(id, w);
    this.focus(id);

    // Notify dock
    if (typeof Dock !== 'undefined') {
      Dock.setRunning(id, true);
      Dock.setActive(id);
    }

    return w.el;
  },

  /**
   * Destroy a window
   */
  destroy(id) {
    const w = this.windows.get(id);
    if (!w) return;

    // Close animation
    w.el.classList.add('closing');
    w.el.addEventListener('animationend', () => {
      if (w.el.parentNode) {
        w.el.parentNode.removeChild(w.el);
      }
    }, { once: true });

    // Also remove after timeout as fallback
    setTimeout(() => {
      if (w.el.parentNode) {
        w.el.parentNode.removeChild(w.el);
      }
    }, 200);

    if (this.focusedId === id) {
      this.focusedId = null;
    }

    // Clean up app prompts and caches
    if (this._appPrompts && this._appPrompts[id]) delete this._appPrompts[id];
    if (this._appCache && this._appCache[id]) delete this._appCache[id];

    this.windows.delete(id);

    // Notify dock
    if (typeof Dock !== 'undefined') {
      Dock.setRunning(id, false);
      Dock.setActive(null);
    }
  },

  /**
   * Bring window to front
   */
  focus(id) {
    const w = this.windows.get(id);
    if (!w || w.minimized) return;

    // Unfocus previous
    if (this.focusedId && this.focusedId !== id) {
      const prev = this.windows.get(this.focusedId);
      if (prev && prev.el) {
        prev.el.classList.remove('focused');
        prev.el.classList.add('unfocused');
      }
    }

    this.focusedId = id;
    w.zIndex = ++this.zIndexCounter;
    w.el.style.zIndex = w.zIndex;
    w.el.classList.add('focused');
    w.el.classList.remove('unfocused');

    // Notify dock
    if (typeof Dock !== 'undefined') {
      Dock.setActive(id);
    }
  },

  /**
   * Minimize window to taskbar
   */
  minimize(id) {
    const w = this.windows.get(id);
    if (!w || w.minimized) return;

    w.minimized = true;
    w.el.classList.add('minimizing');
    w.el.addEventListener('animationend', () => {
      w.el.style.display = 'none';
      w.el.classList.remove('minimizing');
    }, { once: true });

    if (this.focusedId === id) {
      this.focusedId = null;
      // Focus next window
      const all = this.getAllVisible();
      if (all.length > 0) this.focus(all[0].id);
    }

    // Notify dock
    if (typeof Dock !== 'undefined') {
      Dock.setRunning(id, true);
      Dock.setActive(null);
    }
  },

  /**
   * Maximize window
   */
  maximize(id) {
    const w = this.windows.get(id);
    if (!w) return;

    if (w.maximized) {
      this.restore(id);
      return;
    }

    // Store current bounds
    w.prevX = w.x;
    w.prevY = w.y;
    w.prevWidth = w.width;
    w.prevHeight = w.height;

    w.maximized = true;
    w.el.classList.add('maximized');
    w.el.style.top = `var(--menubar-height)`;
    w.el.style.left = '0';
    w.el.style.width = '100%';
    w.el.style.height = `calc(100vh - var(--menubar-height) - var(--dock-height) - 12px)`;

    // Update maximize button icon
    const maxBtn = w.el.querySelector('.maximize-btn');
    if (maxBtn) maxBtn.innerHTML = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M5 5h6v6M7 5H1v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';
  },

  /**
   * Restore window from minimized/maximized
   */
  restore(id) {
    const w = this.windows.get(id);
    if (!w) return;

    if (w.minimized) {
      w.minimized = false;
      w.el.style.display = '';
      w.el.style.opacity = '1';
      w.el.style.transform = '';
      this.focus(id);

      if (typeof Dock !== 'undefined') {
        Dock.setActive(id);
      }
      return;
    }

    if (w.maximized) {
      w.maximized = false;
      w.el.classList.remove('maximized');
      this._applyBounds(w);

      // Update maximize button icon
      const maxBtn = w.el.querySelector('.maximize-btn');
      if (maxBtn) maxBtn.innerHTML = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3.2 5.6V3.2h2.4M8.8 6.4v2.4H6.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';
    }
  },

  /**
   * Close window (alias for destroy with animation)
   */
  close(id) {
    // Notify content before closing
    const w = this.windows.get(id);
    if (w && w.iframe) {
      try {
        w.iframe.contentWindow?.postMessage?.({ type: 'window.close' }, '*');
      } catch (e) { /* ignore */ }
    }
    this.destroy(id);
  },

  /* ==============================================
     Snap / Layout
     ============================================== */

  /**
   * Snap window to a screen position
   * @param {string} id
   * @param {string} position - 'left' | 'right' | 'top' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
   */
  snap(id, position) {
    const w = this.windows.get(id);
    if (!w || w.maximized) return;

    const menuH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--menubar-height')) || 26;
    const dockH = (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--dock-height')) || 56) + 8;
    const screenW = window.innerWidth;
    const screenH = window.innerHeight - menuH - dockH;
    const halfW = screenW / 2;
    const halfH = screenH / 2;

    switch (position) {
      case 'left':
        w.x = 0; w.y = menuH;
        w.width = halfW; w.height = screenH;
        break;
      case 'right':
        w.x = halfW; w.y = menuH;
        w.width = halfW; w.height = screenH;
        break;
      case 'top':
        w.x = 0; w.y = menuH;
        w.width = screenW; w.height = halfH;
        break;
      case 'top-left':
        w.x = 0; w.y = menuH;
        w.width = halfW; w.height = halfH;
        break;
      case 'top-right':
        w.x = halfW; w.y = menuH;
        w.width = halfW; w.height = halfH;
        break;
      case 'bottom-left':
        w.x = 0; w.y = menuH + halfH;
        w.width = halfW; w.height = halfH;
        break;
      case 'bottom-right':
        w.x = halfW; w.y = menuH + halfH;
        w.width = halfW; w.height = halfH;
        break;
    }

    this._applyBounds(w);
  },

  /* ==============================================
     Query
     ============================================== */

  /** Get window by id */
  get(id) {
    return this.windows.get(id) || null;
  },

  /** Get all visible (non-minimized) windows sorted by z-index */
  getAllVisible() {
    const list = [];
    for (const w of this.windows.values()) {
      if (!w.minimized) list.push(w);
    }
    list.sort((a, b) => a.zIndex - b.zIndex);
    return list;
  },

  /** Get all windows including minimized */
  getAll() {
    const list = Array.from(this.windows.values());
    list.sort((a, b) => a.zIndex - b.zIndex);
    return list;
  },

  /** Check if a window exists */
  exists(id) {
    return this.windows.has(id);
  },

  /* ==============================================
     Content Management
     ============================================== */

  /**
   * Set window content
   */
  setContent(id, content) {
    const w = this.windows.get(id);
    if (!w) return;

    const contentEl = w.el.querySelector('.window-content');
    if (!contentEl) return;

    if (content.type === 'iframe') {
      // Create or reuse iframe
      if (!w.iframe) {
        w.iframe = document.createElement('iframe');
        w.iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin');
        w.iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;';
      }
      w.iframe.srcdoc = content.srcdoc || content.html || '';
      contentEl.innerHTML = '';
      contentEl.appendChild(w.iframe);
    } else if (content.type === 'placeholder') {
      // icon 可以是 glyph 名(如 'hourglass'/'cross')、SVG 字符串、或 emoji
      let iconHtml = '';
      const ic = content.icon;
      if (!ic) iconHtml = Icons.glyph('info');
      else if (typeof ic === 'string' && ic.trim().startsWith('<svg')) iconHtml = ic;
      else if (typeof ic === 'string' && /^[a-z0-9-]+$/i.test(ic)) iconHtml = Icons.glyph(ic);
      else iconHtml = Icons.resolveGlyph(ic);
      contentEl.innerHTML = `
        <div class="placeholder">
          <div class="icon" style="font-size:48px;line-height:0;color:#8e8e93;">${iconHtml}</div>
          <div>${content.message || '内容加载中...'}</div>
        </div>`;
    } else if (content.html) {
      contentEl.innerHTML = content.html;
    }
  },

  /* ==============================================
     Internal: DOM Building
     ============================================== */

  _buildWindowDOM(w, content) {
    const el = document.createElement('div');
    el.className = 'window unfocused';
    el.id = `window-${w.id}`;
    el.setAttribute('data-window-id', w.id);
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', w.title);
    el.innerHTML = `
      <div class="window-titlebar" data-window-id="${w.id}">
        <div class="window-controls">
          <button class="window-control-btn close-btn" data-action="close" title="关闭" aria-label="关闭窗口"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/></svg></button>
          <button class="window-control-btn minimize-btn" data-action="minimize" title="最小化" aria-label="最小化窗口"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/></svg></button>
          <button class="window-control-btn maximize-btn" data-action="maximize" title="缩放" aria-label="缩放窗口"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3.2 5.6V3.2h2.4M8.8 6.4v2.4H6.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg></button>
        </div>
        <span class="window-icon" style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;">${(typeof w.icon==='string' && w.icon.trim().startsWith('<svg')) ? w.icon : Icons.resolve(w.icon || 'generic')}</span>
        <span class="window-title">${w.title}</span>
        <span class="window-prompt-btn" data-window-id="${w.id}" title="查看应用 Prompt" onclick="WindowManager._showAppPrompt('${w.id}')" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;color:#8e8e93;cursor:pointer;margin-right:4px;">${Icons.glyph('code')}</span>
        <span class="window-save-btn" data-window-id="${w.id}" title="保存到桌面" onclick="WindowManager._saveApp('${w.id}')" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;color:#0a84ff;cursor:pointer;">${Icons.glyph('save')}</span>
      </div>
      <div class="window-content"></div>
      <div class="resize-handle top" data-resize="top"></div>
      <div class="resize-handle bottom" data-resize="bottom"></div>
      <div class="resize-handle left" data-resize="left"></div>
      <div class="resize-handle right" data-resize="right"></div>
      <div class="resize-handle top-left" data-resize="top-left"></div>
      <div class="resize-handle top-right" data-resize="top-right"></div>
      <div class="resize-handle bottom-left" data-resize="bottom-left"></div>
      <div class="resize-handle bottom-right" data-resize="bottom-right"></div>
    `;

    // Bind titlebar control buttons
    const self = this;
    el.querySelector('.window-controls').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const winId = btn.closest('.window').getAttribute('data-window-id');
      switch (action) {
        case 'minimize': self.minimize(winId); break;
        case 'maximize': self.maximize(winId); break;
        case 'close': self.close(winId); break;
      }
    });

    // Click on window brings it to front
    el.addEventListener('mousedown', () => {
      self.focus(w.id);
    });

    // Set initial content
    this.setContent(w.id, content);

    return el;
  },

  /* ==============================================
     Internal: Drag
     ============================================== */

  _setupDrag(w) {
    const titlebar = w.el.querySelector('.window-titlebar');
    if (!titlebar) return;

    const self = this;

    titlebar.addEventListener('mousedown', (e) => {
      // Ignore clicks on control buttons
      if (e.target.closest('.window-control-btn')) return;
      // Ignore right click
      if (e.button !== 0) return;
      // Ignore if already resizing
      if (self._resize) return;

      // Restore from maximized on drag
      if (w.maximized) {
        // Calculate where the click would be proportionally
        const rect = w.el.getBoundingClientRect();
        const ratioX = e.clientX / rect.width;
        w.maximized = false;
        w.el.classList.remove('maximized');
        w.x = e.clientX - w.prevWidth * ratioX;
        w.y = e.clientY - 10; // near titlebar top
        w.width = w.prevWidth;
        w.height = w.prevHeight;
        self._applyBounds(w);
      }

      self._drag = {
        winId: w.id,
        startX: e.clientX,
        startY: e.clientY,
        origX: w.x,
        origY: w.y,
        moved: false,
      };
      // 屏蔽全局 iframe 的鼠标事件，避免拖动时 mouseup 被 iframe 吞掉
      document.body.classList.add('vibeos-dragging');
      e.preventDefault();
    });
  },

  /* ==============================================
     Internal: Resize
     ============================================== */

  _setupResize(w) {
    const handles = w.el.querySelectorAll('[data-resize]');
    const self = this;

    handles.forEach((handle) => {
      handle.addEventListener('mousedown', (e) => {
        if (w.maximized) return;
        if (e.button !== 0) return;

        self._resize = {
          winId: w.id,
          direction: handle.getAttribute('data-resize'),
          startX: e.clientX,
          startY: e.clientY,
          origX: w.x,
          origY: w.y,
          origWidth: w.width,
          origHeight: w.height,
        };
        document.body.classList.add('vibeos-dragging');
        e.preventDefault();
        e.stopPropagation();
      });
    });
  },

  /* ==============================================
     Internal: Apply bounds
     ============================================== */

  _applyBounds(w) {
    if (w.maximized) return;
    const menuH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--menubar-height')) || 26;
    const dockH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--dock-height')) || 56;
    const maxX = window.innerWidth - 100;
    const minY = menuH;
    const maxY = window.innerHeight - dockH - 30;
    w.x = Math.max(-w.width + 100, Math.min(w.x, maxX));
    w.y = Math.max(minY, Math.min(w.y, maxY));
    w.el.style.left = w.x + 'px';
    w.el.style.top = w.y + 'px';
    w.el.style.width = w.width + 'px';
    w.el.style.height = w.height + 'px';
  },

  /* ==============================================
     Internal: Global Events
     ============================================== */

  _bindGlobalEvents() {
    const self = this;

    // Mousemove: handle drag + resize (use window for iframe crossing)
    window.addEventListener('mousemove', (e) => {
      // Drag
      if (self._drag) {
        const d = self._drag;
        const w = self.windows.get(d.winId);
        if (!w) { self._drag = null; return; }

        const dx = e.clientX - d.startX;
        const dy = e.clientY - d.startY;
        // Mark as moved only after a minimum threshold to distinguish click from drag
        if (!d.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) d.moved = true;
        if (!d.moved) return;

        w.x = d.origX + dx;
        w.y = d.origY + dy;
        self._applyBounds(w);

        // Snap check on edge (top)
        if (self.snapEnabled && w.y <= self.snapThreshold && w.y >= -10) {
          // Could show snap preview for maximize
        }
      }

      // Resize
      if (self._resize) {
        const r = self._resize;
        const w = self.windows.get(r.winId);
        if (!w) { self._resize = null; return; }

        const dx = e.clientX - r.startX;
        const dy = e.clientY - r.startY;
        const dir = r.direction;
        const minW = VibeOSConfig.window.minWidth;
        const minH = VibeOSConfig.window.minHeight;

        if (dir.includes('right')) {
          w.width = Math.max(minW, r.origWidth + dx);
        }
        if (dir.includes('left')) {
          const newW = Math.max(minW, r.origWidth - dx);
          if (newW !== w.width) {
            w.x = r.origX + (r.origWidth - newW);
            w.width = newW;
          }
        }
        if (dir.includes('bottom')) {
          w.height = Math.max(minH, r.origHeight + dy);
        }
        if (dir.includes('top')) {
          const newH = Math.max(minH, r.origHeight - dy);
          if (newH !== w.height) {
            w.y = r.origY + (r.origHeight - newH);
            w.height = newH;
          }
        }

        self._applyBounds(w);
      }
    });

    // Mouseup: end drag + resize (use window to catch events over iframes)
    const endDrag = () => {
      if (self._drag && self._drag.moved && self.snapEnabled) {
        const d = self._drag;
        const w = self.windows.get(d.winId);
        if (w) {
          // Snap to left/right edge
          if (w.x <= self.snapThreshold && w.x >= -10) {
            self.snap(w.id, 'left');
          } else if (w.x + w.width >= window.innerWidth - self.snapThreshold) {
            self.snap(w.id, 'right');
          }
          // Snap to top (maximize)
          if (w.y <= 5 && w.y >= -5) {
            self.maximize(w.id);
          }
        }
      }

      self._drag = null;
      self._resize = null;
      document.body.classList.remove('vibeos-dragging');
    };
    window.addEventListener('mouseup', endDrag);
    // 兜底：鼠标移出可视区或失焦也结束拖动，避免"卡住"
    window.addEventListener('blur', endDrag);
    document.addEventListener('mouseleave', endDrag);
    // pointer 事件兜底（部分浏览器在 iframe 上 mouseup 丢失）
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
  },

  /* ==============================================
     App Lifecycle (open → generate → render)
     ============================================== */

  /**
   * Open an app: create window, generate content (via AI or mock), render result
   * @param {string} appId - app identifier from registry
   */
  openApp(appId) {
    const app = AppRegistry?.get?.(appId);
    if (!app) { console.warn(`[WM] App "${appId}" not found`); return; }

    const appIcon = Icons.app(app.iconId || appId);
    const appName = app.name || appId || 'Untitled';

    // Create window with loading state
    this.create(appId, appName, appIcon, {
      type: 'placeholder',
      icon: 'hourglass',
      message: `正在生成 ${appName}...\nAI 正在编写应用代码`,
    });

    // Generate and render asynchronously — must catch errors
    this._loadAppContent(appId, app).catch(err => {
      console.error('[WM] Unhandled error:', err);
      this.setContent(appId, {
        type: 'placeholder', icon: 'cross',
        message: `加载失败: ${err.message || '未知错误'}`,
      });
    });
  },

  async _loadAppContent(appId, app) {
    const w = this.windows.get(appId);
    if (!w) return;

    const useAI = VibeOSConfig.llm.provider !== 'mock' && VibeOSConfig.llm.apiKey;
    const titleEl = w.el?.querySelector('.window-title');

    // Build layout: progress bar + status + live iframe
    const shellHTML = `
      <div style="display:flex;flex-direction:column;height:100%;font-family:-apple-system,sans-serif;">
        <div style="padding:0;background:#f0f0f0;height:3px;flex-shrink:0;">
          <div id="progress-bar" style="height:100%;width:0%;background:#007aff;transition:width 0.3s;"></div>
        </div>
        <div style="padding:3px 10px;background:#f9f9f9;border-bottom:1px solid #e0e0e0;font-size:11px;color:#888;flex-shrink:0;" id="status-text">连接中…</div>
        <div style="flex:1;position:relative;overflow:hidden;">
          <iframe id="live-preview" style="width:100%;height:100%;border:none;" sandbox="allow-scripts allow-forms allow-same-origin"></iframe>
        </div>
      </div>`;

    this.setContent(appId, { type: 'html', html: shellHTML });

    const updateStatus = (text) => {
      const el = w.el?.querySelector('#status-text');
      if (el) el.textContent = text;
    };
    const updateBar = (pct) => {
      const el = w.el?.querySelector('#progress-bar');
      if (el) el.style.width = Math.min(100, pct) + '%';
    };
    const updatePreview = (rawText) => {
      const iframe = w.el?.querySelector('#live-preview');
      if (!iframe) return;
      // Extract HTML from streaming text
      let html = rawText;
      const marker = '```html';
      const idx = html.indexOf(marker);
      if (idx !== -1) {
        html = html.substring(idx + marker.length);
        // Only remove trailing ``` if it exists
        const end = html.lastIndexOf('```');
        if (end !== -1) html = html.substring(0, end);
      }
      // Always build a valid document so the browser renders even partial HTML
      const doc = '<!DOCTYPE html>\n<html><head><meta charset="UTF-8"><style>body{font-family:-apple-system,sans-serif;margin:0;padding:8px;background:#fff;color:#1d1d1f;}</style></head><body>' + html.trim() + '</body></html>';
      try { iframe.srcdoc = doc; } catch(e) {}
    };

    try {
      if (useAI) {
        updateStatus(`正在连接 ${VibeOSConfig.llm.model || 'LLM'}…`);
        updateBar(2);
        titleEl && (titleEl.textContent = `${app.name} — 连接中`);

        // 预加载并存储应用 prompt（便于标题栏「查看 Prompt」按钮）
        try {
          const sys = await AppGenerator._loadSystemPrompt(app.promptFile);
          this._appPrompts[appId] = {
            kind: 'builtin',
            appName: app.name,
            promptFile: app.promptFile,
            system: sys,
            common: AppGenerator._getCommonSystemPrompt(),
            user: `请生成${app.name}应用`,
            model: VibeOSConfig.llm.model,
            ts: Date.now(),
          };
        } catch (_) {}

        let lastPreviewUpdate = 0;
        let accumulatedText = '';

        let html = await AppGenerator._callLLMStream(app, null, (delta, fullText) => {
          accumulatedText = fullText;

          const pct = 2 + Math.min(88, (fullText.length / 6000) * 88);
          updateBar(pct);

          const chars = fullText.length;
          if (chars < 100) updateStatus(`生成中… (${chars} 字符)`);
          else if (chars < 1000) updateStatus(`生成中… (${chars} 字符)`);
          else updateStatus(`生成中… (${Math.round(chars/100)/10}k 字符)`);
          titleEl && (titleEl.textContent = `${app.name} — ${Math.round(chars/100)/10}k`);

          // Update live preview every ~0.8s, start early
          const now = Date.now();
          if (now - lastPreviewUpdate > 800 && fullText.length > 50) {
            lastPreviewUpdate = now;
            updatePreview(accumulatedText);
          }
        });

        // Final render — inject VibeOSAPI bridge
        updateStatus('生成完成');
        updateBar(95);
        titleEl && (titleEl.textContent = app.name);

        if (!html.includes('<!DOCTYPE') && !html.includes('<html')) {
          html = '<!DOCTYPE html>\n<html><head><meta charset="UTF-8"></head><body>' + html + '</body></html>';
        }
        html = html.replace(/^```html?\s*/i, '').replace(/\s*```$/i, '');
        // Inject system API bridge
        html = this._injectAPI(html, Sandbox.getAppAPI());

        this.setContent(appId, { type: 'iframe', srcdoc: html });
        this._appCache[appId] = html; // cache for instant reopen
        updateBar(100);

      } else {
        // Mock mode
        updateStatus('Mock 模式');
        updateBar(30);
        await new Promise(r => setTimeout(r, 300));
        updateBar(70);
        let html = AppGenerator._getMockApp(appId, null);
        updateBar(100);
        updateStatus('完成');
        // Inject system API bridge
        html = this._injectAPI(html, Sandbox.getAppAPI());
        this.setContent(appId, { type: 'iframe', srcdoc: html });
        this._appCache[appId] = html; // cache for instant reopen
      }
    } catch (error) {
      console.error(`[WM] ${appId} failed:`, error.message);
      titleEl && (titleEl.textContent = `${app.name} — 失败`);
      this.setContent(appId, {
        type: 'placeholder', icon: 'cross',
        message: `生成失败\n\n${error.message || '未知错误'}`,
      });
    }
  },

  /* ==============================================
     App Switcher (Cmd+Tab)
     ============================================== */

  _switcher: null,

  showAppSwitcher() {
    const windows = this.getAllVisible();
    if (windows.length === 0) return;
    if (windows.length === 1) { this.focus(windows[0].id); return; }

    // Remove existing
    if (this._switcher) this._switcher.remove();

    const overlay = document.createElement('div');
    overlay.className = 'app-switcher-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:6000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);';
    
    const cardsHTML = windows.map((w, i) => `
      <div class="switcher-card" data-window-id="${w.id}" style="
        display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;
        padding:12px;border-radius:12px;background:rgba(255,255,255,0.9);
        box-shadow:0 4px 16px rgba(0,0,0,0.15);width:180px;
        transition:transform 0.15s,box-shadow 0.15s;
      " onmouseenter="this.style.transform='scale(1.05)';this.style.boxShadow='0 6px 24px rgba(0,0,0,0.2)';"
         onmouseleave="this.style.transform='scale(1)';this.style.boxShadow='0 4px 16px rgba(0,0,0,0.15)';"
      >
        <div style="width:60px;height:60px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.04);border-radius:14px;font-size:40px;">${(typeof w.icon==='string' && w.icon.trim().startsWith('<svg')) ? w.icon : Icons.resolve(w.icon || 'generic')}</div>
        <div style="font-size:13px;font-weight:500;color:#1d1d1f;text-align:center;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${w.title || w.name || ''}</div>
      </div>
    `).join('');

    overlay.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center;max-width:80vw;" id="switcher-cards">
        ${cardsHTML}
      </div>
    `;

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.hideAppSwitcher();
    });
    overlay.querySelectorAll('.switcher-card').forEach(card => {
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        this.focus(card.dataset.windowId);
        this.hideAppSwitcher();
      });
    });

    document.body.appendChild(overlay);
    this._switcher = overlay;

    // Close on Esc
    const onEsc = (e) => { if (e.key === 'Escape') { this.hideAppSwitcher(); document.removeEventListener('keydown', onEsc); } };
    document.addEventListener('keydown', onEsc);
  },

  hideAppSwitcher() {
    if (this._switcher) { this._switcher.remove(); this._switcher = null; }
  },

  /** Inject VibeOSAPI bridge script into HTML */
  _injectAPI(html, apiScript) {
    if (html.includes('</head>')) {
      return html.replace('</head>', apiScript + '\n</head>');
    } else if (html.includes('<body')) {
      return html.replace('<body', apiScript + '\n<body');
    } else {
      return apiScript + '\n' + html;
    }
  },

  /* ==============================================
     Custom App (Spotlight / AI-generated)
     ============================================== */

  /**
   * Open a custom app generated from user query
   * Uses the same full pipeline as built-in apps (streaming + progress)
   */
  openCustomApp(name, icon, userQuery) {
    const appId = 'custom-' + Date.now();
    const safeName = (typeof name === 'string' && name.trim()) ? name.trim() : (typeof userQuery === 'string' && userQuery.trim() ? userQuery.trim().slice(0,40) : 'AI App');
    const safeIcon = icon || 'vibecode';
    const app = { id: appId, name: safeName, icon: safeIcon, promptFile: null };

    this.create(appId, safeName, safeIcon, {
      type: 'placeholder', icon: 'hourglass', message: `正在生成 ${safeName}...`,
    });
    this._loadCustomApp(appId, app, userQuery || safeName).catch(err => {
      this.setContent(appId, { type: 'placeholder', icon: 'cross', message: `生成失败\n${err.message}` });
    });
  },

  async _loadCustomApp(appId, app, userQuery) {
    const w = this.windows.get(appId);
    if (!w) return;
    const titleEl = w.el?.querySelector('.window-title');
    const useAI = VibeOSConfig.llm.provider !== 'mock' && VibeOSConfig.llm.apiKey;

    // Build progress + live preview UI (same as built-in)
    const shellHTML = `
      <div style="display:flex;flex-direction:column;height:100%;font-family:-apple-system,sans-serif;">
        <div style="padding:0;background:#f0f0f0;height:3px;flex-shrink:0;"><div id="progress-bar" style="height:100%;width:0%;background:#007aff;transition:width 0.3s;"></div></div>
        <div style="padding:3px 10px;background:#f9f9f9;border-bottom:1px solid #e0e0e0;font-size:11px;color:#888;flex-shrink:0;" id="status-text">连接中…</div>
        <div style="flex:1;position:relative;overflow:hidden;"><iframe id="live-preview" style="width:100%;height:100%;border:none;" sandbox="allow-scripts allow-forms allow-same-origin"></iframe></div>
      </div>`;
    this.setContent(appId, { type: 'html', html: shellHTML });

    const updateStatus = (t) => { const e = w.el?.querySelector('#status-text'); if (e) e.textContent = t; };
    const updateBar = (p) => { const e = w.el?.querySelector('#progress-bar'); if (e) e.style.width = Math.min(100,p)+'%'; };
    const updatePreview = (raw) => {
      const iframe = w.el?.querySelector('#live-preview');
      if (!iframe) return;
      let h = raw; const idx = h.indexOf('```html');
      if (idx !== -1) { h = h.substring(idx + 7); const end = h.lastIndexOf('```'); if (end !== -1) h = h.substring(0, end); }
      iframe.srcdoc = '<!DOCTYPE html>\n<html><head><meta charset="UTF-8"><style>body{font-family:-apple-system,sans-serif;margin:0;padding:8px;background:#fff;color:#1d1d1f;}</style></head><body>'+h.trim()+'</body></html>';
    };

    try {
      if (!useAI) {
        updateStatus('Mock 模式'); updateBar(100);
        const html = AppGenerator._getMockApp('notepad', null);
        this.setContent(appId, { type: 'iframe', srcdoc: this._injectAPI(html, Sandbox.getAppAPI()) });
        return;
      }

      updateStatus('正在润色需求…'); updateBar(2);
      titleEl && (titleEl.textContent = `${app.name} — 润色需求中`);

      // ========================================================
      // Step 1：用 LLM 把用户的原始 query 润色/补全为详细需求规格
      // 失败时降级到原始 query，不阻塞生成
      // ========================================================
      let polishedSpec = userQuery;
      let polishOk = false;
      try {
        polishedSpec = await this._polishUserPrompt(app.name, userQuery, (status) => {
          updateStatus(status);
        });
        polishOk = !!(polishedSpec && polishedSpec !== userQuery);
      } catch (e) {
        console.warn('[WM] polish failed, fallback to raw query:', e.message);
        polishedSpec = userQuery;
      }

      updateBar(8);
      updateStatus(polishOk ? '需求已润色，开始生成…' : '直接生成…');
      titleEl && (titleEl.textContent = `${app.name} — 连接中`);

      let accumulated = '', lastUpdate = 0;

      // Build custom system prompt incorporating user's search intent.
      // 注意：_callLLMStream 会自动追加 _getCommonSystemPrompt（含完整 VibeOSAPI 文档），
      // 这里只描述应用领域，不再手动拼接，避免重复。
      const systemPrompt = `你要生成用户搜索的"${app.name}"应用。\n\n用户原始需求：${userQuery}\n\n经过 AI 润色后的详细规格：\n${polishedSpec}\n\n请按照润色后的规格生成功能完整、可直接使用的 HTML 应用。`;

      // 存储应用 prompt（便于标题栏「查看 Prompt」按钮）
      this._appPrompts[appId] = {
        kind: 'custom',
        appName: app.name,
        userQuery: userQuery,
        polishedSpec: polishOk ? polishedSpec : null,
        system: systemPrompt,
        common: AppGenerator._getCommonSystemPrompt(),
        user: `请生成"${app.name}"应用。润色后的需求：\n${polishedSpec}`,
        model: VibeOSConfig.llm.model,
        ts: Date.now(),
      };

      // Override _loadSystemPrompt temporarily (restore in finally)
      const origLoad = AppGenerator._loadSystemPrompt;
      AppGenerator._loadSystemPrompt = async () => systemPrompt;
      let html;
      try {
        html = await AppGenerator._callLLMStream(
          { name: app.name, promptFile: '' },
          `请生成"${app.name}"应用。润色后的需求：\n${polishedSpec}`,
          (delta, fullText) => {
            accumulated = fullText;
            const pct = 8 + Math.min(82, (fullText.length / 6000) * 82);
            updateBar(pct);
            const chars = fullText.length;
            if (chars < 100) updateStatus(`生成中… (${chars} 字符)`);
            else updateStatus(`生成中… (${Math.round(chars/100)/10}k 字符)`);
            titleEl && (titleEl.textContent = `${app.name} — ${Math.round(chars/100)/10}k`);
            const now = Date.now();
            if (now - lastUpdate > 800 && fullText.length > 50) { lastUpdate = now; updatePreview(accumulated); }
          }
        );
      } finally {
        AppGenerator._loadSystemPrompt = origLoad;
      }

      updateStatus('完成'); updateBar(95);
      titleEl && (titleEl.textContent = app.name);

      let finalHtml = html;
      if (!finalHtml.includes('<!DOCTYPE') && !finalHtml.includes('<html')) {
        finalHtml = '<!DOCTYPE html>\n<html><head><meta charset="UTF-8"></head><body>' + finalHtml + '</body></html>';
      }
      finalHtml = finalHtml.replace(/^```html?\s*/i, '').replace(/\s*```$/i, '');
      finalHtml = this._injectAPI(finalHtml, Sandbox.getAppAPI());
      this.setContent(appId, { type: 'iframe', srcdoc: finalHtml });
      updateBar(100);
      Dock.setRunning(appId, true);

    } catch (e) {
      console.error('[WM] Custom app failed:', e.message);
      titleEl && (titleEl.textContent = `${app.name} — 失败`);
      throw e;
    }
  },

  /* ==============================================
     Save & AI Editor
     ============================================== */
  _saveApp(wId) {
    const w = this.windows.get(wId);
    if (!w) return;
    const html = this._appCache[wId] || w.el?.querySelector('iframe')?.srcdoc || '';
    if (!html || html.length < 100) { Notification.show('无法保存', '内容为空', 'warn'); return; }
    // 自定义保存到桌面的应用使用统一的 custom-app 矢量图
    InstalledApps.save(wId, w.title || 'Untitled', 'custom-app', html);
    Desktop._renderIcons?.();
    Notification.show('已保存', `${w.title || 'Untitled'} 已保存到桌面`, 'check');
  },

  /**
   * 用 LLM 把用户的原始 query（通常很短，例如"做个待办"）
   * 润色/补全为详细的应用需求规格（功能列表、UI 元素、交互逻辑、数据持久化等）。
   * 失败或为空时调用方应降级到原始 query。
   */
  async _polishUserPrompt(appName, rawQuery, onStatus) {
    const cfg = VibeOSConfig.llm;
    if (!cfg.apiKey || !cfg.apiEndpoint) throw new Error('LLM 未配置');

    onStatus?.('正在润色需求 (1/2)…');
    const polishSystem =
`你是 VibeOS 桌面应用产品助手。用户给一个简短的应用名/需求，你需要把它扩写成一份"清晰、具体、可执行"的桌面应用需求规格，给后续的代码生成 LLM 使用。

输出要求（中文，250-500 字，纯文本，不要 markdown 代码块）：
1. 一句话产品定位（一行内）
2. 主要功能（3-6 条，含动词，可执行）
3. 核心 UI 元素（布局结构、关键控件、交互区域）
4. 关键交互逻辑（按钮点击/键盘快捷键/自动行为）
5. 数据持久化（建议用 VibeOSAPI.storage 还是 VibeOSAPI.fs，键名/路径示例）
6. 视觉风格（macOS 风：白底 #fff、边框 #d2d2d7、强调色 #007aff、圆角 8-12px）
7. 任何需要避免的反模式或常见错误

不要给代码，只给规格。直接输出规格本身，不要寒暄、不要前后说明。`;

    const userMsg = `应用名：${appName}\n用户原始需求：${rawQuery}\n\n请扩写为详细规格。`;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    try {
      const resp = await fetch(`${cfg.apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.apiKey}` },
        body: JSON.stringify({
          model: cfg.model,
          messages: [
            { role: 'system', content: polishSystem },
            { role: 'user', content: userMsg },
          ],
          max_tokens: 1500,
          temperature: 0.5,
          stream: false,
        }),
        signal: ctrl.signal,
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const text = (data?.choices?.[0]?.message?.content || '').trim();
      onStatus?.('需求润色完成 (2/2)');
      // 上报到 LLM 统计（润色调用也算一次成功）
      const stats = (window.VibeOS && VibeOS._llmStats) || null;
      if (stats) {
        stats.totalCalls++; stats.successCalls = (stats.successCalls || 0) + 1;
        if (data.usage) {
          stats.totalPromptTokens += data.usage.prompt_tokens || 0;
          stats.totalCompletionTokens += data.usage.completion_tokens || 0;
          stats.lastUsage = data.usage;
        }
      }
      return text || rawQuery;
    } finally {
      clearTimeout(timer);
    }
  },

  /**
   * 弹出"查看应用 Prompt"模态：显示当前窗口生成时使用的 system / common / user prompt
   */
  _showAppPrompt(wId) {
    const w = this.windows.get(wId);
    if (!w) return;
    const p = this._appPrompts[wId];
    const escapeHtml = (s) => String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    // 关掉旧的（如果有）
    document.getElementById('vibeos-prompt-modal')?.remove();

    let bodyHtml;
    if (!p) {
      bodyHtml = `<div style="padding:40px 24px;text-align:center;color:#8e8e93;font-size:13px;">
        <div style="display:inline-flex;width:32px;height:32px;color:#8e8e93;margin-bottom:12px;">${Icons.glyph('info')}</div>
        <div>本窗口没有 AI 生成 Prompt 记录</div>
        <div style="margin-top:6px;font-size:12px;">（仅 AI 生成的应用窗口才会保存 Prompt）</div>
      </div>`;
    } else {
      const ts = new Date(p.ts).toLocaleString();
      const meta = [
        `<span style="display:inline-flex;align-items:center;gap:4px;background:#f2f2f7;color:#1d1d1f;padding:3px 8px;border-radius:4px;font-size:11px;">${p.kind === 'builtin' ? '内置应用' : 'AI 生成'}</span>`,
        `<span style="color:#8e8e93;font-size:11px;">模型 <b style="color:#1d1d1f;">${escapeHtml(p.model || '-')}</b></span>`,
        p.promptFile ? `<span style="color:#8e8e93;font-size:11px;">文件 <code style="background:#f2f2f7;padding:1px 5px;border-radius:3px;font-size:11px;">prompts/${escapeHtml(p.promptFile)}</code></span>` : '',
        `<span style="color:#8e8e93;font-size:11px;">${escapeHtml(ts)}</span>`,
      ].filter(Boolean).join('');

      const section = (label, content, badge) => `
        <div style="margin-bottom:14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
            <div style="font-weight:600;font-size:12px;color:#1d1d1f;letter-spacing:0.3px;">${label}${badge?`<span style="margin-left:6px;color:#8e8e93;font-weight:400;font-size:11px;">${badge}</span>`:''}</div>
            <button class="vibeos-prompt-copy" data-copy="${encodeURIComponent(content || '')}" style="background:none;border:1px solid #d2d2d7;border-radius:4px;padding:2px 8px;font-size:11px;color:#1d1d1f;cursor:pointer;">复制</button>
          </div>
          <pre style="margin:0;padding:10px 12px;background:#1c1c1e;color:#f2f2f7;border-radius:6px;font-family:'SF Mono',ui-monospace,monospace;font-size:12px;line-height:1.5;max-height:240px;overflow:auto;white-space:pre-wrap;word-break:break-word;">${escapeHtml(content || '(空)')}</pre>
        </div>`;

      bodyHtml = `
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:12px 18px;border-bottom:1px solid #e5e5ea;background:#fafafa;">${meta}</div>
        <div style="padding:14px 18px;overflow-y:auto;flex:1;">
          ${p.userQuery ? section('① 用户原始需求 (User Query)', p.userQuery) : ''}
          ${p.polishedSpec ? section('② AI 润色后的详细规格 (Polished Spec)', p.polishedSpec, 'LLM 一次调用') : ''}
          ${section(`${p.kind === 'custom' ? '③ ' : ''}System Prompt — 应用专属`, p.system, p.kind === 'builtin' ? `${(p.system||'').length} 字符` : '')}
          ${section(`${p.kind === 'custom' ? '④ ' : ''}System Prompt — 通用 API 文档`, p.common, `${(p.common||'').length} 字符`)}
          ${section(`${p.kind === 'custom' ? '⑤ ' : ''}User Message`, p.user)}
        </div>`;
    }

    const modal = document.createElement('div');
    modal.id = 'vibeos-prompt-modal';
    modal.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.4);
      backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
      display:flex;align-items:center;justify-content:center;z-index:99999;
      animation:vibeos-fade-in 0.15s ease-out;
    `;
    modal.innerHTML = `
      <style>
        @keyframes vibeos-fade-in { from { opacity:0; } to { opacity:1; } }
        .vibeos-prompt-copy:hover { background:#007aff !important; color:#fff !important; border-color:#007aff !important; }
      </style>
      <div style="width:780px;max-width:92vw;max-height:82vh;background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,0.25);display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(0,0,0,0.06);">
        <div style="padding:14px 18px;border-bottom:1px solid #e5e5ea;display:flex;align-items:center;gap:10px;">
          <span style="display:inline-flex;width:18px;height:18px;color:#007aff;">${Icons.glyph('code')}</span>
          <div style="flex:1;font-weight:600;font-size:14px;color:#1d1d1f;">Prompt · ${escapeHtml(w.title || 'Untitled')}</div>
          <button id="vibeos-prompt-close" style="background:none;border:none;width:24px;height:24px;border-radius:50%;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;color:#8e8e93;">${Icons.glyph('cross')}</button>
        </div>
        ${bodyHtml}
      </div>
    `;
    document.body.appendChild(modal);

    // 关闭
    const close = () => modal.remove();
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    modal.querySelector('#vibeos-prompt-close')?.addEventListener('click', close);
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    });

    // 复制按钮
    modal.querySelectorAll('.vibeos-prompt-copy').forEach(btn => {
      btn.addEventListener('click', async () => {
        const text = decodeURIComponent(btn.dataset.copy || '');
        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = '已复制 ✓';
          setTimeout(() => { btn.textContent = '复制'; }, 1500);
        } catch (e) {
          btn.textContent = '失败';
          setTimeout(() => { btn.textContent = '复制'; }, 1500);
        }
      });
    });
  },

  openAppEditor(wId) {
    const w = this.windows.get(wId);
    if (!w) return;
    const iframe = w.el?.querySelector('iframe');
    const cur = iframe?.srcdoc || '';
    if (!cur) { Notification.show('无法编辑', '未加载 HTML', 'warn'); return; }
    const ce = w.el.querySelector('.window-content');
    if (!ce) return;
    // Store the HTML without the API bridge so it can be re-injected on each update without duplication
    w._editorHTML = cur;
    ce.innerHTML = `<div style="display:flex;height:100%;"><div style="flex:1;overflow:hidden;"><iframe style="width:100%;height:100%;border:none;" srcdoc="${cur.replace(/"/g,'&quot;')}" sandbox="allow-scripts allow-forms allow-same-origin"></iframe></div><div style="width:300px;display:flex;flex-direction:column;border-left:1px solid #e0e0e0;background:#fafafa;"><div style="padding:10px 14px;font-weight:600;font-size:13px;border-bottom:1px solid #e0e0e0;background:#fff;display:flex;align-items:center;gap:6px;"><span style="display:inline-flex;width:14px;height:14px;color:#1d1d1f;">${Icons.glyph('wrench')}</span>AI 编辑</div><div id="editor-chat-${wId}" style="flex:1;overflow-y:auto;padding:10px;font-size:12px;"></div><div style="padding:10px;border-top:1px solid #e0e0e0;display:flex;gap:6px;"><input id="editor-input-${wId}" placeholder="描述修改需求…" style="flex:1;border:1px solid #d0d0d0;border-radius:6px;padding:6px 10px;font-size:13px;outline:none;" onkeydown="if(event.key==='Enter')WindowManager._editorSend('${wId}')"><button onclick="WindowManager._editorSend('${wId}')" style="padding:6px 14px;background:#007aff;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;">发送</button><button onclick="WindowManager._editorClose('${wId}')" style="padding:6px 10px;background:none;border:1px solid #d0d0d0;border-radius:6px;cursor:pointer;">×</button></div></div></div>`;
  },

  async _editorSend(wId) {
    const w = this.windows.get(wId); if (!w) return;
    const inp = document.getElementById('editor-input-'+wId), chat = document.getElementById('editor-chat-'+wId);
    const msg = inp.value.trim(); if (!msg) return;
    inp.value = ''; chat.innerHTML += `<div style="margin-bottom:8px;"><b>你:</b> ${msg}</div><div class="ai-pending" style="margin-bottom:8px;color:#007aff;">AI 修改中…</div>`; chat.scrollTop = chat.scrollHeight;
    try {
      const c = VibeOSConfig.llm;
      const r = await fetch(`${c.apiEndpoint}/chat/completions`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${c.apiKey}`},body:JSON.stringify({model:c.model,max_tokens:c.maxTokens||32000,temperature:0.3,stream:false,messages:[{role:'system',content:'你是HTML编辑器。根据需求修改HTML。只返回```html代码块。'},{role:'user',content:`原始:\n\`\`\`\n${w._editorHTML.substring(0,6000)}\n\`\`\`\n需求: ${msg}`}]}),signal:AbortSignal.timeout(60000)});
      if(!r.ok) throw new Error('API error '+r.status);
      const d=await r.json(); let ct=d.choices?.[0]?.message?.content||'';
      const m=ct.match(/```html\s*([\s\S]*?)```/)||ct.match(/```\s*([\s\S]*?)```/);
      w._editorHTML = m?m[1].trim():ct;
      const ifr=w.el.querySelector('iframe'); if(ifr) { ifr.srcdoc = this._injectAPI(w._editorHTML, Sandbox.getAppAPI()); ifr.setAttribute('sandbox','allow-scripts allow-forms allow-same-origin'); }
      chat.innerHTML = chat.innerHTML.replace(/<div class="ai-pending"[^>]*>AI 修改中…<\/div>/,'') + `<div style="margin-bottom:8px;color:#007aff;"><b>AI:</b> 已更新</div>`;
    } catch(e) { chat.innerHTML = chat.innerHTML.replace(/<div class="ai-pending"[^>]*>AI 修改中…<\/div>/,'') + `<div style="margin-bottom:8px;color:#ff3b30;">${e.message}</div>`; }
    chat.scrollTop = chat.scrollHeight;
  },

  _editorClose(wId) {
    const w = this.windows.get(wId); if (!w||!w._editorHTML) return;
    const ce = w.el.querySelector('.window-content'); if (!ce) return;
    const h = this._injectAPI(w._editorHTML, Sandbox.getAppAPI());
    ce.innerHTML = `<iframe style="width:100%;height:100%;border:none;" srcdoc="${h.replace(/"/g,'&quot;')}" sandbox="allow-scripts allow-forms allow-same-origin"></iframe>`;
  },

  /* ---- End WindowManager ---- */
};
