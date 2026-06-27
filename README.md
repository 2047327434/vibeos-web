<div align="center">

<a id="top"></a>

[中文](#zh) · [English](#en) · [日本語](#ja) · [한국어](#ko) · [Français](#fr) · [Deutsch](#de) · [Español](#es) · [Русский](#ru)

</div>

---

<h1 id="zh">VibeOS</h1>

> AI 驱动的 macOS 风格 Web 桌面操作系统 —— 让 AI 为你实时生成桌面应用。

## 什么是 VibeOS？

VibeOS 是一款运行在浏览器中的桌面操作系统，采用 macOS Aqua 风格 UI。与传统 OS 不同，它的应用**不是预先编写的**——而是由大语言模型（LLM）根据系统提示词**实时生成** HTML/CSS/JS 代码，并在 iframe 沙箱中安全运行。你只需要一个想法，AI 就能为你创造一个完整的桌面应用。

- **版本**: 0.2.0
- **构建**: Phase 1 — macOS Aqua Style

## 核心特性

- **AI 应用生成** — 通过 LLM 动态生成桌面应用，支持 SSE 流式输出，实时观看代码生成过程
- **macOS 风格 UI** — 毛玻璃菜单栏、Dock 放大镜效果、红黄绿交通灯窗口按钮、Spotlight 搜索
- **完整窗口管理** — 拖拽、缩放、最小化、最大化、窗口吸附、Cmd+Tab 应用切换
- **虚拟文件系统** — 基于 localStorage + IndexedDB，支持读写/删除/复制/移动/重命名，7 个默认目录
- **三层安全沙箱** — iframe 隔离 + postMessage 白名单（30 个 API）+ VibeOSAPI 受控接口
- **纯前端实现** — 零框架依赖，零构建步骤，浏览器直接打开即可运行
- **矢量图标系统** — 纯 SVG 图标库，零 emoji 依赖，零图片资源
- **明暗主题** — CSS 变量驱动的设计令牌系统，一键切换

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

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd + Space` | 打开 Spotlight 搜索 |
| `Cmd + Tab` | 应用切换器 |
| `Cmd + W` | 关闭当前窗口 |
| `Cmd + M` | 最小化当前窗口 |
| `Cmd + Shift + D` | 诊断面板（系统状态/LLM 统计） |
| `Escape` | 关闭 Spotlight |

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

## 隐私说明

**VibeOS 是一款纯前端 Web 应用，所有数据均存储在您的本地浏览器中。**

- **LLM API Key**：您在设置中填写的 API Key、Endpoint 和 Model 信息仅保存在浏览器 `localStorage` 中，不会发送至任何第三方服务器。
- **LLM 请求**：应用生成时，您的浏览器会**直接**向您配置的 LLM API Endpoint 发送请求，VibeOS 不充当代理，也不收集任何数据。
- **本地数据**：虚拟文件系统、应用安装记录、缓存均存储在本地 `localStorage` / `IndexedDB` 中，不会上传至任何服务器。
- **无遥测**：VibeOS 不会收集、上报或传输任何用户行为数据。
- **离线运行**：核心功能（文件管理、设置、游戏等）可在完全离线状态下运行，无需联网。

> ⚠️ **注意**：LLM 相关功能需要联网调用第三方 API，此过程受您所选 LLM 提供商的隐私政策约束，请自行审查。

<p align="right"><a href="#top">⬆ 回到顶部</a></p>

---

<h1 id="en">VibeOS</h1>

> An AI-powered macOS-style web desktop OS — where AI generates desktop apps for you in real time.

## What is VibeOS?

VibeOS is a desktop operating system that runs in your browser, featuring a macOS Aqua-style UI. Unlike traditional OSes, its apps are **not pre-written** — instead, a Large Language Model (LLM) **generates HTML/CSS/JS code in real time** based on system prompts, running securely inside iframe sandboxes. Just have an idea, and AI creates a complete desktop app for you.

- **Version**: 0.2.0
- **Build**: Phase 1 — macOS Aqua Style

## Core Features

- **AI App Generation** — Dynamically generate desktop apps via LLM with SSE streaming, watching code generation live
- **macOS-style UI** — Frosted glass menubar, Dock magnification, traffic-light window buttons, Spotlight search
- **Full Window Management** — Drag, resize, minimize, maximize, snap-to-edge, Cmd+Tab app switching
- **Virtual File System** — Built on localStorage + IndexedDB with 7 default directories, full CRUD support
- **Three-Layer Security Sandbox** — iframe isolation + postMessage whitelist (30 APIs) + VibeOSAPI interface
- **Pure Frontend** — Zero framework dependencies, zero build steps, runs directly in the browser
- **Vector Icon System** — Pure SVG icon library, zero emoji dependencies, zero image assets
- **Light & Dark Themes** — CSS variable-driven design token system, one-click toggle

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

The App Store also includes Clock, Paint, TaskMgr, Weather and more pre-built apps.

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
│  │  │   VFS    │ │AppGenerator│  │  │
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

Only 30 predefined API calls are allowed, covering filesystem, clipboard, notifications, window control, storage, network proxy, LLM calls and more.

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

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd + Space` | Open Spotlight search |
| `Cmd + Tab` | App switcher |
| `Cmd + W` | Close current window |
| `Cmd + M` | Minimize current window |
| `Cmd + Shift + D` | Diagnostics panel (system status/LLM stats) |
| `Escape` | Close Spotlight |

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

## Privacy

**VibeOS is a pure frontend web app. All data is stored locally in your browser.**

- **LLM API Key**: Your API Key, Endpoint, and Model settings are stored only in the browser's `localStorage` and are never sent to any third-party server.
- **LLM Requests**: During app generation, your browser sends requests **directly** to your configured LLM API Endpoint. VibeOS does not proxy, intercept, or collect any data.
- **Local Data**: The virtual filesystem, app installation records, and caches are all stored in local `localStorage` / `IndexedDB` and never uploaded to any server.
- **No Telemetry**: VibeOS does not collect, report, or transmit any user behavior data.
- **Offline Operation**: Core features (file management, settings, games, etc.) run fully offline with no internet required.

> ⚠️ **Note**: LLM-related features require internet access to call third-party APIs. This process is governed by your chosen LLM provider's privacy policy — please review it yourself.

<p align="right"><a href="#top">⬆ Back to Top</a></p>

---

<h1 id="ja">VibeOS</h1>

> AI 搭載の macOS スタイル Web デスクトップ OS — AI がリアルタイムでアプリを生成します。

## VibeOS とは？

VibeOS はブラウザ上で動作するデスクトップ OS で、macOS Aqua スタイルの UI を採用しています。従来の OS とは異なり、アプリは**事前に作成されていません** — 代わりに大規模言語モデル（LLM）がシステムプロンプトに基づいて HTML/CSS/JS コードを**リアルタイム生成**し、iframe サンドボックス内で安全に実行されます。アイデアさえあれば、AI が完全なデスクトップアプリを作成します。

- **バージョン**: 0.2.0
- **ビルド**: Phase 1 — macOS Aqua Style

## 主な機能

- **AI アプリ生成** — LLM でデスクトップアプリを動的生成、SSE ストリーミング出力対応
- **macOS スタイル UI** — すりガラスメニューバー、Dock 拡大効果、信号機風ウィンドウボタン、Spotlight 検索
- **完全なウィンドウ管理** — ドラッグ、リサイズ、最小化、最大化、スナップ、Cmd+Tab 切替
- **仮想ファイルシステム** — localStorage + IndexedDB ベース、7 つのデフォルトディレクトリ、完全 CRUD 対応
- **三層セキュリティサンドボックス** — iframe 分離 + postMessage ホワイトリスト（30 API）+ VibeOSAPI
- **純粋なフロントエンド** — フレームワーク依存ゼロ、ビルドステップゼロ、ブラウザで直接実行
- **ベクターアイコンシステム** — 純粋な SVG アイコンライブラリ、絵文字依存ゼロ、画像リソースゼロ
- **ライト/ダークテーマ** — CSS 変数駆動のデザイントークンシステム、ワンクリック切替

## 内蔵アプリ

| アプリ | ID | 説明 |
|------|----|------|
| Files | `files` | デュアルペインファイルマネージャー |
| TextEdit | `notepad` | シンタックスハイライト付きテキストエディタ |
| VibeCode | `vibecode` | 3 ペインレイアウトのコード IDE |
| Terminal | `terminal` | Tab 補完対応ターミナルエミュレータ |
| Browser | `browser` | ブックマーク・履歴付き内蔵ブラウザ |
| AI Chat | `aichat` | macOS スタイル AI チャット |
| Music | `music` | Web Audio API 音楽プレーヤー |
| Calculator | `calculator` | キーボード対応標準電卓 |
| SysMon | `sysmon` | システム監視ダッシュボード |
| App Store | `app-store` | AI アプリマーケットプレイス（12+ アプリ） |
| Settings | `settings` | システム設定（壁紙/テーマ/LLM） |
| Snake | `snake` | クラシックスネークゲーム |
| Tetris | `tetris` | クラシックテトリス |
| LLM API | `llm-api` | LLM 設定パネル |
| Viewer | `imageview` | 画像ビューア（ズーム/回転） |

App Store には Clock、Paint、TaskMgr、Weather など更に多くのアプリがあります。

## クイックスタート

### 前提条件

- モダンブラウザ（Chrome / Edge / Safari / Firefox）
- LLM API キー（オプション、キーなしでも Mock モードあり）

### 起動

```bash
# 方法 1: 直接開く
open index.html

# 方法 2: ローカルサーバー（推奨、CORS 回避）
python3 -m http.server 8080
# http://localhost:8080 にアクセス
```

### LLM の設定

起動後、メニューバーの **VibeOS > LLM 設定** または Dock の **LLM API** から以下を入力：

- Provider: `openai`（OpenAI 互換 API 対応）
- API Endpoint: あなたの API アドレス
- API Key: あなたの秘密鍵
- Model: モデル名

設定は自動的に localStorage に保存されます。

## アーキテクチャ

```
┌─────────────────────────────────────┐
│             ブラウザ                  │
│  ┌───────────────────────────────┐  │
│  │         VibeOS ホスト         │  │
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
│  │  │   VFS    │ │AppGenerator│  │  │
│  │  └──────────┘ └────────────┘  │  │
│  └───────────────────────────────┘  │
│              ↕ postMessage          │
│         ┌─────────────┐            │
│         │   LLM API   │            │
│         └─────────────┘            │
└─────────────────────────────────────┘
```

### セキュリティモデル

```
ユーザー操作 → アプリ iframe → postMessage → ホワイトリスト検証 → VibeOSAPI → システム実行
                    ↑                                                      │
                    └──────────────── 結果返却 ─────────────────────────────┘
```

許可される API 呼び出しは 30 個のみで、ファイルシステム、クリップボード、通知、ウィンドウ制御、ストレージ、ネットワークプロキシ、LLM 呼び出しなどをカバーします。

## キーボードショートカット

| ショートカット | 機能 |
|--------|------|
| `Cmd + Space` | Spotlight 検索を開く |
| `Cmd + Tab` | アプリ切替 |
| `Cmd + W` | 現在のウィンドウを閉じる |
| `Cmd + M` | 現在のウィンドウを最小化 |
| `Cmd + Shift + D` | 診断パネル |
| `Escape` | Spotlight を閉じる |

## プライバシー

**VibeOS は純粋なフロントエンド Web アプリです。すべてのデータはお使いのブラウザにローカル保存されます。**

- **LLM API キー**：API キー、エンドポイント、モデル設定はブラウザの `localStorage` にのみ保存されます。
- **LLM リクエスト**：アプリ生成中、ブラウザは設定された LLM API エンドポイントに**直接**リクエストを送信します。
- **ローカルデータ**：仮想ファイルシステム、アプリのインストール記録、キャッシュはすべてローカルの `localStorage` / `IndexedDB` に保存されます。
- **テレメトリなし**：VibeOS はユーザー行動データを収集、報告、送信しません。
- **オフライン動作**：コア機能（ファイル管理、設定、ゲームなど）は完全にオフラインで動作します。

> ⚠️ **注意**：LLM 関連機能はサードパーティ API を呼び出すためインターネット接続が必要です。選択した LLM プロバイダーのプライバシーポリシーが適用されます。

<p align="right"><a href="#top">⬆ トップへ戻る</a></p>

---

<h1 id="ko">VibeOS</h1>

> AI 기반 macOS 스타일 웹 데스크톱 OS — AI가 실시간으로 앱을 생성합니다.

## VibeOS란?

VibeOS는 브라우저에서 실행되는 데스크톱 운영체제로, macOS Aqua 스타일 UI를 갖추고 있습니다. 기존 OS와 달리 앱은 **미리 작성되지 않습니다** — 대신 대규모 언어 모델(LLM)이 시스템 프롬프트에 따라 HTML/CSS/JS 코드를 **실시간 생성**하여 iframe 샌드박스 내에서 안전하게 실행됩니다. 아이디어만 있으면 AI가 완전한 데스크톱 앱을 만들어 줍니다.

- **버전**: 0.2.0
- **빌드**: Phase 1 — macOS Aqua Style

## 핵심 기능

- **AI 앱 생성** — LLM으로 데스크톱 앱 동적 생성, SSE 스트리밍 출력 지원
- **macOS 스타일 UI** — 반투명 메뉴바, Dock 확대 효과, 신호등 창 버튼, Spotlight 검색
- **완전한 창 관리** — 드래그, 크기 조절, 최소화, 최대화, 스냅, Cmd+Tab 전환
- **가상 파일 시스템** — localStorage + IndexedDB 기반, 7개 기본 디렉터리, 전체 CRUD 지원
- **3중 보안 샌드박스** — iframe 격리 + postMessage 화이트리스트(30 API) + VibeOSAPI
- **순수 프론트엔드** — 프레임워크 의존성 제로, 빌드 단계 제로, 브라우저에서 직접 실행
- **벡터 아이콘 시스템** — 순수 SVG 아이콘 라이브러리, 이모지 의존성 제로, 이미지 리소스 제로
- **라이트/다크 테마** — CSS 변수 기반 디자인 토큰 시스템, 원클릭 전환

## 내장 앱

| 앱 | ID | 설명 |
|------|----|------|
| Files | `files` | 듀얼 패널 파일 관리자 |
| TextEdit | `notepad` | 구문 강조 지원 텍스트 편집기 |
| VibeCode | `vibecode` | 3패널 레이아웃 코드 IDE |
| Terminal | `terminal` | Tab 자동완성 지원 터미널 에뮬레이터 |
| Browser | `browser` | 북마크 및 방문 기록 지원 내장 브라우저 |
| AI Chat | `aichat` | macOS 스타일 AI 채팅 |
| Music | `music` | Web Audio API 음악 플레이어 |
| Calculator | `calculator` | 키보드 지원 표준 계산기 |
| SysMon | `sysmon` | 시스템 모니터링 대시보드 |
| App Store | `app-store` | AI 앱 마켓플레이스 (12+ 앱) |
| Settings | `settings` | 시스템 설정 (배경화면/테마/LLM) |
| Snake | `snake` | 클래식 스네이크 게임 |
| Tetris | `tetris` | 클래식 테트리스 |
| LLM API | `llm-api` | LLM 구성 패널 |
| Viewer | `imageview` | 이미지 뷰어 (확대/회전) |

App Store에는 Clock, Paint, TaskMgr, Weather 등 더 많은 앱이 포함되어 있습니다.

## 빠른 시작

### 필요 조건

- 최신 브라우저 (Chrome / Edge / Safari / Firefox)
- LLM API 키 (선택 사항, 키 없이 Mock 모드 사용 가능)

### 실행

```bash
# 방법 1: 직접 열기
open index.html

# 방법 2: 로컬 서버 (권장, CORS 문제 방지)
python3 -m http.server 8080
# http://localhost:8080 접속
```

### LLM 구성

VibeOS 실행 후 메뉴바의 **VibeOS > LLM 설정** 또는 Dock의 **LLM API** 앱에서 입력:

- Provider: `openai` (OpenAI 호환 API 지원)
- API Endpoint: API 주소
- API Key: 비밀 키
- Model: 모델 이름

설정은 자동으로 localStorage에 저장됩니다.

## 아키텍처

```
┌─────────────────────────────────────┐
│              브라우저                 │
│  ┌───────────────────────────────┐  │
│  │         VibeOS 호스트         │  │
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
│  │  │   VFS    │ │AppGenerator│  │  │
│  │  └──────────┘ └────────────┘  │  │
│  └───────────────────────────────┘  │
│              ↕ postMessage          │
│         ┌─────────────┐            │
│         │   LLM API   │            │
│         └─────────────┘            │
└─────────────────────────────────────┘
```

### 보안 모델

```
사용자 작업 → 앱 iframe → postMessage → 화이트리스트 검증 → VibeOSAPI → 시스템 실행
                   ↑                                                      │
                   └──────────────── 결과 반환 ───────────────────────────┘
```

30개의 사전 정의된 API 호출만 허용되며, 파일 시스템, 클립보드, 알림, 창 제어, 저장소, 네트워크 프록시, LLM 호출 등을 포함합니다.

## 키보드 단축키

| 단축키 | 기능 |
|--------|------|
| `Cmd + Space` | Spotlight 검색 열기 |
| `Cmd + Tab` | 앱 전환 |
| `Cmd + W` | 현재 창 닫기 |
| `Cmd + M` | 현재 창 최소화 |
| `Cmd + Shift + D` | 진단 패널 |
| `Escape` | Spotlight 닫기 |

## 개인정보 보호

**VibeOS는 순수 프론트엔드 웹 앱입니다. 모든 데이터는 브라우저에 로컬로 저장됩니다.**

- **LLM API 키**: API 키, 엔드포인트, 모델 설정은 브라우저의 `localStorage`에만 저장됩니다.
- **LLM 요청**: 앱 생성 중 브라우저는 구성된 LLM API 엔드포인트로 **직접** 요청을 보냅니다.
- **로컬 데이터**: 가상 파일 시스템, 앱 설치 기록, 캐시는 모두 로컬 `localStorage` / `IndexedDB`에 저장됩니다.
- **원격 측정 없음**: VibeOS는 사용자 행동 데이터를 수집, 보고, 전송하지 않습니다.
- **오프라인 작동**: 핵심 기능(파일 관리, 설정, 게임 등)은 완전히 오프라인으로 작동합니다.

> ⚠️ **참고**: LLM 관련 기능은 타사 API 호출을 위해 인터넷 연결이 필요합니다. 선택한 LLM 제공업체의 개인정보 보호정책이 적용됩니다.

<p align="right"><a href="#top">⬆ 맨 위로</a></p>

---

<h1 id="fr">VibeOS</h1>

> Un OS de bureau web style macOS propulsé par l'IA — où l'IA génère des applications en temps réel.

## Qu'est-ce que VibeOS ?

VibeOS est un système d'exploitation de bureau qui s'exécute dans votre navigateur, avec une interface de style macOS Aqua. Contrairement aux OS traditionnels, ses applications ne sont **pas pré-écrites** — un modèle de langage (LLM) **génère du code HTML/CSS/JS en temps réel** à partir de prompts système, s'exécutant en toute sécurité dans des sandbox iframe. Ayez juste une idée, et l'IA crée une application complète pour vous.

- **Version** : 0.2.0
- **Build** : Phase 1 — macOS Aqua Style

## Fonctionnalités principales

- **Génération d'apps par IA** — Générez dynamiquement des apps via LLM avec streaming SSE
- **UI style macOS** — Barre de menu en verre dépoli, effet de grossissement du Dock, boutons de fenêtre tricolores, recherche Spotlight
- **Gestion complète des fenêtres** — Glisser, redimensionner, minimiser, maximiser, ancrage, Cmd+Tab
- **Système de fichiers virtuel** — Basé sur localStorage + IndexedDB, 7 répertoires par défaut, CRUD complet
- **Sandbox de sécurité à trois niveaux** — Isolation iframe + liste blanche postMessage (30 API) + VibeOSAPI
- **Frontend pur** — Zéro dépendance framework, zéro étape de build, exécution directe dans le navigateur
- **Icônes vectorielles** — Bibliothèque d'icônes SVG pure, zéro dépendance emoji, zéro ressource image
- **Thèmes clair et sombre** — Système de design tokens piloté par variables CSS, basculement en un clic

## Applications intégrées

| Application | ID | Description |
|------|----|------|
| Files | `files` | Gestionnaire de fichiers à deux volets |
| TextEdit | `notepad` | Éditeur de texte avec coloration syntaxique |
| VibeCode | `vibecode` | IDE de code à trois panneaux |
| Terminal | `terminal` | Émulateur de terminal avec complétion Tab |
| Browser | `browser` | Navigateur intégré avec favoris et historique |
| AI Chat | `aichat` | Chat IA style macOS |
| Music | `music` | Lecteur de musique Web Audio API |
| Calculator | `calculator` | Calculatrice standard avec support clavier |
| SysMon | `sysmon` | Tableau de bord de surveillance système |
| App Store | `app-store` | Marketplace d'applications IA (12+ apps) |
| Settings | `settings` | Paramètres système (fond d'écran/thème/LLM) |
| Snake | `snake` | Jeu Snake classique |
| Tetris | `tetris` | Jeu Tetris classique |
| LLM API | `llm-api` | Panneau de configuration LLM |
| Viewer | `imageview` | Visionneuse d'images (zoom/rotation) |

L'App Store inclut également Clock, Paint, TaskMgr, Weather et plus encore.

## Démarrage rapide

### Prérequis

- Navigateur moderne (Chrome / Edge / Safari / Firefox)
- Clé API LLM (optionnelle, mode Mock disponible sans clé)

### Lancement

```bash
# Option 1 : Ouvrir directement
open index.html

# Option 2 : Serveur local (recommandé, évite les problèmes CORS)
python3 -m http.server 8080
# Puis visitez http://localhost:8080
```

### Configurer le LLM

Après le lancement, cliquez sur **VibeOS > Paramètres LLM** dans la barre de menu, ou ouvrez l'application **LLM API** depuis le Dock :

- Provider : `openai` (toute API compatible OpenAI)
- API Endpoint : Votre URL API
- API Key : Votre clé secrète
- Model : Nom du modèle

La configuration est automatiquement sauvegardée dans localStorage.

## Architecture

```
┌─────────────────────────────────────┐
│            Navigateur                │
│  ┌───────────────────────────────┐  │
│  │         Hôte VibeOS           │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐  │  │
│  │  │Bureau│ │Menu  │ │Dock  │  │  │
│  │  └──────┘ └──────┘ └──────┘  │  │
│  │  ┌──────────────────────────┐ │  │
│  │  │  Gestionnaire de fenêtres│ │  │
│  │  │  ┌──────────────────┐   │ │  │
│  │  │  │ Sandbox iframe    │   │ │  │
│  │  │  │ ┌──────────────┐ │   │ │  │
│  │  │  │ │ App générée   │ │   │ │  │
│  │  │  │ │    par IA     │ │   │ │  │
│  │  │  │ └──────────────┘ │   │ │  │
│  │  │  └──────────────────┘   │ │  │
│  │  └──────────────────────────┘ │  │
│  │  ┌──────────┐ ┌────────────┐  │  │
│  │  │   VFS    │ │AppGenerator│  │  │
│  │  └──────────┘ └────────────┘  │  │
│  └───────────────────────────────┘  │
│              ↕ postMessage          │
│         ┌─────────────┐            │
│         │   LLM API   │            │
│         └─────────────┘            │
└─────────────────────────────────────┘
```

### Modèle de sécurité

```
Action utilisateur → App iframe → postMessage → Vérification liste blanche → VibeOSAPI → Exécution système
                         ↑                                                           │
                         └────────────────── Retour résultat ────────────────────────┘
```

Seuls 30 appels API prédéfinis sont autorisés, couvrant le système de fichiers, le presse-papiers, les notifications, le contrôle des fenêtres, le stockage, le proxy réseau et les appels LLM.

## Raccourcis clavier

| Raccourci | Action |
|--------|------|
| `Cmd + Space` | Ouvrir la recherche Spotlight |
| `Cmd + Tab` | Changement d'application |
| `Cmd + W` | Fermer la fenêtre actuelle |
| `Cmd + M` | Minimiser la fenêtre actuelle |
| `Cmd + Shift + D` | Panneau de diagnostic |
| `Escape` | Fermer Spotlight |

## Confidentialité

**VibeOS est une application web frontend pure. Toutes les données sont stockées localement dans votre navigateur.**

- **Clé API LLM** : Votre clé API, endpoint et modèle sont stockés uniquement dans le `localStorage` du navigateur.
- **Requêtes LLM** : Lors de la génération d'applications, votre navigateur envoie des requêtes **directement** à votre endpoint API LLM configuré.
- **Données locales** : Le système de fichiers virtuel, les enregistrements d'installation et les caches sont stockés dans `localStorage` / `IndexedDB`.
- **Aucune télémétrie** : VibeOS ne collecte, ne rapporte ni ne transmet aucune donnée de comportement utilisateur.
- **Fonctionnement hors ligne** : Les fonctionnalités principales (gestion de fichiers, paramètres, jeux) fonctionnent entièrement hors ligne.

> ⚠️ **Note** : Les fonctionnalités LLM nécessitent une connexion Internet pour appeler des API tierces. La politique de confidentialité de votre fournisseur LLM s'applique.

<p align="right"><a href="#top">⬆ Retour en haut</a></p>

---

<h1 id="de">VibeOS</h1>

> Ein KI-gestütztes macOS-ähnliches Web-Desktop-Betriebssystem — wo KI Apps in Echtzeit generiert.

## Was ist VibeOS?

VibeOS ist ein Desktop-Betriebssystem, das im Browser läuft und eine macOS Aqua-ähnliche Benutzeroberfläche bietet. Anders als traditionelle Betriebssysteme sind seine Apps **nicht vorab geschrieben** — stattdessen **generiert** ein Large Language Model (LLM) HTML/CSS/JS-Code **in Echtzeit** basierend auf System-Prompts und führt diesen sicher in iframe-Sandboxen aus. Sie brauchen nur eine Idee, und die KI erstellt eine vollständige Desktop-App für Sie.

- **Version**: 0.2.0
- **Build**: Phase 1 — macOS Aqua Style

## Kernfunktionen

- **KI-App-Generierung** — Dynamische App-Erstellung via LLM mit SSE-Streaming
- **macOS-ähnliche UI** — Milchglas-Menüleiste, Dock-Vergrößerungseffekt, Ampelfenster-Schaltflächen, Spotlight-Suche
- **Vollständige Fensterverwaltung** — Ziehen, Größenänderung, Minimieren, Maximieren, Andocken, Cmd+Tab
- **Virtuelles Dateisystem** — Basierend auf localStorage + IndexedDB, 7 Standardverzeichnisse, volles CRUD
- **Dreistufige Sicherheits-Sandbox** — iframe-Isolation + postMessage-Whitelist (30 APIs) + VibeOSAPI
- **Reines Frontend** — Keine Framework-Abhängigkeiten, keine Build-Schritte, direkt im Browser ausführbar
- **Vektor-Iconsystem** — Reine SVG-Icon-Bibliothek, keine Emoji-Abhängigkeiten, keine Bildressourcen
- **Helle & dunkle Themes** — CSS-Variablen-gesteuertes Design-Token-System, Ein-Klick-Umschaltung

## Integrierte Apps

| App | ID | Beschreibung |
|------|----|------|
| Files | `files` | Zwei-Fenster-Dateimanager |
| TextEdit | `notepad` | Texteditor mit Syntaxhervorhebung |
| VibeCode | `vibecode` | Drei-Fenster-Code-IDE |
| Terminal | `terminal` | Terminal-Emulator mit Tab-Vervollständigung |
| Browser | `browser` | Eingebetteter Browser mit Lesezeichen & Verlauf |
| AI Chat | `aichat` | macOS-ähnlicher KI-Chat |
| Music | `music` | Web Audio API Musikplayer |
| Calculator | `calculator` | Standard-Taschenrechner mit Tastaturunterstützung |
| SysMon | `sysmon` | Systemüberwachungs-Dashboard |
| App Store | `app-store` | KI-App-Marktplatz (12+ Apps) |
| Settings | `settings` | Systemeinstellungen (Hintergrund/Theme/LLM) |
| Snake | `snake` | Klassisches Snake-Spiel |
| Tetris | `tetris` | Klassisches Tetris-Spiel |
| LLM API | `llm-api` | LLM-Konfigurationspanel |
| Viewer | `imageview` | Bildbetrachter (Zoom/Drehung) |

Der App Store enthält auch Clock, Paint, TaskMgr, Weather und weitere Apps.

## Schnellstart

### Voraussetzungen

- Moderner Browser (Chrome / Edge / Safari / Firefox)
- LLM API-Schlüssel (optional, Mock-Modus ohne Schlüssel verfügbar)

### Start

```bash
# Option 1: Direkt öffnen
open index.html

# Option 2: Lokaler Server (empfohlen, vermeidet CORS-Probleme)
python3 -m http.server 8080
# Dann http://localhost:8080 besuchen
```

### LLM konfigurieren

Nach dem Start auf **VibeOS > LLM-Einstellungen** in der Menüleiste klicken oder die **LLM API**-App vom Dock öffnen:

- Provider: `openai` (jede OpenAI-kompatible API)
- API Endpoint: Ihre API-URL
- API Key: Ihr geheimer Schlüssel
- Model: Modellname

Die Konfiguration wird automatisch in localStorage gespeichert.

## Architektur

```
┌─────────────────────────────────────┐
│             Browser                  │
│  ┌───────────────────────────────┐  │
│  │         VibeOS Host           │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐  │  │
│  │  │Desktop│ │Menü   │ │Dock  │  │  │
│  │  └──────┘ └──────┘ └──────┘  │  │
│  │  ┌──────────────────────────┐ │  │
│  │  │  Fenstermanager           │ │  │
│  │  │  ┌──────────────────┐   │ │  │
│  │  │  │ iframe-Sandbox    │   │ │  │
│  │  │  │ ┌──────────────┐ │   │ │  │
│  │  │  │ │ KI-generierte │ │   │ │  │
│  │  │  │ │     App       │ │   │ │  │
│  │  │  │ └──────────────┘ │   │ │  │
│  │  │  └──────────────────┘   │ │  │
│  │  └──────────────────────────┘ │  │
│  │  ┌──────────┐ ┌────────────┐  │  │
│  │  │   VFS    │ │AppGenerator│  │  │
│  │  └──────────┘ └────────────┘  │  │
│  └───────────────────────────────┘  │
│              ↕ postMessage          │
│         ┌─────────────┐            │
│         │   LLM API   │            │
│         └─────────────┘            │
└─────────────────────────────────────┘
```

### Sicherheitsmodell

```
Benutzeraktion → App-iframe → postMessage → Whitelist-Prüfung → VibeOSAPI → Systemausführung
                      ↑                                                         │
                      └───────────────── Ergebnisrückgabe ──────────────────────┘
```

Nur 30 vordefinierte API-Aufrufe sind erlaubt, die Dateisystem, Zwischenablage, Benachrichtigungen, Fenstersteuerung, Speicher, Netzwerkproxy und LLM-Aufrufe abdecken.

## Tastenkürzel

| Kürzel | Aktion |
|--------|------|
| `Cmd + Space` | Spotlight-Suche öffnen |
| `Cmd + Tab` | App-Wechsler |
| `Cmd + W` | Aktuelles Fenster schließen |
| `Cmd + M` | Aktuelles Fenster minimieren |
| `Cmd + Shift + D` | Diagnosepanel |
| `Escape` | Spotlight schließen |

## Datenschutz

**VibeOS ist eine reine Frontend-Webanwendung. Alle Daten werden lokal in Ihrem Browser gespeichert.**

- **LLM API-Schlüssel**: Ihr API-Schlüssel, Endpunkt und Modell werden nur im `localStorage` des Browsers gespeichert.
- **LLM-Anfragen**: Bei der App-Generierung sendet Ihr Browser Anfragen **direkt** an Ihren konfigurierten LLM-API-Endpunkt.
- **Lokale Daten**: Das virtuelle Dateisystem, App-Installationsdatensätze und Caches werden alle in lokalem `localStorage` / `IndexedDB` gespeichert.
- **Keine Telemetrie**: VibeOS sammelt, meldet oder überträgt keine Benutzerverhaltensdaten.
- **Offline-Betrieb**: Kernfunktionen (Dateiverwaltung, Einstellungen, Spiele) funktionieren vollständig offline.

> ⚠️ **Hinweis**: LLM-bezogene Funktionen benötigen eine Internetverbindung für Drittanbieter-API-Aufrufe. Die Datenschutzrichtlinie Ihres gewählten LLM-Anbieters gilt.

<p align="right"><a href="#top">⬆ Nach oben</a></p>

---

<h1 id="es">VibeOS</h1>

> Un sistema operativo de escritorio web estilo macOS impulsado por IA — donde la IA genera aplicaciones en tiempo real.

## ¿Qué es VibeOS?

VibeOS es un sistema operativo de escritorio que se ejecuta en tu navegador, con una interfaz estilo macOS Aqua. A diferencia de los SO tradicionales, sus aplicaciones **no están preescritas** — en su lugar, un Modelo de Lenguaje (LLM) **genera código HTML/CSS/JS en tiempo real** basándose en prompts del sistema, ejecutándose de forma segura en sandboxes iframe. Solo necesitas una idea, y la IA crea una aplicación de escritorio completa para ti.

- **Versión**: 0.2.0
- **Build**: Phase 1 — macOS Aqua Style

## Características principales

- **Generación de apps por IA** — Genera apps dinámicamente vía LLM con streaming SSE
- **UI estilo macOS** — Barra de menú de vidrio esmerilado, efecto de ampliación del Dock, botones de semáforo, búsqueda Spotlight
- **Gestión completa de ventanas** — Arrastrar, redimensionar, minimizar, maximizar, anclar, Cmd+Tab
- **Sistema de archivos virtual** — Basado en localStorage + IndexedDB, 7 directorios por defecto, CRUD completo
- **Sandbox de seguridad de tres capas** — Aislamiento iframe + lista blanca postMessage (30 API) + VibeOSAPI
- **Frontend puro** — Cero dependencias de framework, cero pasos de compilación, se ejecuta directamente en el navegador
- **Sistema de iconos vectoriales** — Biblioteca de iconos SVG pura, sin dependencias de emoji, sin recursos de imagen
- **Temas claro y oscuro** — Sistema de tokens de diseño basado en variables CSS, cambio con un clic

## Aplicaciones integradas

| Aplicación | ID | Descripción |
|------|----|------|
| Files | `files` | Gestor de archivos de doble panel |
| TextEdit | `notepad` | Editor de texto con resaltado de sintaxis |
| VibeCode | `vibecode` | IDE de código de tres paneles |
| Terminal | `terminal` | Emulador de terminal con autocompletado Tab |
| Browser | `browser` | Navegador integrado con marcadores e historial |
| AI Chat | `aichat` | Chat IA estilo macOS |
| Music | `music` | Reproductor de música Web Audio API |
| Calculator | `calculator` | Calculadora estándar con soporte de teclado |
| SysMon | `sysmon` | Panel de monitoreo del sistema |
| App Store | `app-store` | Mercado de apps impulsado por IA (12+ apps) |
| Settings | `settings` | Configuración del sistema (fondo/tema/LLM) |
| Snake | `snake` | Juego clásico Snake |
| Tetris | `tetris` | Juego clásico Tetris |
| LLM API | `llm-api` | Panel de configuración LLM |
| Viewer | `imageview` | Visor de imágenes (zoom/rotación) |

La App Store también incluye Clock, Paint, TaskMgr, Weather y más.

## Inicio rápido

### Requisitos previos

- Navegador moderno (Chrome / Edge / Safari / Firefox)
- Clave API LLM (opcional, modo Mock disponible sin clave)

### Lanzamiento

```bash
# Opción 1: Abrir directamente
open index.html

# Opción 2: Servidor local (recomendado, evita problemas CORS)
python3 -m http.server 8080
# Luego visita http://localhost:8080
```

### Configurar LLM

Tras lanzar VibeOS, haz clic en **VibeOS > Configuración LLM** en la barra de menú, o abre la app **LLM API** desde el Dock:

- Provider: `openai` (cualquier API compatible con OpenAI)
- API Endpoint: Tu URL de API
- API Key: Tu clave secreta
- Model: Nombre del modelo

La configuración se guarda automáticamente en localStorage.

## Arquitectura

```
┌─────────────────────────────────────┐
│            Navegador                 │
│  ┌───────────────────────────────┐  │
│  │        Host VibeOS            │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐  │  │
│  │  │Escrit│ │ Menú │ │Dock  │  │  │
│  │  └──────┘ └──────┘ └──────┘  │  │
│  │  ┌──────────────────────────┐ │  │
│  │  │  Gestor de ventanas      │ │  │
│  │  │  ┌──────────────────┐   │ │  │
│  │  │  │ Sandbox iframe    │   │ │  │
│  │  │  │ ┌──────────────┐ │   │ │  │
│  │  │  │ │ App generada  │ │   │ │  │
│  │  │  │ │    por IA     │ │   │ │  │
│  │  │  │ └──────────────┘ │   │ │  │
│  │  │  └──────────────────┘   │ │  │
│  │  └──────────────────────────┘ │  │
│  │  ┌──────────┐ ┌────────────┐  │  │
│  │  │   VFS    │ │AppGenerator│  │  │
│  │  └──────────┘ └────────────┘  │  │
│  └───────────────────────────────┘  │
│              ↕ postMessage          │
│         ┌─────────────┐            │
│         │   LLM API   │            │
│         └─────────────┘            │
└─────────────────────────────────────┘
```

### Modelo de seguridad

```
Acción de usuario → App iframe → postMessage → Verificación whitelist → VibeOSAPI → Ejecución del sistema
                        ↑                                                          │
                        └────────────────── Retorno de resultado ──────────────────┘
```

Solo se permiten 30 llamadas API predefinidas, que cubren sistema de archivos, portapapeles, notificaciones, control de ventanas, almacenamiento, proxy de red y llamadas LLM.

## Atajos de teclado

| Atajo | Acción |
|--------|------|
| `Cmd + Space` | Abrir búsqueda Spotlight |
| `Cmd + Tab` | Cambiar de aplicación |
| `Cmd + W` | Cerrar ventana actual |
| `Cmd + M` | Minimizar ventana actual |
| `Cmd + Shift + D` | Panel de diagnóstico |
| `Escape` | Cerrar Spotlight |

## Privacidad

**VibeOS es una aplicación web de frontend puro. Todos los datos se almacenan localmente en tu navegador.**

- **Clave API LLM**: Tu clave API, endpoint y modelo se almacenan solo en el `localStorage` del navegador.
- **Solicitudes LLM**: Durante la generación de apps, tu navegador envía solicitudes **directamente** a tu endpoint API LLM configurado.
- **Datos locales**: El sistema de archivos virtual, registros de instalación y cachés se almacenan en `localStorage` / `IndexedDB`.
- **Sin telemetría**: VibeOS no recopila, informa ni transmite ningún dato de comportamiento del usuario.
- **Funcionamiento sin conexión**: Las funciones principales (gestión de archivos, configuración, juegos) funcionan completamente sin conexión.

> ⚠️ **Nota**: Las funciones relacionadas con LLM requieren conexión a Internet para llamar a APIs de terceros. Se aplica la política de privacidad de tu proveedor LLM.

<p align="right"><a href="#top">⬆ Volver arriba</a></p>

---

<h1 id="ru">VibeOS</h1>

> Веб-десктопная ОС в стиле macOS на базе ИИ — ИИ генерирует приложения в реальном времени.

## Что такое VibeOS?

VibeOS — это десктопная операционная система, работающая в браузере, с интерфейсом в стиле macOS Aqua. В отличие от традиционных ОС, её приложения **не написаны заранее** — вместо этого большая языковая модель (LLM) **генерирует HTML/CSS/JS-код в реальном времени** на основе системных промптов и безопасно выполняет его в iframe-песочницах. Вам нужна только идея, и ИИ создаст полноценное приложение.

- **Версия**: 0.2.0
- **Сборка**: Phase 1 — macOS Aqua Style

## Ключевые возможности

- **Генерация приложений ИИ** — Динамическая генерация десктопных приложений через LLM с потоковым выводом SSE
- **UI в стиле macOS** — Матовое стекло строки меню, эффект увеличения Dock, кнопки-светофоры, поиск Spotlight
- **Полное управление окнами** — Перетаскивание, изменение размера, сворачивание, разворачивание, привязка, Cmd+Tab
- **Виртуальная файловая система** — На основе localStorage + IndexedDB, 7 каталогов по умолчанию, полный CRUD
- **Трёхуровневая песочница безопасности** — Изоляция iframe + белый список postMessage (30 API) + VibeOSAPI
- **Чистый фронтенд** — Нулевые зависимости от фреймворков, без шагов сборки, запуск прямо в браузере
- **Векторные иконки** — Чистая SVG-библиотека иконок, без эмодзи, без графических ресурсов
- **Светлая и тёмная темы** — Система дизайн-токенов на CSS-переменных, переключение в один клик

## Встроенные приложения

| Приложение | ID | Описание |
|------|----|------|
| Files | `files` | Двухпанельный файловый менеджер |
| TextEdit | `notepad` | Текстовый редактор с подсветкой синтаксиса |
| VibeCode | `vibecode` | Трёхпанельная кодовая IDE |
| Terminal | `terminal` | Эмулятор терминала с автодополнением по Tab |
| Browser | `browser` | Встроенный браузер с закладками и историей |
| AI Chat | `aichat` | ИИ-чат в стиле macOS |
| Music | `music` | Музыкальный плеер на Web Audio API |
| Calculator | `calculator` | Стандартный калькулятор с поддержкой клавиатуры |
| SysMon | `sysmon` | Панель мониторинга системы |
| App Store | `app-store` | Маркетплейс ИИ-приложений (12+ приложений) |
| Settings | `settings` | Настройки системы (обои/тема/LLM) |
| Snake | `snake` | Классическая игра Змейка |
| Tetris | `tetris` | Классическая игра Тетрис |
| LLM API | `llm-api` | Панель конфигурации LLM |
| Viewer | `imageview` | Просмотрщик изображений (масштаб/поворот) |

App Store также включает Clock, Paint, TaskMgr, Weather и другие приложения.

## Быстрый старт

### Требования

- Современный браузер (Chrome / Edge / Safari / Firefox)
- Ключ LLM API (опционально, доступен Mock-режим без ключа)

### Запуск

```bash
# Вариант 1: Открыть напрямую
open index.html

# Вариант 2: Локальный сервер (рекомендуется, избегает проблем CORS)
python3 -m http.server 8080
# Затем откройте http://localhost:8080
```

### Настройка LLM

После запуска нажмите **VibeOS > Настройки LLM** в строке меню или откройте приложение **LLM API** из Dock:

- Provider: `openai` (любое API, совместимое с OpenAI)
- API Endpoint: Ваш URL API
- API Key: Ваш секретный ключ
- Model: Название модели

Конфигурация автоматически сохраняется в localStorage.

## Архитектура

```
┌─────────────────────────────────────┐
│             Браузер                  │
│  ┌───────────────────────────────┐  │
│  │         Хост VibeOS           │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐  │  │
│  │  │Раб.ст│ │ Меню │ │Dock  │  │  │
│  │  └──────┘ └──────┘ └──────┘  │  │
│  │  ┌──────────────────────────┐ │  │
│  │  │   Менеджер окон           │ │  │
│  │  │  ┌──────────────────┐   │ │  │
│  │  │  │ iframe-песочница  │   │ │  │
│  │  │  │ ┌──────────────┐ │   │ │  │
│  │  │  │ │ ИИ-приложение │ │   │ │  │
│  │  │  │ └──────────────┘ │   │ │  │
│  │  │  └──────────────────┘   │ │  │
│  │  └──────────────────────────┘ │  │
│  │  ┌──────────┐ ┌────────────┐  │  │
│  │  │   VFS    │ │AppGenerator│  │  │
│  │  └──────────┘ └────────────┘  │  │
│  └───────────────────────────────┘  │
│              ↕ postMessage          │
│         ┌─────────────┐            │
│         │   LLM API   │            │
│         └─────────────┘            │
└─────────────────────────────────────┘
```

### Модель безопасности

```
Действие пользователя → iframe приложения → postMessage → Проверка белого списка → VibeOSAPI → Выполнение
                           ↑                                                             │
                           └─────────────────── Возврат результата ──────────────────────┘
```

Разрешено только 30 предопределённых вызовов API, охватывающих файловую систему, буфер обмена, уведомления, управление окнами, хранилище, сетевой прокси и вызовы LLM.

## Горячие клавиши

| Клавиши | Действие |
|--------|------|
| `Cmd + Space` | Открыть поиск Spotlight |
| `Cmd + Tab` | Переключение приложений |
| `Cmd + W` | Закрыть текущее окно |
| `Cmd + M` | Свернуть текущее окно |
| `Cmd + Shift + D` | Панель диагностики |
| `Escape` | Закрыть Spotlight |

## Конфиденциальность

**VibeOS — это чистое фронтенд-приложение. Все данные хранятся локально в вашем браузере.**

- **Ключ LLM API**: Ваш ключ API, endpoint и модель хранятся только в `localStorage` браузера.
- **LLM-запросы**: При генерации приложений браузер отправляет запросы **напрямую** на настроенный вами LLM API Endpoint.
- **Локальные данные**: Виртуальная файловая система, записи об установке приложений и кэш хранятся в локальном `localStorage` / `IndexedDB`.
- **Без телеметрии**: VibeOS не собирает, не передаёт и не отправляет данные о поведении пользователя.
- **Автономная работа**: Основные функции (управление файлами, настройки, игры) работают полностью офлайн.

> ⚠️ **Примечание**: Функции LLM требуют подключения к интернету для вызова сторонних API. Применяется политика конфиденциальности выбранного вами провайдера LLM.

<p align="right"><a href="#top">⬆ Наверх</a></p>

---

## License

MIT
