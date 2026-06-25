/* ============================================
   VibeOS AI App Generator
   Generates app windows via LLM API (OpenAI-compatible)
   Supports mock mode for demo without API key
   ============================================ */

const AppGenerator = {
  /** Cache for generated apps */
  _cache: {},

  /** Whether currently generating */
  _generating: new Map(),

  /**
   * Generate an app window via LLM
   * @param {string} appId - app identifier from registry
   * @param {object} options - additional generation options
   * @param {string} options.userPrompt - custom user prompt override
   */
  async generate(appId, options = {}) {
    const app = AppRegistry.get(appId);
    if (!app) return;

    // Clear any cached result to force fresh generation
    const cacheKey = `${appId}_${options.userPrompt || 'default'}`;
    delete this._cache[cacheKey];

    this._showLoading(appId, app);

    try {
      let html;

      if (VibeOSConfig.llm.provider !== 'mock' && VibeOSConfig.llm.apiKey) {
        // Call LLM API
        html = await this._callLLM(app, options.userPrompt);
      } else {
        // Use mock built-in apps
        html = this._getMockApp(appId, options.userPrompt);
        if (VibeOSConfig.llm.provider !== 'mock') {
          Notification?.show?.('Mock 模式', '未配置 API Key，使用内置 Mock 应用', 'warn', 3000);
        }
        await this._delay(600);
      }

      // Cache successful result
      this._cache[cacheKey] = { html, timestamp: Date.now() };
      this._renderApp(appId, html, app);

    } catch (error) {
      console.error(`[AppGen] Failed:`, error.name, error.message);
      let msg = error.message || '未知错误';
      if (msg.includes('Failed to fetch') || error.name === 'TypeError') {
        msg = '无法连接 API。请确认：\n1. 正在通过 http://localhost:8080 访问\n2. 网络可访问配置的 API 端点\n3. LLM API 设置中配置正确';
      } else if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        msg = 'API 请求超时（2分钟），请重试';
      }
      this._showError(appId, app, msg);
    }
  },

  /**
   * Call API — non-streaming (kept for backward compat)
   */
  async _callLLM(app, userPrompt) {
    return this._callLLMStream(app, userPrompt, null);
  },

  /**
   * Call API with SSE streaming support
   * @param {Function|null} onChunk - called with (deltaText, fullText) on each token
   * @returns {string} extracted HTML
   */
  async _callLLMStream(app, userPrompt, onChunk) {
    const config = VibeOSConfig.llm;
    if (!config.apiEndpoint) throw new Error('API 端点未配置');
    if (!config.apiKey) throw new Error('API Key 未配置');
    if (!config.model) throw new Error('模型名称未配置');

    // === LLM 实时统计：注册一次请求 ===
    const stats = (window.VibeOS && VibeOS._llmStats) || null;
    const reqStartTs = performance.now();
    let firstByteTs = 0;
    let lastByteTs = 0;
    let promptCharsApprox = 0;
    let outputChars = 0;
    let usageTokens = null; // 来自 SSE 末尾或非流式响应的真实 usage
    if (stats) {
      stats.totalCalls++;
      stats.activeCalls++;
      stats.lastModel = config.model;
      stats.lastEndpoint = config.apiEndpoint;
    }

    let systemPrompt;
    try {
      systemPrompt = await this._loadSystemPrompt(app.promptFile);
    } catch (e) {
      systemPrompt = this._getDefaultSystemPrompt();
    }

    const fullSystemPrompt = systemPrompt + '\n\n' + this._getCommonSystemPrompt();
    const userMsg = userPrompt || `请生成${app.name}应用`;
    // 规范化 URL：去除末尾斜杠，防止 //chat/completions 双斜杠
    const baseUrl = config.apiEndpoint.replace(/\/+$/, '');
    const url = `${baseUrl}/chat/completions`;
    promptCharsApprox = (fullSystemPrompt.length + userMsg.length);
    if (stats) stats.lastPromptChars = promptCharsApprox;

    const reqBody = {
      model: config.model,
      messages: [
        { role: 'system', content: fullSystemPrompt },
        { role: 'user', content: userMsg },
      ],
      max_tokens: config.maxTokens || 65536,
      temperature: config.temperature ?? 0.3,
      stream: onChunk ? true : false,
    };

    // Use AbortController for connection-only timeout (not stream timeout)
    const controller = new AbortController();
    const connectTimeout = setTimeout(() => controller.abort(), config.timeout || 120000);

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(reqBody),
        signal: controller.signal,
      });
      // Connection succeeded — clear the connection timeout
      clearTimeout(connectTimeout);
    } catch (e) {
      clearTimeout(connectTimeout);
      if (stats) { stats.activeCalls = Math.max(0, stats.activeCalls - 1); stats.lastError = e.message || String(e); stats.lastErrorTs = Date.now(); stats.failedCalls++; }
      if (e.name === 'TypeError') throw new Error('无法连接 API\n确保通过 http://localhost:8080 访问');
      if (e.name === 'AbortError') throw new Error('连接超时（2分钟），请重试');
      throw e;
    }

    if (!response.ok) {
      const err = await response.text();
      if (stats) { stats.activeCalls = Math.max(0, stats.activeCalls - 1); stats.lastError = `HTTP ${response.status}`; stats.lastErrorTs = Date.now(); stats.failedCalls++; }
      throw new Error(`API 错误 (${response.status}): ${err.substring(0, 150)}`);
    }

    // 检查响应类型 — 如果服务器返回 HTML 而非 JSON，给出友好提示
    const respContentType = response.headers.get('content-type') || '';
    if (!respContentType.includes('application/json') && !respContentType.includes('text/event-stream')) {
      const bodyPreview = await response.text().catch(() => '');
      if (stats) { stats.activeCalls = Math.max(0, stats.activeCalls - 1); stats.lastError = '非 JSON 响应'; stats.lastErrorTs = Date.now(); stats.failedCalls++; }
      const isHtml = respContentType.includes('text/html') || bodyPreview.trimStart().startsWith('<');
      const hint = isHtml
        ? 'API 端点可能缺少 /v1 路径，或端点地址不正确。\n请检查「VibeOS 菜单 → LLM 设置」中的端点配置。'
        : `Content-Type: ${respContentType}`;
      throw new Error(`API 返回了非 JSON 响应。\n${hint}`);
    }

    // 记录连接建立耗时（首次响应头到达）
    if (stats) {
      stats.lastConnectMs = Math.round(performance.now() - reqStartTs);
    }

    // Non-streaming path
    if (!onChunk) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      if (data.usage) usageTokens = data.usage;
      if (stats) {
        stats.activeCalls = Math.max(0, stats.activeCalls - 1);
        stats.successCalls++;
        stats.lastDurationMs = Math.round(performance.now() - reqStartTs);
        stats.lastUsage = usageTokens;
        if (usageTokens) {
          stats.totalPromptTokens += usageTokens.prompt_tokens || 0;
          stats.totalCompletionTokens += usageTokens.completion_tokens || 0;
        }
      }
      if (!content || content.length < 20) {
        const hint = content.length === 0
          ? 'API 返回了空内容。请检查模型名称是否正确，或 API Key 是否有效。'
          : `内容过短，可能是模型拒绝或限流。`;
        throw new Error(`API 返回内容过短 (${content.length} 字符)\n${hint}`);
      }
      return this._extractHTML(content);
    }

    // Streaming path — read SSE (no timeout on stream reading)
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!firstByteTs) {
          firstByteTs = performance.now();
          if (stats) stats.lastFirstByteMs = Math.round(firstByteTs - reqStartTs);
        }
        lastByteTs = performance.now();
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            const text = delta?.content || '';
            const reasoning = delta?.reasoning_content || '';
            // OpenAI 兼容流末尾会带 usage（非每个 chunk）
            if (parsed.usage) {
              usageTokens = parsed.usage;
            }
            // Only accumulate actual content (skip reasoning tokens)
            if (text) {
              fullContent += text;
              outputChars += text.length;
              if (stats) {
                stats.lastOutputChars = outputChars;
                const elapsed = (performance.now() - (firstByteTs || reqStartTs)) / 1000;
                stats.lastTokensPerSec = elapsed > 0 ? Math.round((outputChars / 4) / elapsed * 10) / 10 : 0; // 约 4 char/token
              }
              onChunk(text, fullContent);
            }
            // Show reasoning status differently if needed
            if (reasoning && onChunk && fullContent.length === 0) {
              onChunk('', '(思考中...)');
            }
          } catch (e) {}
        }
      }
    } catch (streamErr) {
      // Stream was interrupted — use what we have if substantial
      if (fullContent.length > 500) {
        console.warn('[LLM] Stream interrupted but have', fullContent.length, 'chars, using partial');
      } else {
        if (stats) { stats.activeCalls = Math.max(0, stats.activeCalls - 1); stats.failedCalls++; stats.lastError = streamErr.message; stats.lastErrorTs = Date.now(); }
        throw new Error(`流中断: ${streamErr.message}`);
      }
    }

    // Flush remaining buffer
    if (buffer.startsWith('data: ') && buffer.slice(6).trim() !== '[DONE]') {
      try {
        const parsed = JSON.parse(buffer.slice(6).trim());
        const text = parsed.choices?.[0]?.delta?.content || '';
        if (text) { fullContent += text; if (onChunk) onChunk(text, fullContent); }
      } catch (e) {}
    }

    if (!fullContent || fullContent.length < 20) {
      if (stats) { stats.activeCalls = Math.max(0, stats.activeCalls - 1); stats.failedCalls++; stats.lastError = '响应过短'; stats.lastErrorTs = Date.now(); }
      const hint = fullContent.length === 0
        ? '流式响应无内容。请检查模型名称是否正确，或端点是否完整（含 /v1 路径）。'
        : `流式内容过短，可能是模型拒绝或限流。`;
      throw new Error(`API 返回内容过短 (${fullContent.length} 字符)\n${hint}`);
    }
    // 流结束 — 上报统计
    if (stats) {
      stats.activeCalls = Math.max(0, stats.activeCalls - 1);
      stats.successCalls++;
      stats.lastDurationMs = Math.round(performance.now() - reqStartTs);
      stats.lastUsage = usageTokens;
      if (usageTokens) {
        stats.totalPromptTokens += usageTokens.prompt_tokens || 0;
        stats.totalCompletionTokens += usageTokens.completion_tokens || 0;
      } else {
        // 没拿到 usage —— 估算并累计（4 char/token）
        stats.totalPromptTokens += Math.round(promptCharsApprox / 4);
        stats.totalCompletionTokens += Math.round(outputChars / 4);
      }
    }
    return this._extractHTML(fullContent);
  },

  /**
   * Extract HTML code from LLM response
   */
  _extractHTML(text) {
    // Find the opening ```html marker
    const startMarker = '```html';
    const startIdx = text.indexOf(startMarker);
    if (startIdx !== -1) {
      // Find the closing ``` that comes after the opening
      const afterStart = text.substring(startIdx + startMarker.length);
      // Find the LAST ``` in the text (not first, to avoid inline code blocks)
      const closeIdx = afterStart.lastIndexOf('```');
      if (closeIdx !== -1) {
        const html = afterStart.substring(0, closeIdx).trim();
        if (html.length > 100) return html;
      }
      // Fallback: try first ``` (non-greedy)
      const firstClose = afterStart.indexOf('```');
      if (firstClose !== -1) {
        const html = afterStart.substring(0, firstClose).trim();
        if (html.length > 100) return html;
      }
    }

    // Try generic ``` code blocks
    const codeMatch = text.match(/```\s*([\s\S]*?)```/);
    if (codeMatch) {
      const code = codeMatch[1].trim();
      if (code.length > 100 && (code.startsWith('<!DOCTYPE') || code.startsWith('<html') || code.startsWith('<body') || code.startsWith('<div') || code.startsWith('<'))) {
        return code;
      }
    }

    // If it looks like HTML already
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html') || text.trim().startsWith('<body')) {
      return text.trim();
    }

    // Last resort: wrap in basic HTML
    return `<html><body style="font-family:monospace;padding:16px;white-space:pre-wrap;background:#fff;color:#333">${text.replace(/</g,'&lt;')}</body></html>`;
  },

  /**
   * Load system prompt from prompts/ directory
   */
  async _loadSystemPrompt(promptFile) {
    try {
      const response = await fetch(`prompts/${promptFile}`);
      if (response.ok) {
        const text = await response.text();
        if (text && text.trim().length > 50) return text;
        console.warn(`Prompt file "${promptFile}" appears to be a placeholder (${text.trim().length} chars)`);
      }
    } catch (e) {
      console.warn(`Could not load prompt file: ${promptFile}`, e);
    }

    // Default system prompt
    return this._getDefaultSystemPrompt();
  },

  /**
   * Common system prompt section for all apps
   * 注入完整 VibeOSAPI 文档：所有应用（内置/Vibe 自定义）通用，按需调用。
   */
  _getCommonSystemPrompt() {
    return `
你是 VibeOS 桌面应用生成器，生成在窗口 iframe 内运行的桌面应用（非移动端）。

## UI 规范
1. 桌面横向布局（侧边栏+主区 / 工具栏+编辑区 等），不是移动端
2. 全部内联 CSS/JS，无外部 CDN/资源；图标用内联 SVG（推荐）或 emoji
3. 风格：白底 #fff，边框 #d2d2d7，强调色 #007aff，圆角 6-10px，字号 13px
4. 功能完整、可用，无 TODO 无占位；窗口内滚动不溢出
5. 总体 200-700 行，CSS 紧凑（合并选择器，不写冗余属性）

## 输出
只输出一个 \`\`\`html 代码块，包含完整 <!DOCTYPE html> ... </html>。

================================================================
## ⚡ 系统 API（已注入到 iframe，window.VibeOSAPI 可直接使用）
所有方法返回 Promise，必须 async/await 调用。**生成的应用必须主动使用这些 API 与系统联动**——能联动的地方不要用 localStorage 或假数据替代。

### 文件系统  VibeOSAPI.fs
- readFile(path) -> { content }
- writeFile(path, content) -> { success }
- deleteFile(path) -> { success }
- listDir(path) -> { entries:[{name,type,size,modified}] }
- mkdir(path, recursive?) -> { success }
- exists(path) -> { exists }
- stat(path) -> { stat:{type,size,created,modified} }
- copyFile(from, to) / moveFile(from, to) / rename(path, newName)
- 标准目录: /Desktop /Documents /Downloads /Pictures /Music /Videos /System

### 剪贴板  VibeOSAPI.clipboard
- copy(text) -> { success }    paste() -> { text }

### 通知  VibeOSAPI.notification
- show(title, body, icon) -> { success }
  icon: 'check'|'warn'|'error'|'bell'|'info'|'trash'

### 窗口控制  VibeOSAPI.window
- setTitle(title)        修改标题栏（如显示文件名/状态）
- close() / minimize() / maximize() / restore()
- setSize(width, height) / focus()
- getInfo() -> { id, title, width, height, x, y }

### 系统  VibeOSAPI.system
- getConfig() -> { config:{provider,endpoint,model,maxTokens,temperature,theme,...} }
- setConfig({config:{...}}) -> { success }
- getInfo() -> { version, windows, llmProvider, llmModel, theme }
- clearCache()
- openUrl(url)           在浏览器新标签打开外链
- now() -> { now, iso }  系统时钟

### 桌面  VibeOSAPI.desktop
- setWallpaper({color}|{gradient}|{url,type})
- setTheme('light'|'dark')
- refresh()

### 应用管理  VibeOSAPI.app
- launch(name, icon, description)   AI 生成并启动新窗口
- openFile(path)                     用合适的应用打开文件
- list() -> { apps:[{id,name,description}] }
- installed() -> { apps:[{id,name}] }

### 应用持久化存储  VibeOSAPI.storage  （per-app 独立 namespace）
- get(key) -> { value }       不存在返回 null
- set(key, value) / remove(key) / clear() / keys()
  推荐 JSON：await VibeOSAPI.storage.set('todos', JSON.stringify(arr));

### 对话框  VibeOSAPI.dialog
- alert(message)
- confirm(message) -> { result:true|false }
- prompt(message, defaultValue) -> { value }

### 网络  VibeOSAPI.net  （宿主代理，解决 iframe srcdoc 无法 fetch 的问题）
- fetch(url, { method, headers, body }) -> { ok, status, text, json, error }

### LLM（让应用调用同一个模型）  VibeOSAPI.llm
- chat(prompt | messages, { maxTokens, temperature }) -> { content, usage }

================================================================
## 🔗 系统联动规范（必须遵守）

生成的应用**必须**根据功能场景集成以下 API，不得用假数据或 localStorage 替代：

### 1. 数据持久化 → 用 VibeOSAPI.storage（不要用 localStorage）
\`\`\`js
// 加载
async function loadData() {
  const { value } = await VibeOSAPI.storage.get('appData');
  return value ? JSON.parse(value) : [];
}
// 保存
async function saveData(data) {
  await VibeOSAPI.storage.set('appData', JSON.stringify(data));
  VibeOSAPI.notification.show('已保存', '', 'check');
}
\`\`\`

### 2. 文件读写 → 用 VibeOSAPI.fs
\`\`\`js
// 保存到用户文件系统
async function saveFile(name, content) {
  await VibeOSAPI.fs.writeFile('/Documents/' + name, content);
  VibeOSAPI.notification.show('已保存', '文件: ' + name, 'check');
}
// 打开文件
const { content } = await VibeOSAPI.fs.readFile('/Documents/notes.txt');
\`\`\`

### 3. 用户反馈 → 用 VibeOSAPI.notification（不要用 alert）
\`\`\`js
VibeOSAPI.notification.show('操作完成', '详情描述', 'check');
VibeOSAPI.notification.show('出错了', err.message, 'error');
\`\`\`

### 4. 用户确认/输入 → 用 VibeOSAPI.dialog（不要用 confirm/prompt）
\`\`\`js
const { result } = await VibeOSAPI.dialog.confirm('确定删除？');
if (!result) return;
const { value } = await VibeOSAPI.dialog.prompt('输入名称：', '默认值');
\`\`\`

### 5. 窗口标题 → 用 VibeOSAPI.window.setTitle
\`\`\`js
VibeOSAPI.window.setTitle(fileName + ' - MyEditor');
// 标题栏实时反映应用状态（文件名、页码、未保存标记等）
\`\`\`

### 6. 需要 AI 能力 → 用 VibeOSAPI.llm.chat
\`\`\`js
// 翻译、总结、分析、生成文本等——复用系统已配置的 LLM
const r = await VibeOSAPI.llm.chat('请总结以下内容：\\n' + text);
resultEl.textContent = r.content;
\`\`\`

### 7. 需要网络请求 → 用 VibeOSAPI.net.fetch（不要用原生 fetch）
\`\`\`js
// iframe 内原生 fetch 受限，必须走系统代理
const resp = await VibeOSAPI.net.fetch('https://api.example.com/data');
if (resp.ok) { const data = resp.json; /* use data */ }
\`\`\`

### 8. 剪贴板 → 用 VibeOSAPI.clipboard
\`\`\`js
await VibeOSAPI.clipboard.copy(textToCopy);
const { text } = await VibeOSAPI.clipboard.paste();
\`\`\`

### 9. 跨应用联动 → 用 VibeOSAPI.app
\`\`\`js
// 从当前应用启动另一个应用
await VibeOSAPI.app.launch('calculator', 'calculator', '计算器');
// 打开文件由系统选择合适应用
await VibeOSAPI.app.openFile('/Documents/report.pdf');
\`\`\`

================================================================
## 调用约定
- 所有 API 都是 async：always \`await VibeOSAPI.xxx.yyy(...)\`
- 错误处理：catch 后用 VibeOSAPI.notification.show 反馈给用户
- 用户文件优先放 /Documents 或 /Desktop，应用配置/状态用 VibeOSAPI.storage
- 不要假定不存在的 API；只用上面文档列出的
- 禁止使用 window.confirm / window.alert / window.prompt（用 VibeOSAPI.dialog 替代）
- 禁止使用 localStorage / sessionStorage（用 VibeOSAPI.storage 替代）
- 禁止使用原生 fetch / XMLHttpRequest（用 VibeOSAPI.net.fetch 替代）

只输出 \`\`\`html 代码块。
`;
  },

  /** Default system prompt (used when prompts/<app>.md fails to load) */
  _getDefaultSystemPrompt() {
    return `你是 VibeOS 桌面应用生成器。生成窗口内运行的桌面应用，200-700 行，内联 CSS/JS，白底 #fff，边框 #d2d2d7，强调色 #007aff，功能完整可用。应用中必须使用注入的 VibeOSAPI（fs/clipboard/notification/window/system/desktop/app/storage/dialog/net/llm）与系统联动——数据持久化用 VibeOSAPI.storage，用户反馈用 VibeOSAPI.notification，文件读写用 VibeOSAPI.fs，禁止 localStorage/alert/confirm/prompt/原生fetch。只输出 \`\`\`html 代码块。`;
  },

  /**
   * Show loading state in window
   */
  _showLoading(winId, app) {
    WindowManager.setContent(winId, {
      type: 'placeholder',
      icon: 'hourglass',
      message: `正在生成 ${app.name}...\nAI 正在编写应用代码`,
    });
  },

  /**
   * Show error state in window
   */
  _showError(winId, app, errorMsg) {
    WindowManager.setContent(winId, {
      type: 'placeholder',
      icon: 'cross',
      message: `生成失败\n\n${errorMsg}\n\n提示：\n• 检查 LLM API 设置中的 API Key\n• 确认 API 端点格式正确\n• 当前 Provider: ${VibeOSConfig.llm.provider}\n• 如未配置密钥，请使用 Mock 模式`,
    });
  },

  /**
   * Render generated app in window
   */
  _renderApp(winId, html, app) {
    if (!html || html.length < 50) {
      html = `<html><body style="font-family:monospace;padding:20px;">${html || '(empty)'}</body></html>`;
    }
    // Inject VibeOSAPI bridge
    const apiScript = Sandbox.getAppAPI();
    const fullHtml = this._injectAPI(html, apiScript);
    try {
      WindowManager.setContent(winId, { type: 'iframe', srcdoc: fullHtml });
    } catch (e) {
      WindowManager.setContent(winId, { type: 'placeholder', icon: 'cross', message: `渲染失败: ${e.message}` });
    }
  },

  /**
   * Inject VibeOS API script into generated HTML
   */
  _injectAPI(html, apiScript) {
    // Insert API script before </head> or </body>
    if (html.includes('</head>')) {
      return html.replace('</head>', apiScript + '\n</head>');
    } else if (html.includes('<body')) {
      return html.replace('<body', apiScript + '\n<body');
    } else {
      return apiScript + '\n' + html;
    }
  },

  /**
   * Clear all cached apps
   */
  clearCache() {
    this._cache = {};
  },

  /**
   * Simple delay helper
   */
  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  /* ==============================================
     Mock Apps (Built-in demos)
     ============================================== */

  /**
   * Get a mock/built-in app for demo mode
   */
  _getMockApp(appId, userPrompt) {
    const mocks = {
      notepad: this._mockNotepad,
      calculator: this._mockCalculator,
      settings: this._mockSettings,
      terminal: this._mockTerminal,
      files: this._mockFileExplorer,
      browser: this._mockBrowser,
      music: this._mockMusic,
      sysmon: this._mockSysMon,
      vibecode: this._mockVibeCode,
      imageview: this._mockImageView,
      snake: this._mockSnake,
      tetris: this._mockTetris,
      'llm-api': this._mockLLMAPI,
      'app-store': this._mockAppStore,
    };

    if (mocks[appId]) {
      return mocks[appId];
    }

    return this._mockGeneric(appId);
  },

  /* --- Mock: Notepad --- */
  get _mockNotepad() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: -apple-system, 'Segoe UI', 'PingFang SC', sans-serif; font-size:14px; display:flex; flex-direction:column; height:100vh; background:#fff; color:#1a1a1a; }
