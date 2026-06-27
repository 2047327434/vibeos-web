<div align="center">

[中文](README.md) · English · [日本語](README.ja.md) · [한국어](README.ko.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Русский](README.ru.md)

</div>

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

---

## License

MIT
