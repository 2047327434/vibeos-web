/* ============================================
   VibeOS Notification System
   Toast notifications
   ============================================ */

const Notification = {
  /** Queue of pending notifications */
  _queue: [],
  /** Whether a notification is currently showing */
  _showing: false,
  /** Notification timeout ID */
  _timeout: null,

  /**
   * Show a notification toast
   * @param {string} title
   * @param {string} body
   * @param {string} icon - glyph 名 ('bell','warn','info'…) 或 SVG 字符串；兼容旧 emoji
   * @param {number} duration - ms, default 3000
   */
  show(title, body, icon = 'bell', duration = 4000) {
    // Record in history
    if (!this._history) this._history = [];
    this._history.unshift({ title, body, icon, time: Date.now() });
    if (this._history.length > 20) this._history = this._history.slice(0, 20);
    // Show toast
    this._queue.push({ title, body, icon, duration });
    this._processQueue();
  },

  /** Get notification history */
  getHistory() {
    return this._history || [];
  },

  /** Ensure the notification container exists */
  _ensureContainer() {
    let container = document.getElementById('notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.setAttribute('role', 'region');
      container.setAttribute('aria-label', '通知');
      document.body.appendChild(container);
    }
    return container;
  },

  _processQueue() {
    if (this._showing || this._queue.length === 0) return;
    this._showing = true;

    const { title, body, icon, duration } = this._queue.shift();
    this._renderToast(title, body, icon, duration);
  },

  _renderToast(title, body, icon, duration) {
    const container = this._ensureContainer();
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    let iconHtml = '';
    if (typeof icon === 'string' && icon.trim().startsWith('<svg')) iconHtml = icon;
    else if (typeof icon === 'string' && /^[a-z0-9-]+$/i.test(icon)) iconHtml = (typeof Icons !== 'undefined' ? Icons.glyph(icon) : '');
    else iconHtml = (typeof Icons !== 'undefined' ? Icons.resolveGlyph(icon) : icon);
    // Escape title and body to prevent XSS
    const esc = (s) => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    toast.innerHTML = `
      <div class="notification-icon" style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;color:var(--color-accent);flex-shrink:0;">${iconHtml}</div>
      <div class="notification-content">
        <div class="notification-title">${esc(title)}</div>
        <div class="notification-body">${esc(body)}</div>
      </div>
    `;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });

    // Auto-dismiss
    this._timeout = setTimeout(() => {
      this._dismiss(toast);
    }, duration);

    // Click to dismiss
    toast.addEventListener('click', () => {
      clearTimeout(this._timeout);
      this._dismiss(toast);
    });
  },

  _dismiss(toast) {
    toast.classList.remove('visible');
    toast.addEventListener('transitionend', () => {
      toast.remove();
      this._showing = false;
      this._processQueue();
    }, { once: true });

    // Fallback remove
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
      if (this._showing) {
        this._showing = false;
        this._processQueue();
      }
    }, 400);
  },
};
