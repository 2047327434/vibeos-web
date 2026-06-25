/* ============================================
   VibeOS App Registry - VibeOS Applications
   ============================================ */

const AppRegistry = {
  apps: [
    { id: 'files',      name: 'Files',      iconId: 'files',      category: 'System',  description: 'File manager',   promptFile: 'fileExplorer.md' },
    { id: 'notepad',    name: 'TextEdit',   iconId: 'notepad',    category: 'Tools',   description: 'Text editor',    promptFile: 'notepad.md' },
    { id: 'vibecode',   name: 'VibeCode',   iconId: 'vibecode',   category: 'Dev',     description: 'AI-powered IDE', promptFile: 'vibecode.md' },
    { id: 'terminal',   name: 'Terminal',   iconId: 'terminal',   category: 'System',  description: 'Terminal emulator', promptFile: 'terminal.md' },
    { id: 'browser',    name: 'Browser',    iconId: 'browser',    category: 'Network', description: 'Web browser',    promptFile: 'browser.md' },
    { id: 'calculator', name: 'Calculator', iconId: 'calculator', category: 'Tools',   description: 'Calculator',      promptFile: 'calculator.md' },
    { id: 'music',      name: 'Music',      iconId: 'music',      category: 'Media',   description: 'Music player',    promptFile: 'music.md' },
    { id: 'sysmon',     name: 'SysMon',     iconId: 'sysmon',     category: 'System',  description: 'System monitor',  promptFile: 'sysmon.md' },
    { id: 'imageview',  name: 'Viewer',     iconId: 'imageview',  category: 'Media',   description: 'Image viewer',    promptFile: 'imageview.md' },
    { id: 'snake',      name: 'Snake',      iconId: 'snake',      category: 'Games',   description: 'Snake game',      promptFile: 'snake.md' },
    { id: 'tetris',     name: 'Tetris',     iconId: 'tetris',     category: 'Games',   description: 'Tetris game',     promptFile: 'tetris.md' },
    { id: 'settings',   name: 'Settings',   iconId: 'settings',   category: 'System',  description: 'Preferences',     promptFile: 'settings.md' },
    { id: 'llm-api',    name: 'LLM API',    iconId: 'llm-api',    category: 'System',  description: 'LLM API Config',  promptFile: 'llmApi.md' },
    { id: 'app-store',  name: 'App Store',  iconId: 'app-store',  category: 'System',  description: 'Installed apps',  promptFile: 'store.md' },
    { id: 'aichat',     name: 'AI Chat',    iconId: 'aichat',     category: 'System',  description: 'AI 对话助手',    promptFile: 'aiChat.md' },
  ],

  get(id) { return this.apps.find((a) => a.id === id) || null; },
  getAll(cat) { return cat ? this.apps.filter((a) => a.category === cat) : [...this.apps]; },
  getCategories() { return [...new Set(this.apps.map((a) => a.category))]; },
  // 兼容老代码：返回 SVG 字符串
  iconHtml(id) { const a = this.get(id); return Icons.app(a?.iconId || id); },
};