.menubar { display:flex; background:#f9f9f9; border-bottom:1px solid #e0e0e0; padding:2px 0; font-size:13px; }
.menu-item { padding:4px 12px; cursor:pointer; border-radius:4px; margin:0 1px; }
.menu-item:hover { background:#e5e5e5; }
.toolbar { display:flex; gap:4px; padding:4px 8px; border-bottom:1px solid #f0f0f0; }
.toolbar button { padding:4px 10px; border:1px solid #ddd; border-radius:4px; background:#fff; cursor:pointer; font-size:13px; }
.toolbar button:hover { background:#f0f0f0; }
textarea { flex:1; border:none; outline:none; resize:none; padding:12px 16px; font-family: 'Cascadia Code', 'Consolas', monospace; font-size:14px; line-height:1.6; tab-size:4; }
.statusbar { display:flex; justify-content:space-between; padding:4px 12px; background:#f9f9f9; border-top:1px solid #e0e0e0; font-size:11px; color:#666; }
</style>
</head>
<body>
<div class="menubar">
  <div class="menu-item">文件</div>
  <div class="menu-item">编辑</div>
  <div class="menu-item">格式</div>
  <div class="menu-item">查看</div>
  <div class="menu-item">帮助</div>
</div>
<div class="toolbar">
  <button onclick="newDoc()">📄 新建</button>
  <button onclick="openDoc()">📂 打开</button>
  <button onclick="saveDoc()"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;display:inline-block"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> 保存</button>
  <span style="flex:1"></span>
  <button onclick="undo()">↩ 撤销</button>
  <button onclick="redo()">↪ 重做</button>
</div>
<textarea id="editor" placeholder="在此输入文本..."></textarea>
<div class="statusbar">
  <span id="status-line">第 1 行，第 1 列</span>
  <span>UTF-8</span>
</div>
<script>
const editor = document.getElementById('editor');
const statusLine = document.getElementById('status-line');

editor.addEventListener('input', updateStatus);
editor.addEventListener('keyup', updateStatus);
editor.addEventListener('click', updateStatus);

function updateStatus() {
  const text = editor.value.substring(0, editor.selectionStart);
  const lines = text.split('\\n');
  const line = lines.length;
  const col = lines[lines.length-1].length + 1;
  statusLine.textContent = '第 ' + line + ' 行，第 ' + col + ' 列';
}

function newDoc() {
  if (!editor.value) { editor.value = ''; updateStatus(); return; }
  VibeOSAPI && VibeOSAPI.dialog && VibeOSAPI.dialog.confirm('是否保存当前文档？').then(function(r){ if(!r.result){ editor.value=''; updateStatus(); } });
}

async function openDoc() {
  try { const content = await VibeOSAPI?.fs?.readFile('/Documents/note.txt'); if(content) editor.value=content; updateStatus(); } catch(e) {}
}

async function saveDoc() {
  try { await VibeOSAPI?.fs?.writeFile('/Documents/note.txt', editor.value); await VibeOSAPI?.notification?.show('已保存','文档已保存至 Documents/note.txt','<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;display:inline-block"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>'); } catch(e) { VibeOSAPI&&VibeOSAPI.dialog&&VibeOSAPI.dialog.alert('保存失败: '+e.message); }
}

let undoStack=[], redoStack=[];
editor.addEventListener('input',()=>{ undoStack.push(editor.value); redoStack=[]; });
function undo() { if(undoStack.length>1) { redoStack.push(undoStack.pop()); editor.value=undoStack[undoStack.length-1]; } }
function redo() { if(redoStack.length) { undoStack.push(redoStack.pop()); editor.value=undoStack[undoStack.length-1]; } }
</script>
</body>
</html>`;
  },

  /* --- Mock: Calculator --- */
  get _mockCalculator() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: -apple-system, 'Segoe UI', 'PingFang SC', sans-serif; display:flex; flex-direction:column; height:100vh; background:#f5f5f5; align-items:center; justify-content:center; }
.calc { width:320px; background:#fff; border-radius:8px; box-shadow:0 2px 12px rgba(0,0,0,0.1); overflow:hidden; }
.display { background:#f9f9f9; padding:20px; text-align:right; border-bottom:1px solid #e0e0e0; }
.display .expr { font-size:13px; color:#999; min-height:18px; word-break:break-all; }
.display .result { font-size:36px; font-weight:300; color:#1a1a1a; margin-top:8px; word-break:break-all; }
.buttons { display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:#e0e0e0; }
.btn { padding:18px; font-size:18px; border:none; background:#fff; cursor:pointer; transition:background .1s; }
.btn:hover { background:#f0f0f0; }
.btn:active { background:#e0e0e0; }
.btn.op { background:#f8f8f8; font-weight:500; }
.btn.equals { background:#0078d4; color:#fff; }
.btn.equals:hover { background:#106ebe; }
.btn.func { font-size:14px; color:#666; }
</style>
</head>
<body>
<div class="calc">
<div class="display"><div class="expr" id="expr"></div><div class="result" id="result">0</div></div>
<div class="buttons">
  <button class="btn func" data-action="clear">C</button>
  <button class="btn func" data-action="back">⌫</button>
  <button class="btn func" data-action="percent">%</button>
  <button class="btn op" data-action="op" data-op="÷">÷</button>
  <button class="btn" data-action="num" data-num="7">7</button>
  <button class="btn" data-action="num" data-num="8">8</button>
  <button class="btn" data-action="num" data-num="9">9</button>
  <button class="btn op" data-action="op" data-op="×">×</button>
  <button class="btn" data-action="num" data-num="4">4</button>
  <button class="btn" data-action="num" data-num="5">5</button>
  <button class="btn" data-action="num" data-num="6">6</button>
  <button class="btn op" data-action="op" data-op="-">−</button>
  <button class="btn" data-action="num" data-num="1">1</button>
  <button class="btn" data-action="num" data-num="2">2</button>
  <button class="btn" data-action="num" data-num="3">3</button>
  <button class="btn op" data-action="op" data-op="+">+</button>
  <button class="btn" data-action="num" data-num="0" style="grid-column:span 2">0</button>
  <button class="btn" data-action="num" data-num=".">.</button>
  <button class="btn equals" data-action="equals">=</button>
</div>
</div>
<script>
let current='', previous='', operation=null, shouldReset=false;
const exprEl=document.getElementById('expr'), resultEl=document.getElementById('result');

document.querySelectorAll('.btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const action=btn.dataset.action;
    if(action==='num') inputNum(btn.dataset.num);
    else if(action==='op') inputOp(btn.dataset.op);
    else if(action==='equals') calculate();
    else if(action==='clear') clearAll();
    else if(action==='back') backspace();
    else if(action==='percent') percent();
  });
});

function inputNum(num){
  if(shouldReset){ current=''; shouldReset=false; }
  if(num==='.' && current.includes('.')) return;
  if(current==='0' && num!=='.') current=num;
  else current+=num;
  updateDisplay();
}
function inputOp(op){
  if(current==='' && previous==='') return;
  if(current==='' && previous!==''){ operation=op; updateDisplay(); return; }
  if(previous!=='' && current!=='') calculate();
  previous=current; current=''; operation=op; shouldReset=false;
  updateDisplay();
}
function calculate(){
  if(previous==='' || current==='' || !operation) return;
  const a=parseFloat(previous), b=parseFloat(current); let r;
  switch(operation){
    case '+': r=a+b; break; case '-': r=a-b; break;
    case '×': case '*': r=a*b; break; case '÷': case '/': r=b!==0?a/b:'Error'; break;
    default: return;
  }
  if(r==='Error'){ current='Error'; } else { current=Number.isInteger(r)?String(r):parseFloat(r.toFixed(10)).toString(); }
  previous=''; operation=null; shouldReset=true;
  updateDisplay();
}
function clearAll(){ current=''; previous=''; operation=null; shouldReset=false; updateDisplay(); }
function backspace(){ current=current.slice(0,-1)||'0'; updateDisplay(); }
function percent(){ if(current){ current=String(parseFloat(current)/100); updateDisplay(); } }
function updateDisplay(){ resultEl.textContent=current||'0'; exprEl.textContent=previous+(operation?' '+operation:'')+(shouldReset?'':' '+current); }
document.addEventListener('keydown',e=>{
  if(e.key>='0'&&e.key<='9'||e.key==='.') inputNum(e.key);
  else if(e.key==='+') inputOp('+');
  else if(e.key==='-') inputOp('-');
  else if(e.key==='*') inputOp('×');
  else if(e.key==='/'){ e.preventDefault(); inputOp('÷'); }
  else if(e.key==='Enter'||e.key==='=') calculate();
  else if(e.key==='Escape') clearAll();
  else if(e.key==='Backspace') backspace();
});
</script>
</body>
</html>`;
  },

  /* --- Mock: Settings --- */
  get _mockSettings() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:-apple-system,'PingFang SC',sans-serif; font-size:13px; background:#fff; color:#1a1a1a; display:flex; height:100vh; }
.sidebar { width:140px; background:#f5f5f5; border-right:1px solid #e0e0e0; padding:8px; }
.nav-item { padding:8px 12px; border-radius:5px; cursor:pointer; margin-bottom:2px; }
.nav-item:hover { background:#e8e8e8; }
.nav-item.active { background:#d0edf9; color:#007aff; font-weight:500; }
.content { flex:1; padding:20px; overflow-y:auto; }
h2 { font-size:17px; font-weight:600; margin-bottom:14px; }
.section { margin-bottom:16px; }
.label { font-size:12px; font-weight:500; color:#333; margin-bottom:4px; }
.value { font-size:13px; color:#555; padding:4px 0; }
.btn { padding:7px 16px; border:1px solid #d0d0d0; border-radius:5px; background:#f8f8f8; cursor:pointer; font-size:13px; }
.btn:hover { background:#efefef; }
.btn-primary { background:#007aff; color:#fff; border-color:#007aff; }
.btn-primary:hover { background:#005ecb; }
.swatches { display:flex; gap:6px; flex-wrap:wrap; margin-top:6px; }
.swatch { width:32px; height:32px; border:2px solid #ddd; border-radius:5px; cursor:pointer; }
.swatch:hover { border-color:#007aff; }
.hint { font-size:11px; color:#999; margin-top:8px; line-height:1.5; }
.status { margin-top:10px; font-size:12px; min-height:18px; }
.status.ok { color:#34c759; }
.status.err { color:#ff3b30; }
</style>
</head>
<body>
<div class="sidebar">
  <div class="nav-item active" data-page="wallpaper">壁纸</div>
  <div class="nav-item" data-page="theme">主题</div>
  <div class="nav-item" data-page="cache">缓存</div>
  <div class="nav-item" data-page="llm">LLM</div>
  <div class="nav-item" data-page="about">关于</div>
</div>
<div class="content" id="content"></div>
<script>
VibeOSAPI.window.setTitle('系统设置');
const pages = {
  wallpaper: '<h2>壁纸颜色</h2><div class="swatches" id="swatches"></div><div class="status" id="status"></div>',
  theme: '<h2>主题</h2><button class="btn btn-primary" onclick="setTheme(\\'light\\')">浅色</button> <button class="btn" onclick="setTheme(\\'dark\\')">深色</button><div class="status" id="status"></div>',
  cache: '<h2>缓存</h2><button class="btn btn-primary" onclick="clearCache()">清除应用缓存</button><div class="status" id="status"></div>',
  llm: '<h2>LLM 配置（只读）</h2><div class="section"><div class="label">Provider</div><div class="value" id="llm-provider">-</div></div><div class="section"><div class="label">Model</div><div class="value" id="llm-model">-</div></div><div class="section"><div class="label">Endpoint</div><div class="value" id="llm-endpoint">-</div></div><div class="section"><div class="label">Max Tokens</div><div class="value" id="llm-maxtokens">-</div></div><div class="section"><div class="label">Temperature</div><div class="value" id="llm-temp">-</div></div><div class="hint">详细 LLM 配置请点左上角 VibeOS 菜单 → LLM 设置</div>',
  about: '<h2>关于</h2><div class="section"><div class="label">版本</div><div class="value" id="about-ver">VibeOS v0.1</div></div><div class="section"><div class="label">窗口数</div><div class="value" id="about-wins">-</div></div><div class="hint">AI 驱动的网页桌面系统</div>'
};

function showStatus(msg,ok){var s=document.getElementById('status');if(!s)return;s.textContent=msg;s.className='status '+(ok?'ok':'err');setTimeout(function(){s.textContent='';s.className='status';},2500);}

document.querySelectorAll('.nav-item').forEach(function(item){
  item.addEventListener('click',function(){
    document.querySelectorAll('.nav-item').forEach(function(i){i.classList.remove('active');});
    item.classList.add('active');
    var page=item.dataset.page;
    document.getElementById('content').innerHTML=pages[page];
    if(page==='wallpaper')initSwatches();
    if(page==='llm')loadLLM();
    if(page==='about')loadAbout();
  });
});

var wallpaperColors=['#ffffff','#1a365d','#1a4731','#2d1b69','#4a148c','#004d40'];
function initSwatches(){
  var c=document.getElementById('swatches');if(!c)return;
  wallpaperColors.forEach(function(color){
    var b=document.createElement('button');
    b.className='swatch';b.style.background=color;b.title=color;
    b.addEventListener('click',function(){
      try{
        VibeOSAPI.desktop.setWallpaper({color:color}).then(function(){
          VibeOSAPI.notification.show('壁纸','已更新','check');
          showStatus('壁纸已更新',true);
        }).catch(function(e){showStatus('设置失败: '+e.message,false);});
      }catch(e){showStatus(e.message,false);}
    });
    c.appendChild(b);
  });
}

function setTheme(t){
  VibeOSAPI.desktop.setTheme(t).then(function(){
    VibeOSAPI.notification.show('主题',t==='dark'?'已切换到深色':'已切换到浅色','check');
    showStatus('主题已切换',true);
  }).catch(function(e){showStatus(e.message,false);});
}

function clearCache(){
  VibeOSAPI.system.clearCache().then(function(){
    VibeOSAPI.notification.show('缓存','应用缓存已清除','check');
    showStatus('缓存已清除',true);
  }).catch(function(e){showStatus(e.message,false);});
}

function loadLLM(){
  VibeOSAPI.system.getConfig().then(function(r){
    var c=r.config;
    document.getElementById('llm-provider').textContent=c.provider||'-';
    document.getElementById('llm-model').textContent=c.model||'-';
    document.getElementById('llm-endpoint').textContent=c.endpoint||'-';
    document.getElementById('llm-maxtokens').textContent=c.maxTokens||'-';
    document.getElementById('llm-temp').textContent=c.temperature!==undefined?c.temperature:'-';
  }).catch(function(e){
    document.getElementById('llm-provider').textContent='读取失败';
  });
}

function loadAbout(){
  VibeOSAPI.system.getInfo().then(function(r){
    document.getElementById('about-wins').textContent=(r.windows!==undefined?r.windows:'-')+' 个窗口';
  }).catch(function(e){
    document.getElementById('about-wins').textContent='-';
  });
}

// 初始页
document.getElementById('content').innerHTML=pages.wallpaper;
initSwatches();
</script>
</body>
</html>`;
  },

  /* --- Mock: Terminal --- */
  get _mockTerminal() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: 'Cascadia Code','Consolas',monospace; font-size:14px; background:#1e1e1e; color:#d4d4d4; height:100vh; display:flex; flex-direction:column; }
.output { flex:1; overflow-y:auto; padding:12px; white-space:pre-wrap; line-height:1.5; }
.output .line { margin-bottom:2px; }
.output .prompt { color:#569cd6; }
.output .cmd { color:#dcdcaa; }
.output .error { color:#f44747; }
.output .success { color:#4ec9b0; }
.output .info { color:#9cdcfe; }
.input-line { display:flex; padding:4px 12px 12px; align-items:center; }
.input-line .prompt { color:#569cd6; margin-right:8px; white-space:nowrap; }
.input-line input { flex:1; background:transparent; border:none; outline:none; color:#d4d4d4; font:inherit; }
</style>
</head>
<body>
<div class="output" id="output">
<div class="line"><span class="info">VibeOS Terminal v0.1</span></div>
<div class="line"><span class="success">输入 help 查看可用命令</span></div>
<div class="line"></div>
</div>
<div class="input-line"><span class="prompt">PS ~> </span><input type="text" id="input" autofocus></div>
<script>
const output=document.getElementById('output'), input=document.getElementById('input');
let cwd='/';
const cmds={
  help:()=>'可用命令:\\n  help          - 显示帮助\\n  ls/dir        - 列出目录\\n  cd <path>     - 切换目录\\n  pwd           - 当前目录\\n  echo <text>   - 输出文本\\n  date          - 日期时间\\n  clear/cls     - 清屏\\n  whoami        - 当前用户\\n  version       - 版本信息',
  ls:async()=>{ try{ const entries=await VibeOSAPI?.fs?.listDir(cwd); if(!entries||!entries.length) return '目录为空'; return entries.map(e=>(e.type==='directory'?'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;display:inline-block"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg> ':'📄 ')+e.name+'  '+e.size+'B  '+new Date(e.modified).toLocaleString()).join('\\n'); }catch(e){ return '错误: '+e.message; } },
  dir:async function(){ return await this.ls(); },
  cd:(path)=>{ if(!path) return '用法: cd <path>'; if(path==='..'){ if(cwd!=='/'){ cwd=cwd.substring(0,cwd.lastIndexOf('/'))||'/'; } } else { const np=cwd==='/'?('/'+path):(cwd+'/'+path); /* check if dir exists */ cwd=np; } return ''; },
  pwd:()=>cwd,
  echo:(...args)=>args.join(' '),
  date:()=>new Date().toLocaleString(),
  clear:()=>{ output.innerHTML=''; return ''; },
  cls:function(){ return this.clear(); },
  whoami:()=>'vibeos-user',
  version:()=>'VibeOS Terminal v0.1 (Phase 1)',
};

input.addEventListener('keydown',async (e)=>{
  if(e.key==='Enter'){
    const line=input.value.trim();
    output.innerHTML+='<div class="line"><span class="prompt">PS '+cwd+'> </span><span class="cmd">'+line.replace(/</g,'&lt;')+'</span></div>';
    if(line){
      const parts=line.split(/\\s+/);
      const cmd=parts[0].toLowerCase();
      const args=parts.slice(1);
      if(cmds[cmd]){
        try{ const r=await cmds[cmd](...args); if(r) output.innerHTML+='<div class="line">'+r.replace(/</g,'&lt;').replace(/\\n/g,'<br>')+'</div>'; }catch(err){ output.innerHTML+='<div class="line"><span class="error">'+err.message.replace(/</g,'&lt;')+'</span></div>'; }
      } else { output.innerHTML+='<div class="line"><span class="error">未知命令: '+line.replace(/</g,'&lt;')+'。输入 help 查看可用命令</span></div>'; }
    }
    input.value='';
    output.scrollTop=output.scrollHeight;
  }
});

input.focus();
document.addEventListener('click',()=>input.focus());
</script>
</body>
</html>`;
  },

  /* --- Mock: File Explorer --- */
  get _mockFileExplorer() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: -apple-system, 'Helvetica Neue', 'PingFang SC', sans-serif; font-size:13px; background:#fff; color:#1d1d1f; display:flex; flex-direction:column; height:100vh; }
.toolbar { display:flex; gap:6px; padding:8px 12px; border-bottom:1px solid #e5e5ea; background:#f5f5f7; align-items:center; }
.toolbar button { padding:4px 12px; border:1px solid #d2d2d7; border-radius:6px; background:#fff; cursor:pointer; font-size:13px; }
.toolbar button:hover { background:#e8e8ed; }
.toolbar .path { flex:1; padding:5px 10px; border:1px solid #d2d2d7; border-radius:6px; font-size:13px; background:#fff; }
.main { display:flex; flex:1; overflow:hidden; }
.tree { width:200px; border-right:1px solid #e5e5ea; overflow-y:auto; padding:8px; background:#fafafa; }
.tree-item { padding:5px 10px; cursor:pointer; border-radius:5px; display:flex; align-items:center; gap:6px; font-size:13px; }
.tree-item:hover { background:rgba(0,0,0,0.04); }
.tree-item.active { background:rgba(0,122,255,0.1); color:#007aff; }
.filelist { flex:1; overflow-y:auto; padding:12px; display:grid; grid-template-columns:repeat(auto-fill,minmax(110px,1fr)); gap:6px; align-content:start; }
.file-item { display:flex; flex-direction:column; align-items:center; padding:12px 6px; border-radius:8px; cursor:pointer; text-align:center; }
.file-item:hover { background:rgba(0,0,0,0.04); }
.file-item .icon { font-size:36px; margin-bottom:6px; }
.file-item .name { font-size:11px; word-break:break-all; color:#1d1d1f; }
.statusbar { padding:4px 12px; background:#f5f5f7; border-top:1px solid #e5e5ea; font-size:11px; color:#6e6e73; display:flex; justify-content:space-between; }
</style>
</head>
<body>
<div class="toolbar">
  <button onclick="goUp()">⟵ 上级</button>
  <button onclick="refresh()">↻ 刷新</button>
  <input class="path" id="pathBar" value="/" onkeydown="if(event.key==='Enter') navigate(this.value)">
</div>
<div class="main">
  <div class="tree" id="tree"></div>
  <div class="filelist" id="filelist"></div>
</div>
<div class="statusbar">
  <span id="itemCount">0 个项目</span>
  <span>VibeOS VFS</span>
</div>
<script>
let currentPath='/';
const pathBar=document.getElementById('pathBar');
async function navigate(path){
  try{
    const entries=await VibeOSAPI?.fs?.listDir(path) || [];
    currentPath=path; pathBar.value=path;
    renderFileList(entries); renderTree();
    document.getElementById('itemCount').textContent=entries.length+' 个项目';
  }catch(e){}
}
function renderFileList(entries){
  document.getElementById('filelist').innerHTML=entries.map(e=>{var safeName=e.name.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');var safeType=e.type.replace(/'/g,'\\'');return '<div class="file-item" ondblclick="openItem(\\''+currentPath+'/'+safeName+'\\',\\''+safeType+'\\')"><div class="icon">'+(e.type=='directory'?'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;display:inline-block"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>':'📄')+'</div><div class="name">'+safeName+'</div></div>';}).join('');
}
function renderTree(){
  const dirs=['/','/Desktop','/Documents','/Downloads','/Pictures','/Music','/Videos'];
  document.getElementById('tree').innerHTML=dirs.map(d=>'<div class="tree-item'+(d===currentPath?' active':'')+'" onclick="navigate(\\''+d+'\\')"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;display:inline-block"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg> '+(d==='/'?'根目录':d.replace('/',''))+'</div>').join('');
}
function openItem(path,type){ if(type=='directory') navigate(path); }
function goUp(){ if(currentPath!=='/'){ const p=currentPath.substring(0,currentPath.lastIndexOf('/'))||'/'; navigate(p); } }
function refresh(){ navigate(currentPath); }
navigate('/');
</script>
</body>
</html>`;
  },

  /* --- Mock: Browser --- */
  get _mockBrowser() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,'PingFang SC',sans-serif;display:flex;flex-direction:column;height:100vh;background:#f5f5f7}
.toolbar{display:flex;gap:4px;padding:6px 10px;background:#fff;border-bottom:1px solid #e5e5ea;align-items:center}
.nav-btn{width:28px;height:28px;border:1px solid #d2d2d7;border-radius:6px;background:#fff;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.nav-btn:hover{background:#f0f0f0}.nav-btn:disabled{opacity:0.3}
.url-bar{flex:1;padding:5px 10px;border:1px solid #d2d2d7;border-radius:8px;font-size:12px;background:#f9f9f9;outline:none}
.url-bar:focus{border-color:#007aff;box-shadow:0 0 0 2px rgba(0,122,255,0.15)}
.bookmarks{display:flex;gap:6px;padding:4px 10px;background:#fff;border-bottom:1px solid #eee;font-size:11px}
.bm{color:#007aff;cursor:pointer}.bm:hover{text-decoration:underline}
.content{flex:1;position:relative;background:#fff}
.content iframe{width:100%;height:100%;border:none;display:block}
.status{font-size:10px;color:#999;padding:2px 10px;background:#f9f9f9;border-top:1px solid #eee}
</style>
</head>
<body>
<div class="bookmarks" id="bmBar">
  <span class="bm" onclick="go('https://www.google.com')"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;display:inline-block"><circle cx="11" cy="11" r="7"/><path d="m20 20-4.35-4.35"/></svg> Google</span>
  <span class="bm" onclick="go('https://github.com')">🐙 GitHub</span>
  <span class="bm" onclick="go('https://www.baidu.com')">🔵 百度</span>
  <span class="bm" onclick="go('https://www.bing.com')">🔷 Bing</span>
</div>
<div class="toolbar">
  <button class="nav-btn" id="btnBack" onclick="doBack()" disabled>◁</button>
  <button class="nav-btn" id="btnFwd" onclick="doFwd()" disabled>▷</button>
  <button class="nav-btn" onclick="doRefresh()">↻</button>
  <input class="url-bar" id="urlBar" value="https://www.bing.com" onkeydown="if(event.key==='Enter')go(this.value)" placeholder="输入网址或搜索…">
</div>
<div class="content" id="content"></div>
<div class="status" id="status">就绪</div>
<script>
var historyStack=[],historyIdx=-1,currentUrl='';
function go(url){
  if(!url)return;
  if(!url.startsWith('http'))url='https://'+url;
  if(url===currentUrl)return;
  currentUrl=url;document.getElementById('urlBar').value=url;
  document.getElementById('status').textContent='加载中…';
  var iframe=document.createElement('iframe');
  iframe.src=url;
  iframe.setAttribute('sandbox','allow-scripts allow-forms allow-same-origin allow-popups allow-top-navigation');
  var loaded=false;
  iframe.onload=function(){
    if(loaded)return;loaded=true;
    document.getElementById('status').textContent='已完成';
    try{var u=iframe.contentWindow.location.href;if(u&&u!=='about:blank'){document.getElementById('urlBar').value=u;currentUrl=u}}catch(e){}
    if(historyIdx<historyStack.length-1)historyStack=historyStack.slice(0,historyIdx+1);
    historyStack.push(currentUrl);historyIdx=historyStack.length-1;
    updateNavBtns();
  };
  var c=document.getElementById('content');c.innerHTML='';c.appendChild(iframe);
}
function doBack(){
  if(historyIdx>0){historyIdx--;loadFromHistory()}
}
function doFwd(){
  if(historyIdx<historyStack.length-1){historyIdx++;loadFromHistory()}
}
function loadFromHistory(){
  var url=historyStack[historyIdx];currentUrl=url;document.getElementById('urlBar').value=url;
  var iframe=document.createElement('iframe');
  iframe.src=url;
  iframe.setAttribute('sandbox','allow-scripts allow-forms allow-same-origin allow-popups allow-top-navigation');
  document.getElementById('content').innerHTML='';document.getElementById('content').appendChild(iframe);
  updateNavBtns();
}
function doRefresh(){go(currentUrl||document.getElementById('urlBar').value)}
function updateNavBtns(){document.getElementById('btnBack').disabled=historyIdx<=0;document.getElementById('btnFwd').disabled=historyIdx>=historyStack.length-1}
// Start with Bing
go('https://www.bing.com');
</script>
</body></html>`;
  },

  /* --- Mock: System Monitor --- */
  get _mockSysMon() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: -apple-system, 'Helvetica Neue', 'PingFang SC', sans-serif; font-size:13px; background:#fff; color:#1d1d1f; padding:16px; }
h3 { font-size:14px; font-weight:500; margin-bottom:12px; color:#6e6e73; text-transform:uppercase; letter-spacing:0.5px; }
.card { background:#f9f9fb; border:1px solid #e5e5ea; border-radius:8px; padding:14px; margin-bottom:12px; }
.stat-row { display:flex; justify-content:space-between; align-items:center; padding:4px 0; }
.stat-label { color:#6e6e73; }
.stat-value { font-weight:500; }
.bar { height:6px; background:#e5e5ea; border-radius:3px; margin-top:6px; overflow:hidden; }
.bar-fill { height:100%; border-radius:3px; transition:width 1s; }
.bar-fill.cpu { background:#007aff; }
.bar-fill.mem { background:#34c759; }
.app-list { max-height:200px; overflow-y:auto; }
.app-row { display:flex; align-items:center; gap:8px; padding:6px 0; border-bottom:1px solid #f0f0f0; }
.app-row:last-child { border:none; }
.app-row .icon { font-size:18px; width:24px; text-align:center; }
.app-row .name { flex:1; }
.app-row .info { color:#6e6e73; font-size:12px; }
</style>
</head>
<body>
<h3>⏱ 系统</h3>
<div class="card">
  <div class="stat-row"><span class="stat-label">系统版本</span><span class="stat-value">VibeOS 0.2.0</span></div>
  <div class="stat-row"><span class="stat-label">运行时间</span><span class="stat-value" id="uptime">00:00</span></div>
  <div class="stat-row"><span class="stat-label">活动窗口</span><span class="stat-value" id="winCount">0</span></div>
</div>
<h3><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;display:inline-block"><path d="M3 21h18M7 17V9M12 17V5M17 17v-7"/></svg> 资源</h3>
<div class="card">
  <div class="stat-row"><span class="stat-label">CPU</span><span class="stat-value" id="cpuVal">23%</span></div>
  <div class="bar"><div class="bar-fill cpu" id="cpuBar" style="width:23%"></div></div>
  <div class="stat-row" style="margin-top:12px"><span class="stat-label">内存</span><span class="stat-value" id="memVal">45%</span></div>
  <div class="bar"><div class="bar-fill mem" id="memBar" style="width:45%"></div></div>
</div>
<h3><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;display:inline-block"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg> 运行中的应用</h3>
<div class="card app-list" id="appList">
  <div class="app-row"><span class="icon"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;display:inline-block"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 21h8M12 18v3"/></svg></span><span class="name">WindowServer</span><span class="info">PID 1</span></div>
  <div class="app-row"><span class="icon"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;display:inline-block"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></span><span class="name">访达</span><span class="info">PID 42</span></div>
  <div class="app-row"><span class="icon"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;display:inline-block"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M13 15h4"/></svg></span><span class="name">终端</span><span class="info">PID 128</span></div>
</div>
<script>
let startTime = Date.now();
setInterval(()=>{
  const elapsed = Math.floor((Date.now()-startTime)/1000);
  const m = Math.floor(elapsed/60), s = elapsed%60;
  document.getElementById('uptime').textContent = String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  const cpu = 15 + Math.floor(Math.random()*25);
  const mem = 35 + Math.floor(Math.random()*20);
  document.getElementById('cpuVal').textContent = cpu+'%';
  document.getElementById('cpuBar').style.width = cpu+'%';
  document.getElementById('memVal').textContent = mem+'%';
  document.getElementById('memBar').style.width = mem+'%';
  // Update window count
  try { document.getElementById('winCount').textContent = window.parent?.document?.querySelectorAll('.window')?.length || 3; } catch(e) {}
}, 2000);
</script>
</body>
</html>`;
  },

  /* --- Mock: Music Player --- */
  get _mockMusic() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: -apple-system, 'Helvetica Neue', 'PingFang SC', sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); color:#fff; }
.artwork { width:160px; height:160px; border-radius:12px; background:rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; font-size:72px; margin-bottom:20px; box-shadow:0 8px 32px rgba(0,0,0,0.2); }
.song-title { font-size:18px; font-weight:600; margin-bottom:4px; }
.song-artist { font-size:14px; opacity:0.8; margin-bottom:24px; }
.progress-bar { width:280px; height:4px; background:rgba(255,255,255,0.3); border-radius:2px; margin-bottom:8px; cursor:pointer; position:relative; }
.progress-fill { width:35%; height:100%; background:#fff; border-radius:2px; transition:width 0.3s; }
.time-row { width:280px; display:flex; justify-content:space-between; font-size:11px; opacity:0.7; margin-bottom:20px; }
.controls { display:flex; gap:20px; align-items:center; }
.ctrl-btn { font-size:24px; background:none; border:none; color:#fff; cursor:pointer; width:44px; height:44px; display:flex; align-items:center; justify-content:center; border-radius:50%; transition:background 0.2s; }
.ctrl-btn:hover { background:rgba(255,255,255,0.15); }
.ctrl-btn.play { font-size:36px; width:56px; height:56px; background:rgba(255,255,255,0.2); }
.ctrl-btn.play:hover { background:rgba(255,255,255,0.3); }
.volume { display:flex; align-items:center; gap:8px; margin-top:16px; }
.volume input { width:100px; accent-color:#fff; }
</style>
</head>
<body>
<div class="artwork"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;display:inline-block"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg></div>
<div class="song-title">Cyber Dreams</div>
<div class="song-artist">AI Composer · VibeOS</div>
<div class="progress-bar" onclick="seek(event)"><div class="progress-fill" id="progress"></div></div>
<div class="time-row"><span id="curTime">1:24</span><span id="totalTime">3:52</span></div>
<div class="controls">
  <button class="ctrl-btn" onclick="prev()">⏮</button>
  <button class="ctrl-btn play" id="playBtn" onclick="togglePlay()">▶</button>
  <button class="ctrl-btn" onclick="next()">⏭</button>
</div>
<div class="volume">🔈<input type="range" min="0" max="100" value="70"></div>
<script>
let playing=false, progress=35, interval;
function togglePlay(){
  playing=!playing;
  document.getElementById('playBtn').textContent = playing?'⏸':'▶';
  if(playing){ interval=setInterval(()=>{ progress=Math.min(100,progress+0.5); document.getElementById('progress').style.width=progress+'%'; updateTime(); if(progress>=100){ progress=0; next(); } },1000); }
  else clearInterval(interval);
}
function prev(){ progress=0; document.getElementById('progress').style.width='0%'; updateTime(); }
function next(){ progress=0; document.getElementById('progress').style.width='0%'; document.querySelector('.song-title').textContent=['Cyber Dreams','Neon Nights','Digital Rain'][Math.floor(Math.random()*3)]; updateTime(); }
function seek(e){ const rect=e.target.getBoundingClientRect(); progress=Math.min(100,Math.max(0,((e.clientX-rect.left)/rect.width)*100)); document.getElementById('progress').style.width=progress+'%'; updateTime(); }
function updateTime(){ const total=232, cur=Math.floor(total*progress/100); document.getElementById('curTime').textContent=String(Math.floor(cur/60))+':'+String(cur%60).padStart(2,'0'); }
</script>
</body>
</html>`;
  },

  /* --- Mock: VibeCode --- */
  get _mockVibeCode() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: 'SF Mono','Cascadia Code','Consolas',monospace; font-size:13px; display:flex; flex-direction:column; height:100vh; background:#1e1e2e; color:#cdd6f4; }
.editor { flex:1; padding:16px; overflow-y:auto; white-space:pre-wrap; line-height:1.6; outline:none; border:none; resize:none; background:transparent; color:#cdd6f4; font:inherit; }
.editor:focus { outline:none; }
.statusbar { display:flex; padding:4px 12px; background:#181825; border-top:1px solid #313244; color:#6c7086; font-size:11px; justify-content:space-between; }
.keyword { color:#cba6f7; }
.string { color:#a6e3a1; }
.comment { color:#6c7086; font-style:italic; }
.func { color:#89b4fa; }
.type { color:#f9e2af; }
.number { color:#fab387; }
</style>
</head>
<body>
<div class="editor" contenteditable="true" spellcheck="false"><span class="keyword">import</span> { useState, useEffect } <span class="keyword">from</span> <span class="string">'react'</span>;

<span class="comment">// VibeCode - AI-powered IDE</span>
<span class="keyword">const</span> <span class="func">App</span> = () => {
  <span class="keyword">const</span> [code, setCode] = <span class="func">useState</span>(<span class="string">''</span>);

  <span class="func">useEffect</span>(() => {
    <span class="comment">// AI will help you write code here</span>
    <span class="func">console</span>.<span class="func">log</span>(<span class="string">'Welcome to VibeCode ✨'</span>);
  }, []);

  <span class="keyword">return</span> (
    &lt;<span class="type">div</span>&gt;
      &lt;<span class="type">h1</span>&gt;Hello, VibeOS!&lt;/<span class="type">h1</span>&gt;
    &lt;/<span class="type">div</span>&gt;
  );
};

<span class="keyword">export default</span> <span class="type">App</span>;</div>
<div class="statusbar">
  <span><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;display:inline-block"><circle cx="12" cy="12" r="6" fill="currentColor" stroke="none"/></svg> VibeCode IDE v0.1</span>
  <span>JavaScript · UTF-8 · 第 12 行</span>
  <span>Ln 12, Col 2</span>
</div>
<script>
document.querySelector('.editor').addEventListener('keydown', (e) => {
  if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '  '); }
});
// Auto-update statusbar
document.querySelector('.editor').addEventListener('keyup', function() {
  const text = this.innerText;
  const lines = text.split('\\n');
  // Simple status update
  const status = document.querySelector('.statusbar span:last-child');
  const sel = window.getSelection();
  if (sel.rangeCount) {
    const range = sel.getRangeAt(0);
    const preRange = document.createRange();
    preRange.selectNodeContents(this);
    preRange.setEnd(range.startContainer, range.startOffset);
    const textBefore = preRange.toString();
    const lineNum = textBefore.split('\\n').length;
    const colNum = textBefore.split('\\n').pop().length + 1;
    status.textContent = 'Ln ' + lineNum + ', Col ' + colNum;
  }
});
</script>
</body>
</html>`;
  },

  /* --- Mock: Image Viewer --- */
  get _mockImageView() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: -apple-system, sans-serif; display:flex; flex-direction:column; height:100vh; background:#1a1a1a; color:#fff; align-items:center; justify-content:center; }
.placeholder { display:flex; flex-direction:column; align-items:center; gap:16px; }
.placeholder .icon { font-size:80px; opacity:0.6; }
.placeholder p { color:#999; font-size:14px; }
.toolbar { position:absolute; bottom:0; left:0; right:0; display:flex; justify-content:center; gap:12px; padding:12px; background:rgba(0,0,0,0.5); }
.toolbar button { padding:6px 16px; border:1px solid rgba(255,255,255,0.2); border-radius:6px; background:rgba(255,255,255,0.1); color:#fff; cursor:pointer; font-size:13px; }
.toolbar button:hover { background:rgba(255,255,255,0.2); }
</style>
</head>
<body>
<div class="placeholder">
  <div class="icon"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;display:inline-block"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg></div>
  <p>拖拽图片到此处或点击打开</p>
  <p style="font-size:12px;color:#666">支持 PNG、JPG、GIF、WebP 格式</p>
</div>
<div class="toolbar">
  <button>⟵ 上一张</button>
  <button>↔ 适合窗口</button>
  <button>⟶ 下一张</button>
</div>
</body>
</html>`;
  },

  /* --- Mock: Snake Game --- */
  get _mockSnake() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#1a1a2e; color:#fff; font-family:monospace; }
canvas { border:2px solid #16213e; border-radius:4px; background:#0f3460; }
.score { font-size:20px; margin-bottom:12px; }
.score span { color:#e94560; font-weight:bold; }
.restart { margin-top:12px; padding:8px 24px; background:#e94560; color:#fff; border:none; border-radius:6px; font-size:14px; cursor:pointer; display:none; }
.restart:hover { background:#c73e54; }
</style>
</head>
<body>
<div class="score">🍎 <span id="points">0</span></div>
<canvas id="game" width="320" height="320"></canvas>
<button class="restart" id="restart" onclick="init()">重新开始</button>
<script>
const canvas=document.getElementById('game'), ctx=canvas.getContext('2d');
const grid=16, count=20;
let snake=[{x:10,y:10}], apple={x:15,y:15}, dx=0,dy=0,score=0,gameOver=false,loop;
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#e94560'; ctx.fillRect(apple.x*grid,apple.y*grid,grid-2,grid-2);
  snake.forEach((s,i)=>{
    ctx.fillStyle=i===0?'#16c79a':'#2eb872';
    ctx.fillRect(s.x*grid,s.y*grid,grid-2,grid-2);
  });
}
function update(){
  const head={x:snake[0].x+dx,y:snake[0].y+dy};
  if(head.x<0||head.x>=count||head.y<0||head.y>=count||snake.some(s=>s.x===head.x&&s.y===head.y)){ clearInterval(loop); gameOver=true; document.getElementById('restart').style.display='block'; return; }
  snake.unshift(head);
  if(head.x===apple.x&&head.y===apple.y){ score++; document.getElementById('points').textContent=score; apple={x:Math.floor(Math.random()*count),y:Math.floor(Math.random()*count)}; } else snake.pop();
  draw();
}
function init(){ snake=[{x:10,y:10}]; apple={x:15,y:15}; dx=0;dy=0; score=0; gameOver=false; document.getElementById('points').textContent='0'; document.getElementById('restart').style.display='none'; if(loop)clearInterval(loop); draw(); loop=setInterval(update,120); }
document.addEventListener('keydown',e=>{
  if(gameOver) return;
  switch(e.key){ case'ArrowUp':if(dy!==1){dx=0;dy=-1;} break; case'ArrowDown':if(dy!==-1){dx=0;dy=1;} break; case'ArrowLeft':if(dx!==1){dx=-1;dy=0;} break; case'ArrowRight':if(dx!==-1){dx=1;dy=0;} break; }
});
init();
</script>
</body>
</html>`;
  },

  /* --- Mock: Tetris --- */
  get _mockTetris() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#0d1117; color:#fff; font-family:monospace; }
canvas { border:2px solid #30363d; border-radius:4px; background:#161b22; }
.score { font-size:18px; margin-bottom:8px; }
.score span { color:#58a6ff; }
</style>
</head>
<body>
<div class="score">🏆 <span id="pts">0</span></div>
<canvas id="board" width="200" height="360"></canvas>
<p style="margin-top:10px;font-size:12px;color:#8b949e">← → 移动 · ↑ 旋转 · ↓ 加速 · 空格 硬降</p>
<script>
const ctx=document.getElementById('board').getContext('2d'), COLS=10,ROWS=18,SIZE=20;
const SHAPES=[[[1,1,1,1]],[[1,1],[1,1]],[[0,1,0],[1,1,1]],[[1,0,0],[1,1,1]],[[0,0,1],[1,1,1]],[[0,1,1],[1,1,0]],[[1,1,0],[0,1,1]]];
const COLORS=['#58a6ff','#f0883e','#3fb950','#db61a2','#d2a8ff','#f85149','#79c0ff'];
let board=Array(ROWS).fill().map(()=>Array(COLS).fill(0)), piece, score=0, loop;
function spawn(){ piece={shape:SHAPES[Math.floor(Math.random()*SHAPES.length)],color:COLORS[Math.floor(Math.random()*COLORS.length)],x:Math.floor((COLS-SHAPES[0][0].length)/2),y:0}; if(collide()){ clearInterval(loop); VibeOSAPI&&VibeOSAPI.dialog&&VibeOSAPI.dialog.alert('Game Over! Score: '+score); } }
function collide(){
  for(let r=0;r<piece.shape.length;r++) for(let c=0;c<piece.shape[r].length;c++)
    if(piece.shape[r][c]&&(board[piece.y+r]&&board[piece.y+r][piece.x+c])!==0) return true;
  return piece.x<0||piece.x+piece.shape[0].length>COLS||piece.y+piece.shape.length>ROWS;
}
function merge(){ for(let r=0;r<piece.shape.length;r++) for(let c=0;c<piece.shape[r].length;c++) if(piece.shape[r][c]) board[piece.y+r][piece.x+c]=piece.color; }
function clearRows(){ for(let r=ROWS-1;r>=0;r--){ if(board[r].every(c=>c!==0)){ board.splice(r,1); board.unshift(Array(COLS).fill(0)); score+=100; document.getElementById('pts').textContent=score; r++; } } }
function draw(){
  ctx.clearRect(0,0,200,360);
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) if(board[r][c]){ ctx.fillStyle=board[r][c]; ctx.fillRect(c*SIZE,r*SIZE,SIZE-1,SIZE-1); }
  if(piece) for(let r=0;r<piece.shape.length;r++) for(let c=0;c<piece.shape[r].length;c++) if(piece.shape[r][c]){ ctx.fillStyle=piece.color; ctx.fillRect((piece.x+c)*SIZE,(piece.y+r)*SIZE,SIZE-1,SIZE-1); }
}
function move(dx,dy){ piece.x+=dx; piece.y+=dy; if(collide()){ piece.x-=dx; piece.y-=dy; if(dy>0){ merge(); clearRows(); spawn(); } return false; } return true; }
function rotate(){ const rotated=piece.shape[0].map((_,i)=>piece.shape.map(r=>r[i]).reverse()); const old=piece.shape; piece.shape=rotated; if(collide()) piece.shape=old; }
function drop(){ while(move(0,1)); }
function step(){ if(!move(0,1)){ merge(); clearRows(); spawn(); } draw(); }
document.addEventListener('keydown',e=>{
  switch(e.key){ case'ArrowLeft':move(-1,0);break; case'ArrowRight':move(1,0);break; case'ArrowDown':move(0,1);break; case'ArrowUp':rotate();break; case' ':drop();break; }
  draw();
});
spawn(); loop=setInterval(step,400); draw();
</script>
</body>
</html>`;
  },

  /* --- Mock: LLM API Config --- */
  get _mockLLMAPI() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: -apple-system, 'Helvetica Neue', 'PingFang SC', sans-serif; font-size:13px; background:#fff; color:#333; padding:20px 24px; overflow-y:auto; }
h2 { font-size:16px; font-weight:600; margin-bottom:16px; color:#1d1d1f; }
.form-group { margin-bottom:14px; }
.form-label { display:block; font-size:12px; font-weight:500; margin-bottom:4px; color:#555; }
.form-input, .form-select { width:100%; max-width:420px; padding:7px 10px; border:1px solid #d0d0d0; border-radius:5px; font-size:13px; outline:none; background:#fff; }
.form-input:focus, .form-select:focus { border-color:#007aff; box-shadow:0 0 0 2px rgba(0,122,255,.12); }
.form-hint { font-size:11px; color:#999; margin-top:3px; }
.form-row { display:flex; gap:10px; }
.form-row .form-group { flex:1; }
.btn-row { display:flex; gap:8px; margin-top:8px; }
.btn { padding:7px 18px; border:1px solid #d0d0d0; border-radius:5px; font-size:13px; cursor:pointer; background:#fff; transition:background 80ms; }
.btn:hover { background:#f0f0f0; }
.btn-primary { background:#007aff; color:#fff; border-color:#007aff; }
.btn-primary:hover { background:#005ecb; }
.status { margin-top:10px; padding:6px 10px; border-radius:5px; font-size:12px; display:none; }
.status.success { background:#e8f5e9; color:#2e7d32; display:block; }
.status.error { background:#fdecea; color:#c62828; display:block; }
.test-result { margin-top:8px; padding:8px 10px; border-radius:5px; background:#f5f5f7; font-size:12px; color:#666; display:none; }
.test-result.show { display:block; }
.test-result.success { color:#2e7d32; }
.test-result.error { color:#c62828; }
</style>
</head>
<body>
<h2><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;display:inline-block"><circle cx="9" cy="9" r="4"/><path d="M12 12l8 8M16 16l3-3M14 18l3-3"/></svg> LLM API Configuration</h2>
<div class="form-group">
  <div class="form-label">Provider</div>
  <select class="form-select" id="provider" onchange="toggleProvider()">
    <option value="mock">Mock Mode (demo)</option>
    <option value="openai">OpenAI Compatible</option>
  </select>
  <div class="form-hint">Mock mode uses built-in apps without API calls</div>
</div>
<div id="api-fields">
  <div class="form-group">
    <div class="form-label">API Endpoint</div>
    <input class="form-input" id="endpoint" value="https://api.openai.com/v1" placeholder="https://api.openai.com/v1">
    <div class="form-hint">OpenAI-compatible API base URL</div>
  </div>
  <div class="form-group">
    <div class="form-label">API Key</div>
    <input class="form-input" id="apikey" type="password" placeholder="sk-..." value="">
    <div class="form-hint">Stored in browser localStorage only</div>
  </div>
  <div class="form-row">
    <div class="form-group">
      <div class="form-label">Model</div>
      <input class="form-input" id="model" value="" placeholder="glm-5.2 / gpt-4o / ...">
    </div>
    <div class="form-group">
      <div class="form-label">Max Tokens</div>
      <input class="form-input" id="maxtokens" value="65536" type="number">
    </div>
  </div>
  <div class="form-group">
    <div class="form-label">Temperature</div>
    <input class="form-input" id="temperature" value="0.3" type="number" step="0.1" min="0" max="2">
  </div>
</div>
<div class="btn-row">
  <button class="btn btn-primary" onclick="doSave()"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;display:inline-block"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save</button>
  <button class="btn" onclick="doTest()"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;display:inline-block"><circle cx="11" cy="11" r="7"/><path d="m20 20-4.35-4.35"/></svg> Test Connection</button>
  <button class="btn" onclick="doLoad()">↻ Reload</button>
</div>
<div class="status" id="status"></div>
<div class="test-result" id="testResult"></div>
<script>
function $(id){ return document.getElementById(id); }
function doLoad(){
  try{
    // Read from parent's in-memory config first (most up-to-date)
    let cfg = {};
    try { if(parent.VibeOSConfig) cfg = parent.VibeOSConfig.llm; } catch(e){}
    if(!cfg.provider) {
      const c=JSON.parse(localStorage.getItem('vibeos_config')||'{}');
      cfg = c.llm || {};
    }
    $('provider').value=cfg.provider||'mock';
    $('endpoint').value=cfg.apiEndpoint||'';
    $('apikey').value=cfg.apiKey||'';
    $('model').value=cfg.model||'';
    $('maxtokens').value=cfg.maxTokens||65536;
    $('temperature').value=cfg.temperature??0.3;
    toggleProvider();
    showStatus('Settings loaded','success');
  }catch(e){ showStatus('Load failed: '+e.message,'error'); }
}
function doSave(){
  try{
    let c=JSON.parse(localStorage.getItem('vibeos_config')||'{}');
    if(!c.llm) c.llm={};
    c.llm.provider=$('provider').value;
    c.llm.apiEndpoint=$('endpoint').value.replace(/\/+$/,'');
    c.llm.apiKey=$('apikey').value;
    c.llm.model=$('model').value;
    c.llm.maxTokens=parseInt($('maxtokens').value)||65536;
    c.llm.temperature=parseFloat($('temperature').value)??0.3;
    localStorage.setItem('vibeos_config',JSON.stringify(c));
    // Sync to in-memory config in parent window (no refresh needed)
    try { if(parent.VibeOSConfig) Object.assign(parent.VibeOSConfig.llm, c.llm); } catch(e){}
    showStatus('✓ Settings saved. Config synced to memory.','success');
  }catch(e){ showStatus('Save failed: '+e.message,'error'); }
}
async function doTest(){
  const endpoint=$('endpoint').value;
  const key=$('apikey').value;
  const model=$('model').value;
  if(!key){ showStatus('Please enter an API Key first','error'); return; }
  showStatus('Testing connection…','');
  try{
    const res=await fetch(endpoint+'/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
      body:JSON.stringify({model:model,messages:[{role:'user',content:'Say "ok"'}],max_tokens:5}),
      signal:AbortSignal.timeout(15000)
    });
    if(res.ok){ showStatus('✓ Connection successful!', 'success'); $('testResult').textContent='API responded with status '+res.status; $('testResult').className='test-result show success'; }
    else { const err=await res.text(); showStatus('✗ API error: '+res.status,'error'); $('testResult').textContent=err.substring(0,200); $('testResult').className='test-result show error'; }
  }catch(e){ showStatus('✗ Connection failed: '+e.message,'error'); $('testResult').textContent=e.message; $('testResult').className='test-result show error'; }
}
function showStatus(msg,type){
  $('status').textContent=msg; $('status').className='status '+type;
  if(type!=='') setTimeout(()=>{ $('status').textContent=''; $('status').className='status'; },4000);
}
function toggleProvider(){
  $('api-fields').style.display=$('provider').value==='mock'?'none':'';
}
doLoad();
</script>
</body>
</html>`;
  },

  /* --- Mock: App Store --- */
  get _mockAppStore() {
    return `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,sans-serif;padding:20px;background:#fff;color:#333;overflow-y:auto}
h2{font-size:16px;font-weight:600;margin-bottom:4px}.sub{font-size:12px;color:#999;margin-bottom:16px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}
.card{display:flex;flex-direction:column;padding:14px;border-radius:10px;background:#fafafa;border:1px solid #f0f0f0;cursor:pointer;transition:all 0.15s}
.card:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.08);border-color:#d0d0d0}
.card .icon{font-size:28px;margin-bottom:6px}.card .name{font-size:13px;font-weight:600;margin-bottom:2px}
.card .desc{font-size:11px;color:#888;margin-bottom:8px;line-height:1.4}
.card .btn{display:inline-block;padding:5px 14px;background:#007aff;color:#fff;border:none;border-radius:5px;font-size:12px;cursor:pointer;margin-top:auto}
.card .btn:hover{background:#005ecb}
</style></head><body>
<h2>App Store</h2><div class="sub">AI 预制应用市场 · 点击生成即用</div>
<div id="grid" class="grid"></div>
<script>
var apps=[
{name:"待办清单",glyph:"note",  desc:"添加/完成/删除任务",q:"生成待办清单应用。支持添加任务、标记完成、删除任务，数据存localStorage。"},
{name:"日历",    glyph:"calendar",desc:"月视图日历",q:"生成月视图日历应用。显示当月日期网格，可点击日期查看。"},
{name:"绘图板",  glyph:"palette", desc:"自由绘图+调色板",q:"生成Canvas绘图板。可选颜色和笔刷大小，支持清空。"},
{name:"图表工具",glyph:"chart",   desc:"数据生成柱状图/折线图",q:"生成图表工具。输入数值可切换柱状图或折线图显示。"},
{name:"扫雷",    glyph:"bomb",    desc:"经典扫雷游戏",q:"生成扫雷游戏。10x10网格，初级难度10个雷。左键揭开右键标记。"},
{name:"天气预报",glyph:"weather", desc:"城市天气查看",q:"生成天气预报应用。输入城市名显示温度天气湿度（模拟数据）。"},
{name:"Markdown笔记",glyph:"book",desc:"Markdown编辑+预览",q:"生成Markdown笔记。左右分栏，左侧编辑右侧实时预览。"},
{name:"番茄钟",  glyph:"clock",   desc:"25分钟专注计时",q:"生成番茄钟应用。25分钟工作倒计时+5分钟休息循环。"},
{name:"汇率换算",glyph:"exchange",desc:"实时汇率换算",q:"生成汇率换算器。输入金额选择货币进行换算（模拟汇率）。"},
{name:"打砖块",  glyph:"target",  desc:"经典打砖块游戏",q:"生成打砖块游戏。Canvas绘制，鼠标控制挡板反弹球击碎砖块。"},
{name:"日记本",  glyph:"notepad", desc:"日记+日历",q:"生成日记应用。选择日期写日记，数据存localStorage。"},
{name:"单位换算",glyph:"abacus",  desc:"长度/重量/温度换算",q:"生成单位换算工具。支持长度/重量/温度三种类型转换。"}
];
// 简易 glyph SVG 集 (与父窗 Icons 同步的精简版)
var GLYPHS={
note:'<path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h8M8 17h5"/>',
calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
palette:'<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="7" r="1.3" fill="currentColor" stroke="none"/><circle cx="16" cy="10" r="1.3" fill="currentColor" stroke="none"/>',
chart:'<path d="M3 21h18M7 17V9M12 17V5M17 17v-7"/>',
bomb:'<circle cx="11" cy="13" r="7"/><path d="M16 7l3-3M18 4l2 2M14 5l2-2"/>',
weather:'<circle cx="9" cy="14" r="4"/><path d="M13 11a4 4 0 0 1 8 0 3 3 0 0 1 0 6H9"/>',
book:'<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
exchange:'<path d="M7 7h13l-3-3M17 17H4l3 3"/>',
target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
notepad:'<path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h8M8 17h5"/>',
abacus:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M12 4v16M17 4v16M3 9h18M3 15h18"/>',
bolt:'<path d="M13 2 L4 14h7l-2 8 9-12h-7z" fill="currentColor" stroke="none"/>'
};
function svgIcon(name,size){size=size||40;return '<svg viewBox="0 0 24 24" width="'+size+'" height="'+size+'" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(GLYPHS[name]||'')+'</svg>';}
var g=document.getElementById("grid");
for(var i=0;i<apps.length;i++){
  var a=apps[i];
  g.innerHTML+='<div class="card"><div class="icon" style="color:#0a84ff;display:flex;align-items:center;justify-content:center;height:48px;">'+svgIcon(a.glyph,40)+'</div><div class="name">'+a.name+'</div><div class="desc">'+a.desc+'</div><button class="btn" onclick="generate('+i+')"><span style="display:inline-flex;width:14px;height:14px;vertical-align:middle;margin-right:4px;color:currentColor;">'+svgIcon('bolt',14)+'</span>生成</button></div>';
}
function generate(idx){
  var a=apps[idx];
  var seed=Date.now()%10000;
  var styles=['简洁风格','现代风格','经典风格','暗色主题','圆角设计','极简风格','渐变配色'];
  var style=styles[Math.floor(Math.random()*styles.length)];
  VibeOSAPI.app.launch(a.name, a.glyph, a.q+' 这次用'+style+'设计，每次生成都要不同。随机种子:'+seed);
}
</script></body></html>`;
  },

  /* --- Mock: Generic App --- */
  _mockGeneric(appId) {
    const app = AppRegistry.get(appId);
    const name = app?.name || appId;
    const iconSvg = (typeof Icons !== 'undefined' ? Icons.app(app?.iconId || appId) : '');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: -apple-system, 'Segoe UI', 'PingFang SC', sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#fff; color:#1a1a1a; }
.icon { width:80px; height:80px; margin-bottom:16px; display:flex; align-items:center; justify-content:center; }
.icon svg { width:100%; height:100%; }
h1 { font-size:20px; font-weight:600; margin-bottom:8px; }
p { color:#999; font-size:13px; text-align:center; line-height:1.6; max-width:300px; }
.hint { margin-top:24px; padding:12px 20px; background:#f0f7ff; border-radius:8px; font-size:12px; color:#0078d4; }
</style>
</head>
<body>
<div class="icon">${iconSvg}</div>
<h1>${name}</h1>
<p>此应用将在配置 LLM API 后由 AI 实时生成<br>目前为 Mock 占位模式</p>
<div class="hint">提示：打开「设置」-「LLM API」配置 API Key，即可让 AI 为您生成完整的应用界面和功能</div>
</body>
</html>`;
  },
};
