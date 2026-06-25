/* ============================================
   VibeOS Icons - Vector SVG Library (macOS-style)
   ============================================ */
/* 全局图标库：所有图标统一为 SVG (无 emoji)。
   - 应用磁贴：渐变背景圆角矩形 + 白色符号 (大尺寸适用 desktop/dock)
   - 状态/通知/菜单图标：单色 stroke 矢量
   使用：Icons.app('files'), Icons.glyph('refresh'), Icons.html('files') */

const Icons = (() => {
  /* ---------- 应用磁贴 (App Tile) ---------- */
  const tile = (gradId, stops, inner, extra = '') => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" class="vibeos-icon vibeos-icon-app">
  <defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
    ${stops.map(([o,c])=>`<stop offset="${o}" stop-color="${c}"/>`).join('')}
  </linearGradient>${extra}</defs>
  <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#${gradId})" stroke="rgba(0,0,0,0.06)" stroke-width="0.5"/>
  ${inner}
</svg>`;

  const apps = {
    files: tile('g-files', [['0','#5ec8ff'],['1','#1a8cff']],
      `<path fill="#fff" d="M14 22h14l4 4h18a3 3 0 0 1 3 3v18a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3V25a3 3 0 0 1 3-3z" opacity=".95"/>
       <path fill="rgba(255,255,255,0.4)" d="M14 22h14l4 4h18a3 3 0 0 1 3 3v2H11v-7a3 3 0 0 1 3-3z"/>`),

    notepad: tile('g-note', [['0','#fff8a3'],['1','#ffd34a']],
      `<rect x="14" y="12" width="36" height="40" rx="3" fill="#fff" stroke="#e6b400" stroke-width="0.5"/>
       <path stroke="#aab" stroke-width="1.4" stroke-linecap="round" d="M19 22h26M19 28h26M19 34h26M19 40h18"/>`),

    vibecode: tile('g-vibe', [['0','#ffd86b'],['1','#ff7b1a']],
      `<path fill="#fff" d="M34 12 L20 36h10l-4 16 18-26H32z"/>`),

    terminal: tile('g-term', [['0','#3a3a3c'],['1','#1c1c1e']],
      `<rect x="10" y="14" width="44" height="36" rx="4" fill="#0c0c0e"/>
       <rect x="10" y="14" width="44" height="8" rx="4" fill="#2a2a2c"/>
       <circle cx="14.5" cy="18" r="1.4" fill="#ff5f57"/>
       <circle cx="19" cy="18" r="1.4" fill="#febc2e"/>
       <circle cx="23.5" cy="18" r="1.4" fill="#28c840"/>
       <path stroke="#28c840" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none" d="M16 32l5 4-5 4M28 40h12"/>`),

    browser: tile('g-brow', [['0','#56c8f3'],['1','#0a84ff']],
      `<circle cx="32" cy="32" r="20" fill="#fff"/>
       <circle cx="32" cy="32" r="20" fill="none" stroke="#0a84ff" stroke-width="1"/>
       <ellipse cx="32" cy="32" rx="8" ry="20" fill="none" stroke="#0a84ff" stroke-width="1"/>
       <path stroke="#0a84ff" stroke-width="1" fill="none" d="M12 32h40M14 22h36M14 42h36"/>`),

    calculator: tile('g-calc', [['0','#ff9f0a'],['1','#ff3b30']],
      `<rect x="13" y="11" width="38" height="42" rx="4" fill="#fff"/>
       <rect x="16" y="14" width="32" height="10" rx="2" fill="#1c1c1e"/>
       <text x="45" y="22" text-anchor="end" fill="#0a84ff" font-family="-apple-system,SF Mono,monospace" font-size="8" font-weight="600">12345</text>
       <g fill="#1c1c1e">
         <rect x="16" y="27" width="6" height="6" rx="1.2"/><rect x="24" y="27" width="6" height="6" rx="1.2"/>
         <rect x="32" y="27" width="6" height="6" rx="1.2"/><rect x="40" y="27" width="8" height="6" rx="1.2" fill="#ff9500"/>
         <rect x="16" y="35" width="6" height="6" rx="1.2"/><rect x="24" y="35" width="6" height="6" rx="1.2"/>
         <rect x="32" y="35" width="6" height="6" rx="1.2"/><rect x="40" y="35" width="8" height="6" rx="1.2" fill="#ff9500"/>
         <rect x="16" y="43" width="6" height="6" rx="1.2"/><rect x="24" y="43" width="6" height="6" rx="1.2"/>
         <rect x="32" y="43" width="6" height="6" rx="1.2"/><rect x="40" y="43" width="8" height="6" rx="1.2" fill="#ff9500"/>
       </g>`),

    music: tile('g-music', [['0','#ff5fa2'],['1','#ff2d55']],
      `<path fill="#fff" d="M40 14v22.6a8 8 0 1 1-3-6.2V20l-14 3v17.6a8 8 0 1 1-3-6.2V19a3 3 0 0 1 2.4-2.94L37 13.04A2.5 2.5 0 0 1 40 14z"/>`),

    sysmon: tile('g-sys', [['0','#5ac8fa'],['1','#0a84ff']],
      `<rect x="11" y="14" width="42" height="28" rx="3" fill="#0c0c0e"/>
       <rect x="11" y="14" width="42" height="28" rx="3" fill="none" stroke="rgba(255,255,255,0.4)"/>
       <polyline points="14,36 19,30 23,33 28,22 33,28 38,20 43,29 48,24 50,26" fill="none" stroke="#30d158" stroke-width="1.5" stroke-linejoin="round"/>
       <rect x="22" y="46" width="20" height="3" rx="1.5" fill="#fff"/>
       <rect x="26" y="50" width="12" height="3" rx="1.5" fill="#fff" opacity="0.6"/>`),

    imageview: tile('g-img', [['0','#a8e063'],['1','#56ab2f']],
      `<rect x="11" y="14" width="42" height="36" rx="3" fill="#fff"/>
       <circle cx="22" cy="24" r="3.5" fill="#ffcc00"/>
       <path d="M11 50 L24 34 L34 42 L42 32 L53 50 Z" fill="#34c759"/>`),

    snake: tile('g-snake', [['0','#5dd068'],['1','#1f8b34']],
      `<g fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
         <path d="M16 44 H32 V32 H22 V20 H44 V32 H40"/>
       </g>
       <circle cx="42" cy="34" r="2.5" fill="#fff"/>
       <circle cx="42" cy="34" r="1" fill="#1f8b34"/>`),

    tetris: tile('g-tetris', [['0','#ff9500'],['1','#ff2d55']],
      `<g stroke="#fff" stroke-width="0.6">
         <rect x="14" y="14" width="10" height="10" fill="#0a84ff"/>
         <rect x="24" y="14" width="10" height="10" fill="#0a84ff"/>
         <rect x="34" y="24" width="10" height="10" fill="#34c759"/>
         <rect x="44" y="24" width="10" height="10" fill="#34c759"/>
         <rect x="14" y="34" width="10" height="10" fill="#ffcc00"/>
         <rect x="24" y="34" width="10" height="10" fill="#ff2d55"/>
         <rect x="34" y="34" width="10" height="10" fill="#ff2d55"/>
         <rect x="44" y="34" width="10" height="10" fill="#5e5ce6"/>
         <rect x="14" y="44" width="10" height="10" fill="#5e5ce6"/>
         <rect x="24" y="44" width="10" height="10" fill="#ffcc00"/>
       </g>`),

    settings: tile('g-set', [['0','#a8a8ad'],['1','#48484a']],
      `<g transform="translate(32 32)">
         <g fill="#fff">${
           Array.from({length:8}, (_,i)=>{
             const a=i*45*Math.PI/180;
             return `<rect x="-3" y="-20" width="6" height="8" rx="1.5" transform="rotate(${i*45})" fill="#fff"/>`;
           }).join('')
         }</g>
         <circle r="9" fill="#fff"/>
         <circle r="4.5" fill="#48484a"/>
       </g>`),

    'llm-api': tile('g-key', [['0','#ffd34a'],['1','#ff9500']],
      `<g fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round">
         <circle cx="24" cy="24" r="9" stroke-width="4"/>
         <path d="M31 31 L48 48" stroke-width="4"/>
         <path d="M44 44 L48 40" stroke-width="3"/>
         <path d="M40 48 L44 44" stroke-width="3"/>
       </g>`),

    'app-store': tile('g-store', [['0','#56c8f3'],['1','#0a84ff']],
      `<g stroke="#fff" stroke-width="2.5" stroke-linecap="round" fill="none">
         <path d="M18 44 L28 26 M46 44 L36 26 M22 50 H42 M32 14 L24 30 M32 14 L40 30 M25 40 H39"/>
       </g>
       <circle cx="32" cy="14" r="3" fill="#fff"/>`),

    aichat: tile('g-aichat', [['0','#a78bfa'],['1','#6d28d9']],
      `<path fill="#fff" d="M16 18a5 5 0 0 1 5-5h22a5 5 0 0 1 5 5v15a5 5 0 0 1-5 5H30l-7 7v-7h-2a5 5 0 0 1-5-5z"/>
       <g fill="#6d28d9">
         <circle cx="26" cy="25" r="2.2"/>
         <circle cx="32" cy="25" r="2.2"/>
         <circle cx="38" cy="25" r="2.2"/>
       </g>`),

    trash: tile('g-trash', [['0','#a8a8ad'],['1','#6e6e73']],
      `<g stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
         <path d="M22 22h20l-2 26a3 3 0 0 1-3 3H27a3 3 0 0 1-3-3z"/>
         <path d="M18 22h28"/>
         <path d="M27 22V18a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4"/>
         <path d="M28 30v16 M32 30v16 M36 30v16"/>
       </g>`),

    computer: tile('g-comp', [['0','#c8c8cc'],['1','#6e6e73']],
      `<rect x="9" y="12" width="46" height="30" rx="3" fill="#1c1c1e"/>
       <rect x="12" y="15" width="40" height="24" rx="1.5" fill="#5ac8fa" opacity="0.85"/>
       <path d="M26 48h12l1 4H25z" fill="#1c1c1e"/>
       <rect x="20" y="50" width="24" height="3" rx="1.5" fill="#48484a"/>`),

    switcher: tile('g-sw', [['0','#c8c8cc'],['1','#6e6e73']],
      `<g fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
         <path d="M20 26a12 12 0 0 1 23-5"/>
         <path d="M44 38a12 12 0 0 1-23 5"/>
         <path d="M40 18v6h6 M24 46v-6h-6"/>
       </g>`),

    /* ----- 内置 / AI 生成应用占位 ----- */
    generic: tile('g-gen', [['0','#8e8e93'],['1','#48484a']],
      `<rect x="16" y="14" width="32" height="36" rx="3" fill="#fff"/>
       <g fill="none" stroke="#1c1c1e" stroke-width="1.6" stroke-linecap="round">
         <path d="M22 24h20M22 30h20M22 36h12"/>
       </g>`),

    /* ----- 自定义保存到桌面的 AI 应用统一图标 ----- */
    'custom-app': tile('g-custom', [['0','#a6e3ff'],['1','#5e5ce6']],
      `<defs>
         <linearGradient id="g-custom-spark" x1="0" y1="0" x2="1" y2="1">
           <stop offset="0" stop-color="#fff" stop-opacity="0.95"/>
           <stop offset="1" stop-color="#fff" stop-opacity="0.7"/>
         </linearGradient>
       </defs>
       <path fill="url(#g-custom-spark)" d="M32 12 L36 26 L50 30 L36 34 L32 48 L28 34 L14 30 L28 26 Z"/>
       <circle cx="46" cy="18" r="3.4" fill="#fff" opacity="0.9"/>
       <circle cx="18" cy="46" r="2.4" fill="#fff" opacity="0.75"/>`),
  };

  /* ---------- 单色 Glyph (菜单/通知/状态) ---------- */
  const G = (paths, vb='0 0 24 24', opts={}) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" class="vibeos-icon vibeos-icon-glyph" fill="none" stroke="currentColor" stroke-width="${opts.w||2}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

  const glyphs = {
    /* Apple logo (filled) — for menubar left */
    apple:    G('<path d="M16.4 12.6c0-2.4 2-3.5 2.1-3.6-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.6.9-.8 0-1.9-.9-3.1-.8C6.6 7.3 5 8.2 4 9.7c-1.7 3-.4 7.4 1.3 9.8.8 1.2 1.8 2.5 3 2.4 1.2-.05 1.7-.8 3.2-.8s1.9.8 3.2.78c1.3-.02 2.1-1.2 2.9-2.4.92-1.4 1.3-2.7 1.3-2.8 0-.04-2.5-1-2.5-3.9zM14 5.4c.6-.7 1-1.7 1-2.7-.9.04-1.9.6-2.5 1.3-.5.6-1 1.6-.9 2.6 1 .08 2-.5 2.4-1.2z" fill="currentColor" stroke="none"/>'),
    refresh:  G('<path d="M21 12a9 9 0 1 1-3-6.7M21 3v6h-6"/>'),
    search:   G('<circle cx="11" cy="11" r="7"/><path d="m20 20-4.35-4.35"/>'),
    bolt:     G('<path d="M13 2 L4 14h7l-2 8 9-12h-7z" fill="currentColor" stroke="none"/>'),
    note:     G('<path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h8M8 17h5"/>'),
    folder:   G('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
    gear:     G('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'),
    bell:     G('<path d="M18 16V11a6 6 0 1 0-12 0v5l-2 2h16zM10 21a2 2 0 0 0 4 0"/>'),
    trash:    G('<path d="M3 6h18M8 6V4h8v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/>'),
    wrench:   G('<path d="M14 7a4 4 0 0 1-5 5L3 18l3 3 6-6a4 4 0 0 1 5-5z"/>'),
    hourglass:G('<path d="M6 2h12M6 22h12M8 2v4l8 6-8 6v4M16 2v4l-8 6 8 6v4"/>'),
    cross:    G('<path d="M6 6l12 12M18 6L6 18"/>'),
    check:    G('<path d="M4 12l5 5L20 5"/>'),
    warn:     G('<path d="M12 3L2 21h20zM12 9v6M12 18h.01"/>'),
    info:     G('<circle cx="12" cy="12" r="10"/><path d="M12 11v5M12 8h.01"/>'),
    globe:    G('<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a14 14 0 0 1 0 20 14 14 0 0 1 0-20z"/>'),
    chart:    G('<path d="M3 21h18M7 17V9M12 17V5M17 17v-7"/>'),
    calendar: G('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>'),
    palette:  G('<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="7" r="1.3" fill="currentColor" stroke="none"/><circle cx="16" cy="10" r="1.3" fill="currentColor" stroke="none"/>'),
    bomb:     G('<circle cx="11" cy="13" r="7"/><path d="M16 7l3-3M18 4l2 2M14 5l2-2"/>'),
    weather:  G('<circle cx="9" cy="14" r="4"/><path d="M13 11a4 4 0 0 1 8 0 3 3 0 0 1 0 6H9"/>'),
    book:     G('<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>'),
    clock:    G('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    exchange: G('<path d="M7 7h13l-3-3M17 17H4l3 3"/>'),
    target:   G('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>'),
    abacus:   G('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M12 4v16M17 4v16M3 9h18M3 15h18"/>'),
    package:  G('<path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8"/>'),
    music:    G('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'),
    terminal: G('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M13 15h4"/>'),
    calculator: G('<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 10h2M12 10h2M16 10v0M8 14h2M12 14h2M16 14h0M8 18h2M12 18h2M16 18h0"/>'),
    snake:    G('<path d="M5 18h6v-6H6V6h12v6h-4"/>'),
    tetris:   G('<rect x="3" y="3" width="6" height="6"/><rect x="9" y="3" width="6" height="6"/><rect x="15" y="9" width="6" height="6"/><rect x="3" y="15" width="6" height="6"/>'),
    settings: G('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'),
    'llm-api': G('<circle cx="9" cy="9" r="4"/><path d="M12 12l8 8M16 16l3-3M14 18l3-3"/>'),
    image:    G('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>'),
    computer: G('<rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 21h8M12 18v3"/>'),
    files:    G('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
    vibecode: G('<path d="M13 2 L4 14h7l-2 8 9-12h-7z" fill="currentColor" stroke="none"/>'),
    browser:  G('<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a14 14 0 0 1 0 20 14 14 0 0 1 0-20z"/>'),
    notepad:  G('<path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h8M8 17h5"/>'),
    /* 保存 / 下载箭头入桌面 */
    save:     G('<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>'),
    star:     G('<path d="M12 2l3.1 6.5L22 9.6l-5 4.9 1.2 7.1L12 18.3 5.8 21.6 7 14.5 2 9.6l6.9-1.1z"/>'),
    /* 查看 prompt / 代码括号 */
    code:     G('<path d="M8 6l-6 6 6 6M16 6l6 6-6 6M14 4l-4 16"/>'),
    chat:     G('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
  };

  /* ---------- Public API ---------- */
  // 返回应用磁贴 SVG 字符串 (大尺寸，用于 desktop/dock/window)
  function app(id) {
    return apps[id] || apps.generic;
  }
  // 返回单色 glyph SVG 字符串 (菜单/通知/状态/小图标)
  function glyph(name) {
    return glyphs[name] || glyphs.info;
  }
  // 兼容旧 API：按类型自动选择
  function html(id) {
    return app(id);
  }
  // 转换旧 emoji 到 icon id (兼容性)
  const emojiMap = {
    '💾':'computer','📁':'files','📝':'notepad','⬛':'terminal','🌐':'browser',
    '⚡':'vibecode','🖩':'calculator','🎵':'music','📊':'sysmon','🖼️':'imageview',
    '🐍':'snake','🧱':'tetris','⚙️':'settings','🔑':'llm-api','📦':'app-store',
    '🗑️':'trash','🔄':'refresh','⏳':'hourglass','❌':'cross','🔔':'bell',
    '⚠️':'warn','🖥️':'computer','🎨':'palette','📅':'calendar','📋':'note',
    '💣':'bomb','🌤️':'weather','📖':'book','⏰':'clock','💱':'exchange',
    '🎯':'target','🧮':'abacus','🔧':'wrench','✅':'check',
  };
  function fromEmoji(e) {
    if (!e) return null;
    return emojiMap[e] || null;
  }
  // 若是 emoji，返回对应 SVG；否则原样返回（兼容旧字符串）
  function resolve(any) {
    if (typeof any !== 'string') return any;
    const id = emojiMap[any];
    if (id) return app(id);
    return any;
  }
  function resolveGlyph(any) {
    if (typeof any !== 'string') return any;
    const id = emojiMap[any];
    if (id) return glyph(id);
    return any;
  }

  return { app, glyph, html, fromEmoji, resolve, resolveGlyph, emojiMap };
})();
