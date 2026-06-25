# VibeOS

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

## License

MIT
