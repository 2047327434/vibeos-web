/**
 * SettingsPanel — 原生系统设置面板
 * 从 VibeOS 菜单打开，不依赖 LLM 生成。
 * 所有设置项直接读写 VibeOSConfig + 调用系统 API 实时生效。
 */
const SettingsPanel = {
  _overlay: null,

  /** 打开设置面板 */
  open() {
    if (this._overlay) { this._overlay.classList.add('visible'); return; }
    this._build();
    this._overlay.classList.add('visible');
  },

  /** 关闭 */
  close() {
    if (this._overlay) this._overlay.classList.remove('visible');
  },

  /** 构建面板 DOM */
  _build() {
    const cfg = VibeOSConfig.llm;

    const overlay = document.createElement('div');
    overlay.className = 'settings-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', '系统设置');

    overlay.innerHTML = `
      <div class="settings-panel" role="document">
        <div class="settings-header">
          <span class="settings-title">系统设置</span>
          <button class="settings-close" aria-label="关闭">&times;</button>
        </div>
        <div class="settings-body">

          <!-- LLM 基础配置 -->
          <div class="settings-section">
            <div class="settings-section-title">LLM 配置</div>
            <label class="settings-row">
              <span class="settings-label">Provider</span>
              <select id="llm-provider" class="settings-input">
                <option value="openai">OpenAI 兼容</option>
                <option value="anthropic">Anthropic</option>
                <option value="custom">自定义</option>
                <option value="mock">Mock（离线）</option>
              </select>
            </label>
            <label class="settings-row">
              <span class="settings-label">API 端点</span>
              <input id="llm-endpoint" class="settings-input" type="text" placeholder="https://api.openai.com/v1" spellcheck="false">
            </label>
            <label class="settings-row">
              <span class="settings-label">API Key</span>
              <input id="llm-apikey" class="settings-input" type="password" placeholder="sk-..." spellcheck="false">
            </label>
            <label class="settings-row">
              <span class="settings-label">模型</span>
              <input id="llm-model" class="settings-input" type="text" placeholder="gpt-4o / glm-5.2 / ..." spellcheck="false">
            </label>
          </div>

          <!-- LLM 高级参数 -->
          <div class="settings-section">
            <div class="settings-section-title">高级参数</div>
            <label class="settings-row">
              <span class="settings-label">Max Tokens: <em id="tok-val" class="settings-hint"></em></span>
              <input id="llm-maxtokens" class="settings-input" type="range" min="1024" max="131072" step="1024">
            </label>
            <label class="settings-row">
              <span class="settings-label">Temperature: <em id="temp-val" class="settings-hint"></em></span>
              <input id="llm-temp" class="settings-input" type="range" min="0" max="2" step="0.1">
            </label>
            <label class="settings-row">
              <span class="settings-label">超时（秒）</span>
              <input id="llm-timeout" class="settings-input" type="number" min="10" max="600" step="10">
            </label>
          </div>

          <!-- 连通性测试 -->
          <div class="settings-section">
            <div class="settings-section-title">连通性测试</div>
            <button id="llm-test-btn" class="settings-btn settings-btn-primary">测试连接</button>
            <div id="llm-test-result" class="settings-test-result" style="display:none;"></div>
          </div>

          <!-- 桌面 -->
          <div class="settings-section">
            <div class="settings-section-title">桌面</div>
            <label class="settings-row">
              <span class="settings-label">主题</span>
              <button id="theme-light" class="settings-btn settings-btn-toggle">浅色</button>
              <button id="theme-dark" class="settings-btn settings-btn-toggle">深色</button>
            </label>
            <div class="settings-row" style="flex-direction:column;align-items:flex-start;gap:6px;">
              <span class="settings-label">壁纸颜色</span>
              <div id="wallpaper-swatches" class="settings-swatches"></div>
            </div>
          </div>

          <!-- 缓存 -->
          <div class="settings-section">
            <div class="settings-section-title">缓存</div>
            <button id="cache-clear-btn" class="settings-btn settings-btn-secondary">清除应用缓存</button>
          </div>

        </div>
        <div class="settings-footer">
          <button id="llm-reset-btn" class="settings-btn settings-btn-secondary">恢复默认</button>
          <button id="llm-save-btn" class="settings-btn settings-btn-primary">保存并关闭</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    this._overlay = overlay;

    // --- 填充当前配置 ---
    const $ = (id) => overlay.querySelector('#' + id);
    $('llm-provider').value = cfg.provider || 'openai';
    $('llm-endpoint').value = cfg.apiEndpoint || '';
    $('llm-apikey').value = cfg.apiKey || '';
    $('llm-model').value = cfg.model || '';
    $('llm-maxtokens').value = cfg.maxTokens || 65536;
    $('llm-temp').value = cfg.temperature ?? 0.3;
    $('llm-timeout').value = Math.round((cfg.timeout || 120000) / 1000);
    this._updateHints(overlay);

    // --- 壁纸色块 ---
    const swatchEl = $('wallpaper-swatches');
    const wallpaperColors = ['#ffffff', '#1a365d', '#1a4731', '#2d1b69', '#4a148c', '#004d40'];
    wallpaperColors.forEach((color) => {
      const btn = document.createElement('button');
      btn.className = 'settings-swatch';
      btn.style.background = color;
      btn.title = color;
      btn.addEventListener('click', () => {
        const dt = document.getElementById('desktop');
        if (dt) {
          dt.style.backgroundImage = '';
          dt.style.backgroundColor = color;
        }
        VibeOSConfig.desktop.wallpaperType = 'solid';
        VibeOSConfig.desktop.wallpaperColor = color;
        VibeOSConfig.save();
        Notification?.show?.('壁纸', '已更新', 'check', 2000);
      });
      swatchEl.appendChild(btn);
    });

    // --- 主题按钮实时切换 ---
    const applyTheme = (theme) => {
      const dt = document.getElementById('desktop');
      if (dt) {
        if (theme === 'dark') dt.classList.add('dark');
        else dt.classList.remove('dark');
      }
      VibeOSConfig.desktop.theme = theme;
      VibeOSConfig.save();
      Notification?.show?.('主题', theme === 'dark' ? '已切换到深色' : '已切换到浅色', 'check', 2000);
    };
    $('theme-light').addEventListener('click', () => applyTheme('light'));
    $('theme-dark').addEventListener('click', () => applyTheme('dark'));

    // --- 清除缓存 ---
    $('cache-clear-btn').addEventListener('click', () => {
      if (typeof AppGenerator !== 'undefined') AppGenerator.clearCache();
      if (typeof VibeOS !== 'undefined' && VibeOS._llmStats) {
        VibeOS._llmStats.totalCalls = 0;
        VibeOS._llmStats.successCalls = 0;
        VibeOS._llmStats.failedCalls = 0;
        VibeOS._llmStats.totalPromptTokens = 0;
        VibeOS._llmStats.totalCompletionTokens = 0;
      }
      Notification?.show?.('缓存', '应用缓存已清除', 'check', 2000);
    });

    // --- 滑块实时提示 ---
    $('llm-maxtokens').addEventListener('input', () => this._updateHints(overlay));
    $('llm-temp').addEventListener('input', () => this._updateHints(overlay));

    // --- 事件绑定 ---
    overlay.querySelector('.settings-close').addEventListener('click', () => this.close());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this.close(); });

    $('llm-test-btn').addEventListener('click', () => this._runTest(overlay));
    $('llm-reset-btn').addEventListener('click', () => this._resetDefaults(overlay));
    $('llm-save-btn').addEventListener('click', () => this._save(overlay));

    // Escape 关闭
    overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.close(); });
  },

  /** 更新滑块旁边的数值提示 */
  _updateHints(overlay) {
    const tok = overlay.querySelector('#llm-maxtokens');
    const temp = overlay.querySelector('#llm-temp');
    overlay.querySelector('#tok-val').textContent = tok.value;
    overlay.querySelector('#temp-val').textContent = temp.value;
  },

  /** 收集面板中的值 */
  _collect(overlay) {
    const $ = (id) => overlay.querySelector('#' + id);
    return {
      provider: $('llm-provider').value,
      apiEndpoint: $('llm-endpoint').value.trim(),
      apiKey: $('llm-apikey').value.trim(),
      model: $('llm-model').value.trim(),
      maxTokens: parseInt($('llm-maxtokens').value, 10),
      temperature: parseFloat($('llm-temp').value),
      timeout: (parseInt($('llm-timeout').value, 10) || 120) * 1000,
    };
  },

  /** 连通性测试（精简版，最快 8 秒超时） */
  async _runTest(overlay) {
    const $ = (id) => overlay.querySelector('#' + id);
    const vals = this._collect(overlay);
    const resultEl = $('llm-test-result');
    const btn = $('llm-test-btn');

    if (vals.provider === 'mock') {
      resultEl.style.display = 'block';
      resultEl.className = 'settings-test-result test-info';
      resultEl.textContent = 'Mock 模式无需测试。';
      return;
    }
    if (!vals.apiEndpoint || !vals.apiKey) {
      resultEl.style.display = 'block';
      resultEl.className = 'settings-test-result test-fail';
      resultEl.textContent = '请先填写 API 端点和 API Key。';
      return;
    }

    btn.disabled = true;
    btn.textContent = '测试中…';
    resultEl.style.display = 'block';
    resultEl.className = 'settings-test-result test-pending';
    resultEl.textContent = '正在连接…';

    const url = vals.apiEndpoint.replace(/\/+$/, '') + '/chat/completions';
    const t0 = Date.now();

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + vals.apiKey },
        body: JSON.stringify({
          model: vals.model || 'gpt-4o',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const elapsed = Date.now() - t0;
      const ct = resp.headers.get('content-type') || '';
      const rawText = await resp.text();

      if (!resp.ok) {
        resultEl.className = 'settings-test-result test-fail';
        resultEl.textContent = `HTTP ${resp.status}: ${rawText.substring(0, 120)}`;
      } else if (!ct.includes('application/json')) {
        resultEl.className = 'settings-test-result test-fail';
        resultEl.textContent = '响应不是 JSON 格式，请检查端点是否包含 /v1。';
      } else {
        const data = JSON.parse(rawText);
        const reply = data.choices?.[0]?.message?.content || '(空)';
        resultEl.className = 'settings-test-result test-ok';
        resultEl.textContent = `连接成功 (${elapsed}ms) 模型: ${data.model || vals.model}`;
      }
    } catch (err) {
      const msg = err.name === 'AbortError' ? '请求超时' : err.message;
      resultEl.className = 'settings-test-result test-fail';
      resultEl.textContent = msg;
    } finally {
      btn.disabled = false;
      btn.textContent = '测试连接';
    }
  },

  /** 恢复默认值 */
  _resetDefaults(overlay) {
    const $ = (id) => overlay.querySelector('#' + id);
    $('llm-provider').value = 'openai';
    $('llm-endpoint').value = '';
    $('llm-apikey').value = '';
    $('llm-model').value = '';
    $('llm-maxtokens').value = 65536;
    $('llm-temp').value = 0.3;
    $('llm-timeout').value = 120;
    this._updateHints(overlay);
    const r = $('llm-test-result');
    r.style.display = 'none';
  },

  /** 保存配置 */
  _save(overlay) {
    const vals = this._collect(overlay);

    // 写入全局内存配置
    VibeOSConfig.llm.provider = vals.provider;
    VibeOSConfig.llm.apiEndpoint = vals.apiEndpoint.replace(/\/+$/, '');
    VibeOSConfig.llm.apiKey = vals.apiKey;
    VibeOSConfig.llm.model = vals.model;
    VibeOSConfig.llm.maxTokens = vals.maxTokens;
    VibeOSConfig.llm.temperature = vals.temperature;
    VibeOSConfig.llm.timeout = vals.timeout;

    // 持久化
    try {
      VibeOSConfig.save();
    } catch (e) {
      Notification?.show('保存失败', e.message, 'error');
      return;
    }

    this.close();
    Notification?.show('配置已保存', `Provider: ${vals.provider} | Model: ${vals.model}`, 'check', 3000);
  },
};