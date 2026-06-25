# VibeCode - 桌面 IDE

生成 macOS 风格的代码编辑器应用，运行在 VibeOS 窗口的 iframe 内。

## ⚠️ 重要：布局边界
- **应用内容渲染在 `.window-content` 区域**，宿主窗口的标题栏（含红黄绿 traffic-light 关闭按钮）**不属于本应用**，不要在 HTML 内画自己的关闭/最小化按钮，也**不要把工具栏放在视觉上紧贴顶部的位置**——给 body/根容器留 0 padding 即可（iframe 会自然填满 .window-content，不会与 traffic-light 重叠），但工具栏本身要有清晰的内边距 8-10px 与下方 1px 边框分隔，让视觉层次清晰。
- 生成的根 `<body>` 必须 `margin:0; padding:0; height:100vh; overflow:hidden`，整体内部用 `display:flex; flex-direction:column` 撑满。

## 整体结构（三栏 + 上下分层）
```
┌─────────────────────────────────────────────────────┐
│ 工具栏（高 36px，左：📄 新建 / 📂 打开 / 💾 保存 / ▶ 运行 ; 右：文件名） │
├──────────┬──────────────────────────────────────────┤
│ 文件树    │ 编辑区                                    │
│ 150px     │ 等宽字体 13px、行号、语法高亮             │
│           │                                          │
├──────────┴──────────────────────────────────────────┤
│ 输出/控制台面板（高 120px，可点击折叠）                │
└─────────────────────────────────────────────────────┘
```

## 详细要求

### 工具栏（顶部 36px）
- 左对齐：4 个按钮（新建 / 打开 / 保存 / 运行），每个 28×28，hover 浅灰背景，矢量 SVG 图标（不要用 emoji）。
- 右对齐：当前文件名（灰色 12px），未保存时加 `●` 标识。
- 与下方编辑区有 1px `#e5e5ea` 边框分隔。

### 文件树（左 150px）
- 启动时调用 `await VibeOSAPI.fs.listDir('/Desktop')` 与 `/Documents`，列出 `.js .py .html .css .json .md .txt` 文件。
- 点击文件 → `await VibeOSAPI.fs.readFile(path)` 加载到编辑区。
- 选中项浅蓝高亮。

### 编辑区
- `<textarea>` 即可（不要引入 monaco / codemirror，纯 textarea + line-number 模拟即可）。
- 字体 `'SF Mono', ui-monospace, monospace`，13px，行高 1.5。
- 简单语法高亮可用 `<pre>` 镜像层（可选，省略也行）。
- Tab 键插入 2 空格而不是切焦点。

### 输出面板
- 默认显示，`▼/▶` 折叠按钮在右上角。
- 显示「Run」按钮的执行结果（用 `eval` 或 `new Function` 执行 JS；其他语言显示「仅支持 JavaScript 预览」）。

## 快捷键 / 行为
- `Cmd/Ctrl + S`：保存到当前路径（如未指定，弹出 `await VibeOSAPI.dialog.prompt('保存到', '/Desktop/untitled.js')`），调用 `VibeOSAPI.fs.writeFile(path, content)` 后 `VibeOSAPI.notification.show('已保存', path, 'check')`。
- `Cmd/Ctrl + R`：运行（仅 JS）。
- `Cmd/Ctrl + N`：新建空白。
- `Cmd/Ctrl + O`：打开文件（先 `listDir('/Desktop')` 再 `dialog.prompt` 让用户输入完整路径）。

## 风格
- 白底（`#fff`），文件树背景 `#f6f6f8`，控制台背景 `#1c1c1e` 字浅灰，强调色 `#007aff`。
- 边框 `#e5e5ea`，圆角 0（IDE 不需要圆角）。

## 输出
完整 HTML（含 `<!DOCTYPE>`），内联 CSS/JS，250-450 行，无外部依赖。只输出 `\`\`\`html` 代码块。
