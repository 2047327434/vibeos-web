/* ============================================
   VibeOS Sandbox Manager
   Manages iframe sandbox for AI-generated apps
   Handles postMessage communication protocol
   ============================================ */

const Sandbox = {
  /** Communication protocol version */
  PROTOCOL_VERSION: '1.0',

  /** Allowed message types from app → system */
  ALLOWED_ACTIONS: [
    // ===== File System =====
    'fs.readFile',
    'fs.writeFile',
    'fs.deleteFile',
    'fs.listDir',
    'fs.mkdir',
    'fs.exists',
    'fs.stat',
    'fs.copyFile',
    'fs.moveFile',
    'fs.rename',
    // ===== Clipboard =====
    'clipboard.copy',
    'clipboard.paste',
    // ===== Notification =====
    'notification.show',
    // ===== Window control =====
    'window.setTitle',
    'window.close',
    'window.minimize',
    'window.maximize',
    'window.restore',
    'window.setSize',
    'window.focus',
    'window.getInfo',
    // ===== System =====
    'system.getConfig',
    'system.setConfig',
    'system.clearCache',
    'system.getInfo',
    'system.openUrl',
    'system.now',
    // ===== Desktop =====
    'desktop.setWallpaper',
    'desktop.setTheme',
    'desktop.refresh',
    // ===== Apps =====
    'app.launch',
    'app.openFile',
    'app.list',
    'app.installed',
    // ===== Storage (key-value, per app) =====
    'storage.get',
    'storage.set',
    'storage.remove',
    'storage.clear',
    'storage.keys',
    // ===== Dialog (host-rendered modals) =====
    'dialog.alert',
    'dialog.confirm',
    'dialog.prompt',
    // ===== Network (CORS-aware proxy via parent) =====
    'net.fetch',
    // ===== LLM (let apps call the same model the OS uses) =====
    'llm.chat',
  ],

  /** Message ID counter */
  _msgId: 0,

  /**
   * Initialize sandbox message listener
   */
  init() {
    window.addEventListener('message', (event) => {
      this._handleMessage(event);
    });
  },

  /**
   * Handle a message from an app iframe
   */
  async _handleMessage(event) {
    const { type, id, ...params } = event.data || {};
    if (!type || !this.ALLOWED_ACTIONS.includes(type)) return;
    const result = await this._processRequest(type, params, event);

    // Send response back to app
    const iframe = this._findIframe(event.source);
    if (iframe) {
      iframe.contentWindow.postMessage({
        type: type + '.response',
        id: id,
        ...result,
      }, '*');
    }
  },

  /**
   * Process a request from an app
   */
  async _processRequest(type, params, event) {
    try {
      switch (type) {
        case 'fs.readFile': {
          const content = FileSystem.readFile(params.path);
          return { content, error: null };
        }
        case 'fs.writeFile': {
          FileSystem.writeFile(params.path, params.content);
          return { success: true, error: null };
        }
        case 'fs.deleteFile': {
          FileSystem.deleteFile(params.path);
          return { success: true, error: null };
        }
        case 'fs.listDir': {
          const entries = FileSystem.listDir(params.path);
          return { entries, error: null };
        }
        case 'fs.mkdir': {
          FileSystem.mkdir(params.path, params.recursive);
          return { success: true, error: null };
        }
        case 'fs.exists': {
          return { exists: FileSystem.exists(params.path), error: null };
        }
        case 'fs.stat': {
          const stat = FileSystem.stat(params.path);
          return { stat, error: null };
        }
        case 'clipboard.copy': {
          navigator.clipboard?.writeText(params.text).catch(() => {});
          return { success: true, error: null };
        }
        case 'clipboard.paste': {
          try {
            const text = await navigator.clipboard?.readText() || '';
            return { text, error: null };
          } catch (e) { return { text: '', error: '剪贴板读取失败' }; }
        }
        case 'notification.show': {
          Notification.show(params.title || '', params.body || '', params.icon || 'bell');
          return { success: true, error: null };
        }
        case 'window.setTitle': {
          // Find window by scanning for iframe source match
          const iframes = document.querySelectorAll('.window-content iframe');
          for (const iframe of iframes) {
            if (iframe.contentWindow === event.source) {
              const winEl = iframe.closest('.window');
              if (winEl) {
                const titleEl = winEl.querySelector('.window-title');
                if (titleEl) titleEl.textContent = params.title || '';
              }
              break;
            }
          }
          return { success: true, error: null };
        }
        case 'window.close': {
          const iframes = document.querySelectorAll('.window-content iframe');
          for (const iframe of iframes) {
            if (iframe.contentWindow === event.source) {
              const winEl = iframe.closest('.window');
              if (winEl) {
                const id = winEl.getAttribute('data-window-id');
                if (id) WindowManager.close(id);
              }
              break;
            }
          }
          return { success: true, error: null };
        }
        case 'system.getConfig': {
          return {
            config: {
              provider: VibeOSConfig.llm.provider,
              endpoint: VibeOSConfig.llm.apiEndpoint,
              apiKey: VibeOSConfig.llm.apiKey,
              model: VibeOSConfig.llm.model,
              maxTokens: VibeOSConfig.llm.maxTokens,
              temperature: VibeOSConfig.llm.temperature,
              timeout: VibeOSConfig.llm.timeout,
              theme: VibeOSConfig.desktop.theme,
              wallpaperType: VibeOSConfig.desktop.wallpaperType,
              wallpaperColor: VibeOSConfig.desktop.wallpaperColor,
              language: VibeOSConfig.desktop.language,
              cacheExpiry: VibeOSConfig.appCacheExpiry,
            },
            error: null,
          };
        }
        case 'system.setConfig': {
          if (params.config) {
            const c = params.config;
            if (c.provider !== undefined) VibeOSConfig.llm.provider = c.provider;
            if (c.endpoint !== undefined) VibeOSConfig.llm.apiEndpoint = c.endpoint.replace(/\/+$/, '');
            if (c.apiKey !== undefined && c.apiKey.length > 0) VibeOSConfig.llm.apiKey = c.apiKey;
            if (c.model !== undefined) VibeOSConfig.llm.model = c.model;
            if (c.maxTokens !== undefined) VibeOSConfig.llm.maxTokens = c.maxTokens;
            if (c.temperature !== undefined) VibeOSConfig.llm.temperature = c.temperature;
            if (c.timeout !== undefined && c.timeout > 1000) VibeOSConfig.llm.timeout = c.timeout;
            if (c.wallpaperColor !== undefined) VibeOSConfig.desktop.wallpaperColor = c.wallpaperColor;
            if (c.wallpaperType !== undefined) VibeOSConfig.desktop.wallpaperType = c.wallpaperType;
            if (c.theme !== undefined) VibeOSConfig.desktop.theme = c.theme;
            if (c.language !== undefined) VibeOSConfig.desktop.language = c.language;
            VibeOSConfig.save();
          }
          return { success: true, error: null };
        }
        case 'system.clearCache': {
          if (typeof AppGenerator !== 'undefined') AppGenerator.clearCache();
          return { success: true, error: null };
        }
        case 'system.getInfo': {
          return {
            version: VibeOS.version,
            windows: WindowManager.getAll().length,
            llmProvider: VibeOSConfig.llm.provider,
            llmModel: VibeOSConfig.llm.model,
            theme: VibeOSConfig.desktop.theme,
            error: null,
          };
        }
        case 'desktop.setWallpaper': {
          const dt = document.getElementById('desktop');
          if (!dt) return { error: 'Desktop not found' };
          if (params.url) {
            dt.style.backgroundImage = `url(${params.url})`;
            dt.style.backgroundSize = 'cover';
            dt.style.backgroundPosition = 'center';
            dt.style.backgroundColor = '';
          } else if (params.color) {
            dt.style.backgroundImage = '';
            dt.style.backgroundColor = params.color;
          } else if (params.gradient) {
            dt.style.backgroundImage = params.gradient;
            dt.style.backgroundColor = '';
          }
          VibeOSConfig.desktop.wallpaperType = params.type || 'solid';
          if (params.url) VibeOSConfig.desktop.wallpaperUrl = params.url;
          if (params.color) VibeOSConfig.desktop.wallpaperColor = params.color;
          VibeOSConfig.save();
          return { success: true, error: null };
        }
        case 'desktop.setTheme': {
          const dt = document.getElementById('desktop');
          if (dt) {
            if (params.theme === 'dark') {
              dt.classList.add('dark');
            } else {
              dt.classList.remove('dark');
            }
          }
          VibeOSConfig.desktop.theme = params.theme || 'light';
          VibeOSConfig.save();
          return { success: true, error: null };
        }
        case 'app.launch': {
          const name = params.name || params.query || 'New App';
          const icon = params.icon || 'vibecode';
          const query = params.query || params.description || name;
          setTimeout(() => WindowManager.openCustomApp(name, icon, query), 0);
          return { success: true, error: null };
        }
        case 'app.openFile': {
          const path = params.path || '';
          const name = path.split('/').pop() || 'file';
          const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
          const appMap = { txt:'notepad', md:'notepad', js:'vibecode', py:'vibecode', html:'vibecode', css:'vibecode', json:'vibecode', csv:'notepad', log:'notepad' };
          const appId = appMap[ext] || 'notepad';
          const app = AppRegistry?.get?.(appId);
          let query;
          if (app) {
            query = `生成应用编辑文件: ${path}。启动时必须调用 const r = await VibeOSAPI.fs.readFile('${path}'); 加载内容到编辑区。标题显示文件名: ${name}。`;
          } else {
            query = `生成简易文件查看器，打开: ${path}。启动时调用 VibeOSAPI.fs.readFile('${path}') 加载内容并显示。`;
          }
          setTimeout(() => WindowManager.openCustomApp(app?.name||name, app?.icon||'📄', query), 0);
          return { success: true, error: null };
        }

        /* ===== File System extras ===== */
        case 'fs.copyFile': {
          const r = FileSystem.readFile(params.from);
          FileSystem.writeFile(params.to, r);
          return { success: true, error: null };
        }
        case 'fs.moveFile': {
          const r = FileSystem.readFile(params.from);
          FileSystem.writeFile(params.to, r);
          FileSystem.deleteFile(params.from);
          return { success: true, error: null };
        }
        case 'fs.rename': {
          const parent = params.path.substring(0, params.path.lastIndexOf('/')) || '/';
          const newPath = (parent === '/' ? '' : parent) + '/' + params.newName;
          const r = FileSystem.readFile(params.path);
          FileSystem.writeFile(newPath, r);
          FileSystem.deleteFile(params.path);
          return { success: true, error: null, path: newPath };
        }

        /* ===== Window control ===== */
        case 'window.minimize': {
          const w = this._findWindow(event.source);
          if (w) WindowManager.minimize?.(w.id);
          return { success: !!w, error: w ? null : 'window not found' };
        }
        case 'window.maximize': {
          const w = this._findWindow(event.source);
          if (w) WindowManager.maximize?.(w.id);
          return { success: !!w, error: w ? null : 'window not found' };
        }
        case 'window.restore': {
          const w = this._findWindow(event.source);
          if (w) WindowManager.restore?.(w.id);
          return { success: !!w, error: w ? null : 'window not found' };
        }
        case 'window.setSize': {
          const w = this._findWindow(event.source);
          if (w && w.el) {
            if (params.width)  w.el.style.width  = params.width + 'px';
            if (params.height) w.el.style.height = params.height + 'px';
          }
          return { success: !!w, error: w ? null : 'window not found' };
        }
        case 'window.focus': {
          const w = this._findWindow(event.source);
          if (w) WindowManager.focus?.(w.id);
          return { success: !!w, error: w ? null : 'window not found' };
        }
        case 'window.getInfo': {
          const w = this._findWindow(event.source);
          if (!w) return { error: 'window not found' };
          const r = w.el?.getBoundingClientRect?.() || {};
          return {
            id: w.id, title: w.title || '',
            width: Math.round(r.width||0), height: Math.round(r.height||0),
            x: Math.round(r.left||0), y: Math.round(r.top||0),
            error: null,
          };
        }

        /* ===== System extras ===== */
        case 'system.openUrl': {
          if (params.url) window.open(params.url, '_blank');
          return { success: true, error: null };
        }
        case 'system.now': {
          return { now: Date.now(), iso: new Date().toISOString(), error: null };
        }

        /* ===== Desktop extras ===== */
        case 'desktop.refresh': {
          if (typeof Desktop !== 'undefined') Desktop._renderIcons?.();
          return { success: true, error: null };
        }

        /* ===== App registry ===== */
        case 'app.list': {
          const list = (AppRegistry?.getAll?.() || []).map(a => ({
            id: a.id, name: a.name, description: a.description || '',
          }));
          return { apps: list, error: null };
        }
        case 'app.installed': {
          const list = (typeof InstalledApps !== 'undefined' && InstalledApps.getAll)
            ? InstalledApps.getAll() : [];
          return { apps: list.map(a => ({ id: a.id, name: a.name })), error: null };
        }

        /* ===== Storage (per-app key-value, scoped by window id) ===== */
        case 'storage.get': {
          const ns = this._storageNs(event.source);
          const v = localStorage.getItem(ns + ':' + params.key);
          return { value: v === null ? null : v, error: null };
        }
        case 'storage.set': {
          const ns = this._storageNs(event.source);
          localStorage.setItem(ns + ':' + params.key, String(params.value ?? ''));
          return { success: true, error: null };
        }
        case 'storage.remove': {
          const ns = this._storageNs(event.source);
          localStorage.removeItem(ns + ':' + params.key);
          return { success: true, error: null };
        }
        case 'storage.clear': {
          const ns = this._storageNs(event.source);
          const prefix = ns + ':';
          const keys = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(prefix)) keys.push(k);
          }
          keys.forEach(k => localStorage.removeItem(k));
          return { success: true, error: null };
        }
        case 'storage.keys': {
          const ns = this._storageNs(event.source);
          const prefix = ns + ':';
          const keys = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(prefix)) keys.push(k.substring(prefix.length));
          }
          return { keys, error: null };
        }

        /* ===== Dialogs (host-rendered, falls back to native) ===== */
        case 'dialog.alert': {
          alert(params.message || '');
          return { success: true, error: null };
        }
        case 'dialog.confirm': {
          const ok = confirm(params.message || '');
          return { result: ok, error: null };
        }
        case 'dialog.prompt': {
          const v = prompt(params.message || '', params.defaultValue || '');
          return { value: v, error: null };
        }

        /* ===== Network (host-side fetch, bypasses iframe srcdoc same-origin quirks) ===== */
        case 'net.fetch': {
          try {
            const res = await fetch(params.url, {
              method: params.method || 'GET',
              headers: params.headers || {},
              body: params.body || undefined,
            });
            const ct = res.headers.get('content-type') || '';
            const text = await res.text();
            let json = null;
            if (ct.includes('application/json')) {
              try { json = JSON.parse(text); } catch (e) {}
            }
            return { ok: res.ok, status: res.status, text, json, error: null };
          } catch (e) {
            return { ok: false, status: 0, text: '', json: null, error: e.message };
          }
        }

        /* ===== LLM ===== */
        case 'llm.chat': {
          const cfg = VibeOSConfig.llm;
          if (!cfg.apiKey || !cfg.apiEndpoint) return { error: 'LLM 未配置' };
          try {
            const res = await fetch(`${cfg.apiEndpoint}/chat/completions`, {
              method: 'POST',
              headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${cfg.apiKey}` },
              body: JSON.stringify({
                model: cfg.model,
                messages: params.messages || [{ role:'user', content: params.prompt || '' }],
                max_tokens: params.maxTokens || 2048,
                temperature: params.temperature ?? 0.3,
                stream: false,
              }),
            });
            const data = await res.json();
            const content = data.choices?.[0]?.message?.content || '';
            return { content, usage: data.usage || null, error: null };
          } catch (e) {
            return { error: e.message };
          }
        }
        default:
          return { error: 'Unknown action: ' + type };
      }
    } catch (e) {
      return { error: e.message };
    }
  },

  /**
   * Find the iframe element from a MessageEvent source
   */
  _findIframe(source) {
    const iframes = document.querySelectorAll('.window-content iframe');
    for (const iframe of iframes) {
      if (iframe.contentWindow === source) {
        return iframe;
      }
    }
    return null;
  },

  /**
   * Find the {id, el, title} of the window that owns a given iframe source
   */
  _findWindow(source) {
    const iframes = document.querySelectorAll('.window-content iframe');
    for (const iframe of iframes) {
      if (iframe.contentWindow === source) {
        const winEl = iframe.closest('.window');
        if (!winEl) return null;
        const id = winEl.getAttribute('data-window-id') || '';
        const titleEl = winEl.querySelector('.window-title');
        return { id, el: winEl, title: titleEl?.textContent || '' };
      }
    }
    return null;
  },

  /**
   * Per-app storage namespace (based on window id)
   */
  _storageNs(source) {
    const w = this._findWindow(source);
    return 'vibeos_appdata_' + (w?.id || 'anon');
  },

  /**
   * Generate sandbox communication API code to inject into generated apps
   */
  getAppAPI() {
    return `
<script>
// VibeOS App API - Communication Bridge
const VibeOSAPI = {
  _id: 0,
  _pending: {},

  _send(type, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this._id;
      const timer = setTimeout(() => {
        if (this._pending[id]) {
          delete this._pending[id];
          reject(new Error('Request timeout'));
        }
      }, 30000);
      this._pending[id] = { resolve, reject, timer };
      window.parent.postMessage({ type, id, ...params }, '*');
    });
  },

  fs: {
    readFile(path) { return VibeOSAPI._send('fs.readFile', { path }); },
    writeFile(path, content) { return VibeOSAPI._send('fs.writeFile', { path, content }); },
    deleteFile(path) { return VibeOSAPI._send('fs.deleteFile', { path }); },
    listDir(path) { return VibeOSAPI._send('fs.listDir', { path }); },
    mkdir(path, recursive) { return VibeOSAPI._send('fs.mkdir', { path, recursive }); },
    exists(path) { return VibeOSAPI._send('fs.exists', { path }); },
    stat(path) { return VibeOSAPI._send('fs.stat', { path }); },
    copyFile(from, to) { return VibeOSAPI._send('fs.copyFile', { from, to }); },
    moveFile(from, to) { return VibeOSAPI._send('fs.moveFile', { from, to }); },
    rename(path, newName) { return VibeOSAPI._send('fs.rename', { path, newName }); },
  },

  clipboard: {
    copy(text) { return VibeOSAPI._send('clipboard.copy', { text }); },
    paste() { return VibeOSAPI._send('clipboard.paste'); },
  },

  notification: {
    show(title, body, icon) { return VibeOSAPI._send('notification.show', { title, body, icon }); },
  },

  window: {
    setTitle(title) { document.title = title; return VibeOSAPI._send('window.setTitle', { title }); },
    close() { return VibeOSAPI._send('window.close'); },
    minimize() { return VibeOSAPI._send('window.minimize'); },
    maximize() { return VibeOSAPI._send('window.maximize'); },
    restore() { return VibeOSAPI._send('window.restore'); },
    setSize(width, height) { return VibeOSAPI._send('window.setSize', { width, height }); },
    focus() { return VibeOSAPI._send('window.focus'); },
    getInfo() { return VibeOSAPI._send('window.getInfo'); },
  },

  system: {
    getConfig() { return VibeOSAPI._send('system.getConfig'); },
    setConfig(config) { return VibeOSAPI._send('system.setConfig', { config }); },
    clearCache() { return VibeOSAPI._send('system.clearCache'); },
    getInfo() { return VibeOSAPI._send('system.getInfo'); },
    openUrl(url) { return VibeOSAPI._send('system.openUrl', { url }); },
    now() { return VibeOSAPI._send('system.now'); },
  },

  desktop: {
    setWallpaper(opts) { return VibeOSAPI._send('desktop.setWallpaper', opts); },
    setTheme(theme) { return VibeOSAPI._send('desktop.setTheme', { theme }); },
    refresh() { return VibeOSAPI._send('desktop.refresh'); },
  },

  app: {
    launch(name, icon, description) { return VibeOSAPI._send('app.launch', { name, icon, query: description }); },
    openFile(path) { return VibeOSAPI._send('app.openFile', { path }); },
    list() { return VibeOSAPI._send('app.list'); },
    installed() { return VibeOSAPI._send('app.installed'); },
  },

  storage: {
    get(key) { return VibeOSAPI._send('storage.get', { key }); },
    set(key, value) { return VibeOSAPI._send('storage.set', { key, value }); },
    remove(key) { return VibeOSAPI._send('storage.remove', { key }); },
    clear() { return VibeOSAPI._send('storage.clear'); },
    keys() { return VibeOSAPI._send('storage.keys'); },
  },

  dialog: {
    alert(message) { return VibeOSAPI._send('dialog.alert', { message }); },
    confirm(message) { return VibeOSAPI._send('dialog.confirm', { message }); },
    prompt(message, defaultValue) { return VibeOSAPI._send('dialog.prompt', { message, defaultValue }); },
  },

  net: {
    fetch(url, opts) { return VibeOSAPI._send('net.fetch', opts || { url }); },
  },

  llm: {
    chat(messages, opts) {
      const params = opts || {};
      if (typeof messages === 'string') { params.prompt = messages; }
      else { params.messages = messages; }
      return VibeOSAPI._send('llm.chat', params);
    },
  },
};

// Listen for responses from host
window.addEventListener('message', (event) => {
  const { type, id, ...data } = event.data || {};
  if (type && type.endsWith('.response') && VibeOSAPI._pending[id]) {
    clearTimeout(VibeOSAPI._pending[id].timer);
    if (data.error) {
      VibeOSAPI._pending[id].reject(new Error(data.error));
    } else {
      VibeOSAPI._pending[id].resolve(data);
    }
    delete VibeOSAPI._pending[id];
  }
});
<\/script>
`;
  },
};
