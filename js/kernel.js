/* ============================================
   VibeOS Kernel - System Bootstrap (macOS Style)
   ============================================ */

const VibeOS = {
  version: '0.2.0',
  build: 'Phase 1 - macOS Aqua Style (VibeOS Ref)',

  /* ==========================================
     LLM 实时统计（由 AppGenerator 上报）
     ========================================== */
  _llmStats: {
    totalCalls: 0,
    activeCalls: 0,
    successCalls: 0,
    failedCalls: 0,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    lastModel: '',
    lastEndpoint: '',
    lastConnectMs: 0,
    lastFirstByteMs: 0,
    lastDurationMs: 0,
    lastTokensPerSec: 0,
    lastPromptChars: 0,
    lastOutputChars: 0,
    lastUsage: null,
    lastError: '',
    lastErrorTs: 0,
    /* 连通性探测 */
    pingState: 'idle',  // 'idle' | 'ok' | 'fail'
    pingLatencyMs: 0,
    pingTs: 0,
  },

  /**
   * 一次性迁移：把旧版 webos_* localStorage key 拷到 vibeos_* 并删除旧的。
   * 已存在 vibeos_* key 时跳过（说明迁移已完成），避免覆盖用户在 vibeos 下的新数据。
   */
  _migrateLegacyStorage() {
    const LEGACY = ['webos_config', 'webos_installed_apps', 'webos_icon_positions', 'webos_fs_'];
    let migrated = 0;
    try {
      // 单 key
      for (const oldKey of LEGACY.filter(k => !k.endsWith('_'))) {
        if (localStorage.getItem(oldKey) !== null && localStorage.getItem('vibeos_' + oldKey.slice(6)) === null) {
          localStorage.setItem('vibeos_' + oldKey.slice(6), localStorage.getItem(oldKey));
          localStorage.removeItem(oldKey);
          migrated++;
        } else if (localStorage.getItem(oldKey) !== null) {
          // 新 key 已存在，直接清旧的避免重复检测
          localStorage.removeItem(oldKey);
        }
      }
      // 前缀 key（webos_fs_*, webos_appdata_*）
      const prefixes = ['webos_fs_', 'webos_appdata_'];
      const toRemove = [];
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (!k) continue;
        for (const p of prefixes) {
          if (k.startsWith(p)) {
            const newK = 'vibeos_' + k.slice(6);
            if (localStorage.getItem(newK) === null) {
              localStorage.setItem(newK, localStorage.getItem(k));
              migrated++;
            }
            toRemove.push(k);
            break;
          }
        }
      }
      toRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.warn('[VibeOS] storage migration skipped:', e.message);
    }
    if (migrated > 0) console.log(`📦 Migrated ${migrated} legacy webos_* keys → vibeos_*`);
  },

  async init() {
    console.log(`🖥️  VibeOS v${this.version} starting...`);
    this._migrateLegacyStorage();
    this._showBootScreen();

    const steps = [
      ['正在加载系统配置…',     () => VibeOSConfig.load()],
      ['正在初始化文件系统…',   () => FileSystem.init()],
      ['正在建立沙箱环境…',     () => Sandbox.init()],
      ['正在检查已安装应用…',   () => InstalledApps.init()],
      ['正在启动窗口管理器…',   () => WindowManager.init()],
      ['正在加载桌面…',         () => Desktop.init()],
      ['正在渲染菜单栏…',       () => Menubar.init()],
      ['正在布置 Dock…',        () => Dock.init()],
    ];

    for (let i = 0; i < steps.length; i++) {
      const [label, fn] = steps[i];
      this._updateBootStatus(label);
      try {
        fn();
        this._updateBootProgress((i + 1) / (steps.length + 1));
        console.log('   ' + label + ' ✓');
      } catch (e) {
        console.error('   ' + label + ' FAILED:', e.message);
      }
      await new Promise(r => setTimeout(r, 150)); // deliberate pacing
    }

    // Apply saved theme
    this._applyTheme();

    this._updateBootStatus('初始化完成');
    this._updateBootProgress(1);

    // Fade out boot screen
    await new Promise(r => setTimeout(r, 600));
    this._hideBootScreen();
    await new Promise(r => setTimeout(r, 500));

    // Welcome notification
    try {
      Notification.show('欢迎使用 VibeOS', 'AI 驱动的 macOS Aqua 风桌面系统', 'computer');
    } catch(e) {}

    this._bindKeyboardShortcuts();
    console.log('✅ VibeOS initialized');
    this._startHotReload();
    this._startLLMPing();
    window._bootTime = Date.now();
  },

  /* Apply saved theme from config */
  _applyTheme() {
    const theme = VibeOSConfig.desktop.theme || 'light';
    const dt = document.getElementById('desktop');
    if (!dt) return;
    if (theme === 'dark') {
      dt.classList.add('dark');
    } else {
      dt.classList.remove('dark');
    }
    console.log(`   主题: ${theme} ✓`);
  },

  /* ==========================================
     LLM 连通性后台探测（每 30s）
     ========================================== */
  _llmPingTimer: null,
  _startLLMPing() {
    const ping = async () => {
      const c = VibeOSConfig.llm;
      if (!c?.apiKey || !c?.apiEndpoint || c?.provider === 'mock') {
        this._llmStats.pingState = 'idle';
        this._llmStats.pingLatencyMs = 0;
        return;
      }
      const t0 = performance.now();
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 8000);
        const r = await fetch(`${c.apiEndpoint}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${c.apiKey}` },
          body: JSON.stringify({ model: c.model, messages: [{role:'user',content:'ping'}], max_tokens: 1, stream: false }),
          signal: ctrl.signal,
        });
        clearTimeout(tid);
        this._llmStats.pingLatencyMs = Math.round(performance.now() - t0);
        this._llmStats.pingState = r.ok ? 'ok' : 'fail';
        this._llmStats.pingTs = Date.now();
      } catch (e) {
        this._llmStats.pingState = 'fail';
        this._llmStats.pingLatencyMs = Math.round(performance.now() - t0);
        this._llmStats.pingTs = Date.now();
      }
    };
    // 启动 3s 后第一次探测，之后每 30s 一次
    setTimeout(ping, 3000);
    this._llmPingTimer = setInterval(ping, 30000);
  },

  /* ==========================================
     Boot Screen (macOS-style)
     ========================================== */
  _showBootScreen() {
    const boot = document.createElement('div');
    boot.id = 'boot-screen';
    boot.style.cssText = 'position:fixed;inset:0;background:#1a1a1a;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:opacity 0.6s;';
    boot.innerHTML = `
      <div style="text-align:center;">
        <div id="boot-logo" style="margin-bottom:12px;display:flex;align-items:center;justify-content:center;width:90px;height:90px;margin-left:auto;margin-right:auto;color:#fff;">
          <svg viewBox="0 0 64 64" width="90" height="90" xmlns="http://www.w3.org/2000/svg">
            <defs><linearGradient id="bootg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5ec8ff"/><stop offset="1" stop-color="#1a8cff"/></linearGradient></defs>
            <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#bootg)"/>
            <rect x="12" y="16" width="40" height="26" rx="3" fill="#fff"/>
            <path d="M22 48h20l1 4H21z" fill="#fff" opacity="0.6"/>
          </svg>
        </div>
        <div style="color:#fff;font-size:22px;font-weight:300;letter-spacing:2px;margin-bottom:40px;">VibeOS</div>
        <div id="boot-status" style="color:#888;font-size:12px;margin-bottom:16px;height:18px;">正在启动…</div>
        <div style="width:300px;height:3px;background:#333;border-radius:2px;overflow:hidden;margin:0 auto;">
          <div id="boot-progress" style="height:100%;width:0%;background:#fff;border-radius:2px;transition:width 0.5s ease;"></div>
        </div>
      </div>
    `;
    document.body.appendChild(boot);
    this._bootScreen = boot;
    document.getElementById('desktop').style.visibility = 'hidden';
  },

  _updateBootStatus(text) {
    const el = document.getElementById('boot-status');
    if (el) el.textContent = text;
  },

  _updateBootProgress(pct) {
    const bar = document.getElementById('boot-progress');
    if (bar) bar.style.width = Math.round(pct * 100) + '%';
  },

  _hideBootScreen() {
    if (this._bootScreen) {
      this._bootScreen.style.opacity = '0';
      document.getElementById('desktop').style.visibility = 'visible';
      setTimeout(() => {
        if (this._bootScreen) { this._bootScreen.remove(); this._bootScreen = null; }
      }, 700);
    }
  },

  _bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Allow window management shortcuts even when focused on input/textarea
      const isWindowShortcut = e.metaKey && (e.key === 'w' || e.key === 'm' || e.key === 'Tab');

      if (!isWindowShortcut && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

      // Cmd+Tab: app switcher
      if (e.metaKey && e.key === 'Tab') {
        e.preventDefault();
        WindowManager.showAppSwitcher();
      }

      // Cmd+M: minimize
      if (e.metaKey && e.key === 'm') {
        e.preventDefault();
        if (WindowManager.focusedId) {
          WindowManager.minimize(WindowManager.focusedId);
        }
      }

      // Cmd+W: close window
      if (e.metaKey && e.key === 'w') {
        e.preventDefault();
        if (WindowManager.focusedId) {
          WindowManager.close(WindowManager.focusedId);
        }
      }
    });
  },

  /* ==========================================
     Diagnostic Panel (Cmd+Shift+D)
     ========================================== */
  _diagPanel: null,
  _diagRefresh: null,

  _toggleDiagnostics() {
    if (this._diagPanel) { this._closeDiagnostics(); return; }
    this._showDiagnostics();
  },

  _showDiagnostics() {
    const panel = document.createElement('div');
    panel.id = 'diag-panel';
    panel.style.cssText = [
      'position:fixed','top:40px','right:14px','width:380px','max-height:84vh',
      'background:rgba(28,28,30,0.78)','backdrop-filter:saturate(180%) blur(28px)',
      '-webkit-backdrop-filter:saturate(180%) blur(28px)',
      'color:#f5f5f7','font-family:-apple-system,"SF Pro Text","PingFang SC",sans-serif',
      'font-size:12px','z-index:9999','border-radius:12px','overflow:hidden',
      'box-shadow:0 20px 60px rgba(0,0,0,0.45),0 0 0 0.5px rgba(255,255,255,0.08) inset',
      'display:flex','flex-direction:column'
    ].join(';') + ';';

    panel.innerHTML = `
      <style>
        #diag-panel .diag-head{
          padding:10px 14px;display:flex;justify-content:space-between;align-items:center;
          background:linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0));
          border-bottom:0.5px solid rgba(255,255,255,0.08);cursor:move;user-select:none;
        }
        #diag-panel .diag-title{display:flex;align-items:center;gap:8px;font-weight:600;font-size:13px;letter-spacing:0.2px;}
        #diag-panel .diag-title .dot{width:8px;height:8px;border-radius:50%;background:#30d158;box-shadow:0 0 6px #30d158;}
        #diag-panel .diag-title .hint{color:#8e8e93;font-weight:400;font-size:11px;margin-left:6px;}
        #diag-panel .diag-close{
          width:14px;height:14px;border-radius:50%;background:#ff5f57;cursor:pointer;
          box-shadow:inset 0 0 0 0.5px rgba(0,0,0,0.2);transition:filter 0.15s;
        }
        #diag-panel .diag-close:hover{filter:brightness(1.15);}
        #diag-panel .diag-body{padding:10px 12px 14px;overflow-y:auto;max-height:calc(84vh - 44px);scrollbar-width:thin;}
        #diag-panel .diag-body::-webkit-scrollbar{width:6px;}
        #diag-panel .diag-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:3px;}
        #diag-panel .card{
          background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.06);
          border-radius:10px;padding:10px 12px;margin-bottom:8px;
        }
        #diag-panel .card-title{
          font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;
          color:#8e8e93;margin-bottom:8px;display:flex;align-items:center;gap:6px;
        }
        #diag-panel .row{display:flex;justify-content:space-between;align-items:center;padding:3px 0;font-size:12px;line-height:1.5;}
        #diag-panel .row .k{color:#a1a1a6;}
        #diag-panel .row .v{color:#f5f5f7;font-variant-numeric:tabular-nums;font-feature-settings:"tnum";}
        #diag-panel .v.mono{font-family:"SF Mono","JetBrains Mono",Menlo,monospace;font-size:11px;}
        #diag-panel .pill{
          display:inline-block;padding:1px 7px;border-radius:8px;font-size:10px;
          background:rgba(120,120,128,0.32);color:#f5f5f7;
        }
        #diag-panel .pill.green{background:rgba(48,209,88,0.22);color:#30d158;}
        #diag-panel .pill.blue{background:rgba(10,132,255,0.22);color:#0a84ff;}
        #diag-panel .pill.orange{background:rgba(255,159,10,0.22);color:#ff9f0a;}
        #diag-panel .pill.red{background:rgba(255,69,58,0.22);color:#ff453a;}
        #diag-panel .bar{height:4px;border-radius:2px;background:rgba(255,255,255,0.08);overflow:hidden;margin-top:6px;}
        #diag-panel .bar > span{display:block;height:100%;border-radius:2px;background:linear-gradient(90deg,#0a84ff,#5e5ce6);transition:width 0.4s;}
        #diag-panel .bar.warn > span{background:linear-gradient(90deg,#ff9f0a,#ff453a);}
        #diag-panel .grid2{display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;}
        #diag-panel .winlist{margin-top:4px;max-height:140px;overflow-y:auto;}
        #diag-panel .win{
          display:flex;align-items:center;gap:8px;padding:5px 6px;border-radius:6px;
          font-size:11px;color:#d1d1d6;
        }
        #diag-panel .win:hover{background:rgba(255,255,255,0.05);}
        #diag-panel .win .ic{width:16px;text-align:center;}
        #diag-panel .win .nm{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        #diag-panel .win .geo{color:#6e6e73;font-family:"SF Mono",monospace;font-size:10px;}
        #diag-panel .win.focus{background:rgba(10,132,255,0.16);}
        #diag-panel .win.focus .nm{color:#0a84ff;font-weight:500;}
        #diag-panel .empty{color:#6e6e73;font-style:italic;padding:6px;text-align:center;}
        #diag-panel svg.spark{display:block;width:100%;height:36px;margin-top:6px;}
      </style>
      <div class="diag-head" id="diag-head">
        <div class="diag-title">
          <span class="dot"></span>
          <span>系统诊断</span>
          <span class="hint">⌘⇧D 关闭</span>
        </div>
        <span class="diag-close" id="diag-close" title="关闭"></span>
      </div>
      <div class="diag-body" id="diag-content"></div>
    `;
    document.body.appendChild(panel);
    this._diagPanel = panel;

    // Drag to move
    (() => {
      const head = panel.querySelector('#diag-head');
      let sx=0, sy=0, ox=0, oy=0, drag=false;
      head.addEventListener('mousedown', e => {
        if (e.target.id === 'diag-close') return;
        drag = true; sx = e.clientX; sy = e.clientY;
        const r = panel.getBoundingClientRect();
        ox = r.left; oy = r.top;
        panel.style.right = 'auto';
        panel.style.left = ox + 'px';
        panel.style.top  = oy + 'px';
        e.preventDefault();
      });
      window.addEventListener('mousemove', e => {
        if (!drag) return;
        panel.style.left = (ox + e.clientX - sx) + 'px';
        panel.style.top  = Math.max(0, oy + e.clientY - sy) + 'px';
      });
      window.addEventListener('mouseup', () => { drag = false; });
    })();

    panel.querySelector('#diag-close').onclick = () => this._closeDiagnostics();

    // History buffers for sparklines
    this._diagHist = { mem: [], win: [], cache: [] };

    const refresh = () => {
      const ce = document.getElementById('diag-content');
      if (!ce) { clearInterval(this._diagRefresh); return; }
      const ws = WindowManager.getAll();
      const visCount = WindowManager.getAllVisible().length;
      const focusedId = WindowManager.focusedId;

      // localStorage usage
      let lsBytes = 0, lsKeys = 0;
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          lsBytes += (k||'').length + (localStorage.getItem(k)||'').length;
          lsKeys++;
        }
      } catch(e) {}
      const lsKB = lsBytes / 1024;
      const lsPctOfQuota = Math.min(100, (lsBytes / (5 * 1024 * 1024)) * 100); // 5MB rough quota

      // JS heap (Chrome only)
      let memUsedMB = null, memLimitMB = null, memPct = 0;
      if (performance && performance.memory) {
        memUsedMB = performance.memory.usedJSHeapSize / 1048576;
        memLimitMB = performance.memory.jsHeapSizeLimit / 1048576;
        memPct = (memUsedMB / memLimitMB) * 100;
      }

      // Update history
      this._diagHist.mem.push(memPct || lsPctOfQuota);
      this._diagHist.win.push(ws.length);
      const cacheCount = Object.keys((window.AppGenerator && AppGenerator._cache)||{}).length;
      this._diagHist.cache.push(cacheCount);
      Object.keys(this._diagHist).forEach(k => {
        if (this._diagHist[k].length > 40) this._diagHist[k].shift();
      });

      const uptime = Math.floor((Date.now() - (window._bootTime || Date.now())) / 1000);
      const upStr = (() => {
        const h = Math.floor(uptime/3600), m = Math.floor((uptime%3600)/60), s = uptime%60;
        return (h?h+'h ':'') + (m?m+'m ':'') + s + 's';
      })();

      const provider = VibeOSConfig.llm.provider || 'mock';
      const providerCls = provider === 'openai' ? 'green' : (provider === 'mock' ? 'orange' : 'blue');
      const themeCls = VibeOSConfig.desktop.theme === 'dark' ? 'blue' : 'orange';

      // === LLM 实时统计 ===
      const ls = this._llmStats;
      const totalTokens = ls.totalPromptTokens + ls.totalCompletionTokens;
      // 估算成本（以 USD 计；按 deepseek/glm 平均价；仅作为参考）
      const costUsd = (ls.totalPromptTokens / 1000 * 0.0014) + (ls.totalCompletionTokens / 1000 * 0.0028);
      const pingCls = ls.pingState === 'ok' ? 'green' : (ls.pingState === 'fail' ? 'red' : 'orange');
      const pingLabel = ls.pingState === 'ok' ? '在线' : (ls.pingState === 'fail' ? '失败' : '未探测');
      const latencyCls = ls.pingLatencyMs === 0 ? '' : (ls.pingLatencyMs < 500 ? 'green' : ls.pingLatencyMs < 1500 ? 'orange' : 'red');

      const sparkline = (arr, color) => {
        if (!arr.length) return '';
        const max = Math.max(...arr, 1);
        const min = Math.min(...arr);
        const range = (max - min) || 1;
        const w = 320, h = 36, step = arr.length > 1 ? w/(arr.length-1) : 0;
        const pts = arr.map((v,i) => `${(i*step).toFixed(1)},${(h - ((v-min)/range)*h).toFixed(1)}`).join(' ');
        return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
          <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
          <polyline points="0,${h} ${pts} ${w},${h}" fill="${color}" opacity="0.12" stroke="none"/>
        </svg>`;
      };

      const memBarCls = memPct > 75 ? 'bar warn' : 'bar';
      const lsBarCls  = lsPctOfQuota > 75 ? 'bar warn' : 'bar';

      const winRows = ws.map(w => {
        const flags = [];
        if (w.minimized) flags.push('<span class="pill">最小化</span>');
        if (w.maximized) flags.push('<span class="pill blue">最大化</span>');
        const isFocus = w.id === focusedId;
        return `<div class="win ${isFocus?'focus':''}">
          <span class="ic" style="display:inline-flex;width:14px;height:14px;flex-shrink:0;color:#a1a1a6;">${(typeof w.icon==='string' && w.icon.trim().startsWith('<svg')) ? w.icon : Icons.glyph('files')}</span>
          <span class="nm">${(w.title||w.name||'(未命名)')}</span>
          ${flags.join(' ')}
          <span class="geo">${w.width}×${w.height}</span>
        </div>`;
      }).join('') || '<div class="empty">无活动窗口</div>';

      const ic = (n) => `<span style="display:inline-flex;width:13px;height:13px;color:#8e8e93;vertical-align:middle;margin-right:4px;">${Icons.glyph(n)}</span>`;

      ce.innerHTML = `
        <div class="card">
          <div class="card-title">${ic('clock')}运行时</div>
          <div class="grid2">
            <div class="row"><span class="k">系统</span><span class="v">VibeOS ${VibeOS.version}</span></div>
            <div class="row"><span class="k">运行</span><span class="v mono">${upStr}</span></div>
            <div class="row"><span class="k">构建</span><span class="v" style="font-size:11px">${VibeOS.build.split('-')[0].trim()||VibeOS.build}</span></div>
            <div class="row"><span class="k">时间</span><span class="v mono">${new Date().toLocaleTimeString()}</span></div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">${ic('chart')}资源</div>
          <div class="row">
            <span class="k">JS 堆</span>
            <span class="v mono">${memUsedMB!=null ? memUsedMB.toFixed(1)+' / '+memLimitMB.toFixed(0)+' MB' : '不可用'}</span>
          </div>
          ${memUsedMB!=null ? `<div class="${memBarCls}"><span style="width:${memPct.toFixed(1)}%"></span></div>` : ''}
          <div class="row" style="margin-top:8px">
            <span class="k">localStorage</span>
            <span class="v mono">${lsKB.toFixed(1)} KB · ${lsKeys} 键</span>
          </div>
          <div class="${lsBarCls}"><span style="width:${lsPctOfQuota.toFixed(1)}%"></span></div>
          ${sparkline(this._diagHist.mem, '#0a84ff')}
        </div>

        <div class="card">
          <div class="card-title">${ic('files')}窗口管理 <span class="pill blue">${ws.length}</span></div>
          <div class="grid2">
            <div class="row"><span class="k">总数</span><span class="v">${ws.length}</span></div>
            <div class="row"><span class="k">可见</span><span class="v">${visCount}</span></div>
            <div class="row"><span class="k">最小化</span><span class="v">${ws.filter(w=>w.minimized).length}</span></div>
            <div class="row"><span class="k">聚焦</span><span class="v mono" style="font-size:10px">${focusedId||'—'}</span></div>
          </div>
          <div class="winlist">${winRows}</div>
        </div>

        <div class="card">
          <div class="card-title">${ic('bolt')}LLM 配置</div>
          <div class="row"><span class="k">Provider</span><span class="v"><span class="pill ${providerCls}">${provider}</span></span></div>
          <div class="row"><span class="k">Model</span><span class="v mono">${VibeOSConfig.llm.model||'—'}</span></div>
          <div class="row"><span class="k">Endpoint</span><span class="v mono" style="font-size:10px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${VibeOSConfig.llm.apiEndpoint||''}">${VibeOSConfig.llm.apiEndpoint||'—'}</span></div>
          <div class="row"><span class="k">API Key</span><span class="v">${VibeOSConfig.llm.apiKey ? '<span class="pill green">已配置</span>' : '<span class="pill red">未配置</span>'}</span></div>
        </div>

        <div class="card">
          <div class="card-title">${ic('bolt')}LLM 实时
            <span class="pill ${pingCls}" style="margin-left:auto">● ${pingLabel}</span>
          </div>
          <div class="row"><span class="k">连通延迟</span><span class="v mono">${ls.pingLatencyMs ? ls.pingLatencyMs+' ms' : '—'} ${latencyCls?`<span class="pill ${latencyCls}" style="margin-left:6px">${ls.pingLatencyMs<500?'快':(ls.pingLatencyMs<1500?'一般':'慢')}</span>`:''}</span></div>
          <div class="row"><span class="k">活动调用</span><span class="v">${ls.activeCalls} / 总 ${ls.totalCalls}</span></div>
          <div class="row"><span class="k">成功 · 失败</span><span class="v"><span class="pill green">${ls.successCalls}</span> · <span class="pill ${ls.failedCalls?'red':''}">${ls.failedCalls}</span></span></div>
          <div style="height:1px;background:rgba(255,255,255,0.06);margin:6px 0"></div>
          <div class="row"><span class="k">最近首字节</span><span class="v mono">${ls.lastFirstByteMs?ls.lastFirstByteMs+' ms':'—'}</span></div>
          <div class="row"><span class="k">最近耗时</span><span class="v mono">${ls.lastDurationMs?(ls.lastDurationMs/1000).toFixed(2)+' s':'—'}</span></div>
          <div class="row"><span class="k">最近输出</span><span class="v mono">${ls.lastOutputChars||0} 字符</span></div>
          <div class="row"><span class="k">输出速率</span><span class="v mono">${ls.lastTokensPerSec?ls.lastTokensPerSec+' tok/s':'—'}</span></div>
          ${ls.lastUsage ? `
            <div style="height:1px;background:rgba(255,255,255,0.06);margin:6px 0"></div>
            <div class="row"><span class="k">本次 Prompt</span><span class="v mono">${ls.lastUsage.prompt_tokens||0} tok</span></div>
            <div class="row"><span class="k">本次 Output</span><span class="v mono">${ls.lastUsage.completion_tokens||0} tok</span></div>
          ` : ''}
          <div style="height:1px;background:rgba(255,255,255,0.06);margin:6px 0"></div>
          <div class="row"><span class="k">累计 Prompt</span><span class="v mono">${ls.totalPromptTokens.toLocaleString()} tok</span></div>
          <div class="row"><span class="k">累计 Output</span><span class="v mono">${ls.totalCompletionTokens.toLocaleString()} tok</span></div>
          <div class="row"><span class="k">累计总量</span><span class="v"><span class="pill blue">${totalTokens.toLocaleString()} tok</span></span></div>
          <div class="row"><span class="k">估算成本</span><span class="v mono">¥ ${(costUsd*7.2).toFixed(4)} <span style="color:#6e6e73">($${costUsd.toFixed(4)})</span></span></div>
          ${ls.lastError ? `<div class="row" style="margin-top:6px"><span class="k">最近错误</span><span class="v" style="color:#ff453a;font-size:11px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${ls.lastError}">${ls.lastError}</span></div>` : ''}
        </div>

        <div class="card">
          <div class="card-title">${ic('package')}子系统</div>
          <div class="grid2">
            <div class="row"><span class="k">已装应用</span><span class="v">${InstalledApps.getAll().length}</span></div>
            <div class="row"><span class="k">Sandbox API</span><span class="v">${Sandbox.ALLOWED_ACTIONS.length}</span></div>
            <div class="row"><span class="k">App 缓存</span><span class="v">${cacheCount} 条</span></div>
            <div class="row"><span class="k">缓存有效期</span><span class="v">${VibeOSConfig.appCacheExpiry||0} 分钟</span></div>
            <div class="row"><span class="k">主题</span><span class="v"><span class="pill ${themeCls}">${VibeOSConfig.desktop.theme||'light'}</span></span></div>
            <div class="row"><span class="k">语言</span><span class="v">${VibeOSConfig.desktop.language||'zh-CN'}</span></div>
          </div>
        </div>
      `;
    };
    refresh();
    this._diagRefresh = setInterval(refresh, 1000);
  },

  _closeDiagnostics() {
    if (this._diagPanel) { this._diagPanel.remove(); this._diagPanel = null; }
    clearInterval(this._diagRefresh);
  },

  /* ==========================================
     Hot Reload — watch for file changes
     ========================================== */
  _hotReloadInterval: null,

  _startHotReload() {
    if (this._hotReloadInterval) return;
    this._hotReloadInterval = setInterval(async () => {
      try {
        const r = await fetch('index.html?_t=' + Date.now(), { cache: 'no-store' });
        const text = await r.text();
        // Simple hash: sum char codes — catches content changes, not just length
        let hash = 0;
        for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
        if (this._lastHash && this._lastHash !== hash) {
          console.log('🔄 检测到文件变更，正在热重载...');
          clearInterval(this._hotReloadInterval);
          location.reload();
        }
        this._lastHash = hash;
      } catch(e) {}
    }, 3000);
  },

  getInfo() {
    return {
      version: this.version,
      build: this.build,
      windows: WindowManager.getAll().length,
      visibleWindows: WindowManager.getAllVisible().length,
      storage: FileSystem.getUsage(),
      config: {
        provider: VibeOSConfig.llm.provider,
        theme: VibeOSConfig.desktop.theme,
      },
    };
  },
};

document.addEventListener('DOMContentLoaded', () => {
  VibeOS.init();
});
