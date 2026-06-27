<div align="center">

[中文](#cn) | [English](#en)

</div>

---

<h1 id="cn">VibeOS</h1>

> AI 驱动的 macOS 风格 Web 桌面操作系统 —— 让 AI 为你实时生成桌面应用。

---

## 什么是 VibeOS？

VibeOS 是一款运行在浏览器中的桌面操作系统，采用 macOS Aqua 风格 UI。与传统 OS 不同，它的应用**不是预先编写的**——而是由大语言模型（LLM）根据系统提示词**实时生成** HTML/CSS/JS 代码，并在 iframe 沙箱中安全运行。你只需要一个想法，AI 就能为你创造一个完整的桌面应用。

- **版本**: 0.2.0
- **构建**: Phase 1 — macOS Aqua Style

---

## 核心特性

- **AI 应用生成** — 通过 LLM 动态生成桌面应用，支持 SSE 流式输出，实时观看代码生成过程
- **macOS 风格 UI** — 毛玻璃菜单栏、Dock 放大镜效果、红黄绿交通灯窗口按钮、Spotlight 搜索
- **完整窗口管理** — 拖拽、缩放、最小化、最大化、窗口吸附、Cmd+Tab 应用切换
- **虚拟文件系统** — 基于 localStorage + IndexedDB，支持读写/删除/复制/移动/重命名，7 个默认目录
- **三层安全沙箱** — iframe 隔离 + postMessage 白名单（30 个 API）+ VibeOSAPI 受控接口
- **纯前端实现** — 零框架依赖，零构建步骤，浏览器直接打开即可运行
- **矢量图标系统** — 纯 SVG 图标库，零 emoji 依赖，零图片资源
- **明暗主题** — CSS 变量驱动的设计令牌系统，一键切换

---

## 内置应用

| 应用 | ID | 说明 |
|------|----|------|
| Files | `files` | 双栏文件管理器 |
| TextEdit | `notepad` | 文本编辑器，支持语法高亮 |
| VibeCode | `vibecode` | 三栏布局代码 IDE |
| Terminal | `terminal` | 终端模拟器，支持 Tab 补全 |
| Browser | `browser` | 内嵌浏览器，支持书签和历史 |
| AI Chat | `aichat` | macOS 风格 AI 对话 |
| Music | `music` | Web Audio API 音乐播放器 |
| Calculator | `calculator` | 标准计算器，支持键盘输入 |
| SysMon | `sysmon` | 系统监视仪表盘 |
| App Store | `app-store` | AI 预制应用市场（12+ 应用） |
| Settings | `settings` | 系统设置（壁纸/主题/LLM） |
| Snake | `snake` | 贪吃蛇游戏 |
| Tetris | `tetris` | 俄罗斯方块 |
| LLM API | `llm-api` | LLM 配置面板 |
| Viewer | `imageview` | 图片查看器（缩放/旋转） |

App Store 中还有 Clock、Paint、TaskMgr、Weather 等更多预制应用。

---

## 快速开始

### 前提条件

- 现代浏览器（Chrome / Edge / Safari / Firefox）
- LLM API Key（可选，无 Key 时使用 Mock 模式演示）

### 启动

```bash
# 方式一：直接打开
open index.html

# 方式二：本地服务器（推荐，避免跨域问题）
python3 -m http.server 8080
# 然后访问 http://localhost:8080
```

### 配置 LLM

打开 VibeOS 后，点击菜单栏 **VibeOS > LLM 设置**，或从 Dock 打开 **LLM API** 应用，填入：

- Provider: `openai`（兼容 OpenAI 格式的 API 均可）
- API Endpoint: 你的 API 地址
- API Key: 你的密钥
- Model: 模型名称

配置自动保存至 localStorage。

---

## 技术架构

```
┌─────────────────────────────────────┐
│              浏览器                   │
│  ┌───────────────────────────────┐  │
│  │         VibeOS 宿主           │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐  │  │
│  │  │桌面   │ │菜单栏 │ │Dock  │  │  │
│  │  └──────┘ └──────┘ └──────┘  │  │
│  │  ┌──────────────────────────┐ │  │
│  │  │      窗口管理器           │ │  │
│  │  │  ┌──────────────────┐   │ │  │
│  │  │  │ iframe 沙箱      │   │ │  │
│  │  │  │ ┌──────────────┐ │   │ │  │
│  │  │  │ │  AI 生成应用  │ │   │ │  │
│  │  │  │ └──────────────┘ │   │ │  │
│  │  │  └──────────────────┘   │ │  │
│  │  └──────────────────────────┘ │  │
│  │  ┌──────────┐ ┌────────────┐  │  │
│  │  │ 文件系统  │ │ 应用生成器  │  │  │
│  │  └──────────┘ └────────────┘  │  │
│  └───────────────────────────────┘  │
│              ↕ postMessage          │
│         ┌─────────────┐            │
│         │  LLM API    │            │
│         └─────────────┘            │
└─────────────────────────────────────┘
```

### 安全模型

```
用户操作 → 应用 iframe → postMessage → 白名单校验 → VibeOSAPI → 系统执行
                  ↑                                                      │
                  └──────────── 结果返回 ─────────────────────────────────┘
```

仅允许 30 个预定义 API 调用，涵盖文件系统、剪贴板、通知、窗口控制、存储、网络代理、LLM 调用等。

---

## 项目结构

```
vibeos/
├── index.html              # 入口文件
├── css/
│   ├── reset.css           # CSS 重置
│   ├── variables.css       # 设计令牌（颜色/字体/阴影等）
│   ├── desktop.css         # 桌面 & 右键菜单
│   ├── menubar.css         # macOS 风格菜单栏
│   ├── dock.css            # macOS 风格 Dock 栏
│   ├── window.css          # 窗口样式
│   ├── components.css      # 通用组件库
│   └── settingsPanel.css   # 设置面板
├── js/
│   ├── kernel.js           # 系统内核 & 启动引导
│   ├── config.js           # 用户配置管理
│   ├── windowManager.js    # 窗口生命周期
│   ├── appGenerator.js     # AI 应用生成器（SSE 流式）
│   ├── appRegistry.js      # 应用注册表（15 个预注册应用）
│   ├── installedApps.js    # 已安装应用管理
│   ├── filesystem.js       # 虚拟文件系统（VFS）
│   ├── sandbox.js          # iframe 沙箱 & VibeOSAPI
│   ├── notification.js     # Toast 通知系统
│   ├── desktop.js          # 桌面图标 & 右键菜单
│   ├── menubar.js          # 菜单栏 & Spotlight 搜索
│   ├── dock.js             # Dock 栏 & 运行指示器
│   ├── settingsPanel.js    # 原生设置面板
│   └── icons.js            # SVG 矢量图标库
├── prompts/                # AI 应用生成系统提示词（18 个 .md）
├── apps/                   # 用户安装的应用（运行时生成）
└── assets/                 # 静态资源（图标/壁纸）
```

---

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd + Space` | 打开 Spotlight 搜索 |
| `Cmd + Tab` | 应用切换器 |
| `Cmd + W` | 关闭当前窗口 |
| `Cmd + M` | 最小化当前窗口 |
| `Cmd + Shift + D` | 诊断面板（系统状态/LLM 统计） |
| `Escape` | 关闭 Spotlight |

---

## 开发

### 热重载

开发时每 3 秒自动检测 `index.html` 变更并刷新页面，无需手动刷新。

### 诊断面板

按 `Cmd + Shift + D` 打开实时诊断面板，可查看：
- 系统版本 & 运行时间
- LLM 调用统计（成功/失败/Token/延迟/吞吐量）
- 活跃窗口数 & 存储使用量
- LLM 连通性状态

### 技术栈

纯原生 HTML5 + CSS3 + JavaScript，无任何框架或构建工具依赖。所有数据通过 localStorage 和 IndexedDB 持久化。

---

## 隐私说明

**VibeOS 是一款纯前端 Web 应用，所有数据均存储在您的本地浏览器中。**

- **LLM API Key**：您在设置中填写的 API Key、Endpoint 和 Model 信息仅保存在浏览器 `localStorage` 中，不会发送至任何第三方服务器。
- **LLM 请求**：应用生成时，您的浏览器会**直接**向您配置的 LLM API Endpoint 发送请求，VibeOS 不充当代理，也不收集任何数据。
- **本地数据**：虚拟文件系统、应用安装记录、缓存均存储在本地 `localStorage` / `IndexedDB` 中，不会上传至任何服务器。
- **无遥测**：VibeOS 不会收集、上报或传输任何用户行为数据。
- **离线运行**：核心功能（文件管理、设置、游戏等）可在完全离线状态下运行，无需联网。

> ⚠️ **注意**：LLM 相关功能需要联网调用第三方 API，此过程受您所选 LLM 提供商的隐私政策约束，请自行审查。

---

<p align="right"><a href="#top">⬆ 回到顶部</a></p>

---

<h1 id="en">VibeOS</h1>

> An AI-powered macOS-style web desktop OS — where AI generates desktop apps for you in real time.

---

## What is VibeOS?

VibeOS is a desktop operating system that runs in your browser, featuring a macOS Aqua-style UI. Unlike traditional OSes, its apps are **not pre-written** — instead, a Large Language Model (LLM) **generates HTML/CSS/JS code in real time** based on system prompts, running securely inside iframe sandboxes. Just have an idea, and AI creates a complete desktop app for you.

- **Version**: 0.2.0
- **Build**: Phase 1 — macOS Aqua Style

---

## Core Features

- **AI App Generation** — Dynamically generate desktop apps via LLM with SSE streaming output, watching code generation in real time
- **macOS-style UI** — Frosted glass menubar, Dock magnification effect, traffic-light window buttons, Spotlight search
- **Full Window Management** — Drag, resize, minimize, maximize, snap-to-edge, Cmd+Tab app switching
- **Virtual File System** — Built on localStorage + IndexedDB, supporting read/write/delete/copy/move/rename with 7 default directories
- **Three-Layer Security Sandbox** — iframe isolation + postMessage whitelist (30 APIs) + VibeOSAPI controlled interface
- **Pure Frontend** — Zero framework dependencies, zero build steps, runs directly in the browser
- **Vector Icon System** — Pure SVG icon library, zero emoji dependencies, zero image assets
- **Light & Dark Themes** — CSS variable-driven design token system, one-click toggle

---

## Built-in Apps

| App | ID | Description |
|-----|----|-------------|
| Files | `files` | Dual-pane file manager |
| TextEdit | `notepad` | Text editor with syntax highlighting |
| VibeCode | `vibecode` | Three-panel code IDE |
| Terminal | `terminal` | Terminal emulator with Tab completion |
| Browser | `browser` | Embedded browser with bookmarks & history |
| AI Chat | `aichat` | macOS-style AI chat |
| Music | `music` | Web Audio API music player |
| Calculator | `calculator` | Standard calculator with keyboard support |
| SysMon | `sysmon` | System monitoring dashboard |
| App Store | `app-store` | AI-powered app marketplace (12+ apps) |
| Settings | `settings` | System settings (wallpaper/theme/LLM) |
| Snake | `snake` | Classic Snake game |
| Tetris | `tetris` | Classic Tetris game |
| LLM API | `llm-api` | LLM configuration panel |
| Viewer | `imageview` | Image viewer (zoom/rotate) |

The App Store also includes Clock, Paint, TaskMgr, Weather, and more pre-built apps.

---

## Quick Start

### Prerequisites

- Modern browser (Chrome / Edge / Safari / Firefox)
- LLM API Key (optional, Mock mode available without a key)

### Launch

```bash
# Option 1: Open directly
open index.html

# Option 2: Local server (recommended, avoids CORS issues)
python3 -m http.server 8080
# Then visit http://localhost:8080
```

### Configure LLM

After launching VibeOS, click **VibeOS > LLM Settings** in the menubar, or open the **LLM API** app from the Dock, and fill in:

- Provider: `openai` (any OpenAI-compatible API)
- API Endpoint: Your API URL
- API Key: Your secret key
- Model: Model name

Configuration is automatically saved to localStorage.

---

## Architecture

```
┌─────────────────────────────────────┐
│             Browser                  │
│  ┌───────────────────────────────┐  │
│  │         VibeOS Host           │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐  │  │
│  │  │Desktop│ │Menubar│ │Dock  │  │  │
│  │  └──────┘ └──────┘ └──────┘  │  │
│  │  ┌──────────────────────────┐ │  │
│  │  │    Window Manager         │ │  │
│  │  │  ┌──────────────────┐   │ │  │
│  │  │  │ iframe Sandbox    │   │ │  │
│  │  │  │ ┌──────────────┐ │   │ │  │
│  │  │  │ │ AI-Generated  │ │   │ │  │
│  │  │  │ │     App       │ │   │ │  │
│  │  │  │ └──────────────┘ │   │ │  │
│  │  │  └──────────────────┘   │ │  │
│  │  └──────────────────────────┘ │  │
│  │  ┌──────────┐ ┌────────────┐  │  │
│  │  │  VFS     │ │AppGenerator│  │  │
│  │  └──────────┘ └────────────┘  │  │
│  └───────────────────────────────┘  │
│              ↕ postMessage          │
│         ┌─────────────┐            │
│         │   LLM API   │            │
│         └─────────────┘            │
└─────────────────────────────────────┘
```

### Security Model

```
User Action → App iframe → postMessage → Whitelist Check → VibeOSAPI → System Execution
                  ↑                                                      │
                  └──────────────── Result Return ───────────────────────┘
```

Only 30 predefined API calls are allowed, covering filesystem, clipboard, notifications, window control, storage, network proxy, LLM calls, and more.

---

## Project Structure

```
vibeos/
├── index.html              # Entry point
├── css/
│   ├── reset.css           # CSS reset
│   ├── variables.css       # Design tokens (colors/fonts/shadows)
│   ├── desktop.css         # Desktop & context menu
│   ├── menubar.css         # macOS-style menubar
│   ├── dock.css            # macOS-style Dock
│   ├── window.css          # Window styles
│   ├── components.css      # Shared component library
│   └── settingsPanel.css   # Settings panel
├── js/
│   ├── kernel.js           # System kernel & bootstrap
│   ├── config.js           # User configuration
│   ├── windowManager.js    # Window lifecycle
│   ├── appGenerator.js     # AI app generator (SSE streaming)
│   ├── appRegistry.js      # App registry (15 pre-registered apps)
│   ├── installedApps.js    # Installed apps manager
│   ├── filesystem.js       # Virtual file system (VFS)
│   ├── sandbox.js          # iframe sandbox & VibeOSAPI
│   ├── notification.js     # Toast notification system
│   ├── desktop.js          # Desktop icons & context menu
│   ├── menubar.js          # Menubar & Spotlight search
│   ├── dock.js             # Dock & running indicators
│   ├── settingsPanel.js    # Native settings panel
│   └── icons.js            # SVG vector icon library
├── prompts/                # AI app generation system prompts (18 .md)
├── apps/                   # User-installed apps (generated at runtime)
└── assets/                 # Static assets (icons/wallpapers)
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd + Space` | Open Spotlight search |
| `Cmd + Tab` | App switcher |
| `Cmd + W` | Close current window |
| `Cmd + M` | Minimize current window |
| `Cmd + Shift + D` | Diagnostics panel (system status/LLM stats) |
| `Escape` | Close Spotlight |

---

## Development

### Hot Reload

During development, `index.html` changes are automatically detected every 3 seconds and the page refreshes — no manual reload needed.

### Diagnostics Panel

Press `Cmd + Shift + D` to open the real-time diagnostics panel, showing:
- System version & uptime
- LLM call statistics (success/failure/token/latency/throughput)
- Active window count & storage usage
- LLM connectivity status

### Tech Stack

Pure vanilla HTML5 + CSS3 + JavaScript, with zero framework or build tool dependencies. All data is persisted via localStorage and IndexedDB.

---

## Privacy

**VibeOS is a pure frontend web app. All data is stored locally in your browser.**

- **LLM API Key**: Your API Key, Endpoint, and Model settings are stored only in the browser's `localStorage` and are never sent to any third-party server.
- **LLM Requests**: During app generation, your browser sends requests **directly** to your configured LLM API Endpoint. VibeOS does not proxy, intercept, or collect any data.
- **Local Data**: The virtual filesystem, app installation records, and caches are all stored in local `localStorage` / `IndexedDB` and never uploaded to any server.
- **No Telemetry**: VibeOS does not collect, report, or transmit any user behavior data.
- **Offline Operation**: Core features (file management, settings, games, etc.) run fully offline with no internet required.

> ⚠️ **Note**: LLM-related features require internet access to call third-party APIs. This process is governed by your chosen LLM provider's privacy policy — please review it yourself.

---

<p align="right"><a href="#top">⬆ Back to Top</a></p>

---

## License

MIT
