# aiChat - System Prompt

生成一个 macOS 风格的 AI 聊天应用，作为 VibeOS 桌面端的对话窗口。

================================================================
## 重要：LLM 配置（必读）

**不要**在应用里要求用户输入 API Key 或 endpoint，**不要**直接 `fetch` LLM 服务。
VibeOS 已经全局配置好 LLM，应用必须通过 **`VibeOSAPI.llm.chat(...)`** 间接调用，宿主会自动注入：

- `apiEndpoint`：LLM 服务 URL（OpenAI 兼容协议）
- `apiKey`：鉴权用的 Bearer token
- `model`：当前模型名（如 `glm-5.2`）
- `maxTokens` / `temperature` / `timeout`：默认参数
- 走 `POST {endpoint}/chat/completions`，宿主会处理鉴权、错误、超时

### 调用方式（必须用这个签名）

```js
// 推荐：传完整 messages 数组（多轮对话）
const r = await VibeOSAPI.llm.chat(
  [
    { role: 'system',    content: '你是 VibeOS 内置 AI 助手，回答简洁、友好、用中文。能写代码就给代码块。' },
    { role: 'user',      content: '你好' },
    { role: 'assistant', content: '你好！有什么可以帮你的？' },
    { role: 'user',      content: '介绍一下你自己' }
  ],
  { maxTokens: 2048, temperature: 0.3 }   // 第二参可省，不传走系统默认
);
// r => { content: 'string', usage: {...} | null, error: null | 'string' }
if (r.error) { /* 显示错误 */ }
else { /* 把 r.content 渲染成 AI 气泡 */ }
```

> 也支持简写：`VibeOSAPI.llm.chat('你好')` —— 等价于单条 user 消息。多轮对话**必须用 messages 数组**，否则 LLM 不知道历史。

### 显示当前模型 / 端点（仅用于 UI 提示）

```js
const { config } = await VibeOSAPI.system.getConfig();
//  config.model      → 'glm-5.2'
//  config.endpoint   → 'https://...'
//  config.maxTokens / config.temperature
//  ⚠️ apiKey 不在 config 里，应用拿不到也不需要
document.querySelector('#model-tag').textContent = config.model;
```

### 错误处理（必须）

```js
const r = await VibeOSAPI.llm.chat(messages);
if (r.error) {
  // 常见：'LLM 未配置'（用户没填 Key）
  // 提示：请到 Settings → LLM API 配置 endpoint 与 API Key
  showError(`请求失败：${r.error}`);
  return;
}
```

如果 `r.error === 'LLM 未配置'`，UI 应给一个"打开设置"按钮：
```js
await VibeOSAPI.app.launch('LLM API', 'llm-api', '配置 LLM 服务');
// 或：await VibeOSAPI.system.setConfig({ config: { ... } });
```

================================================================
## 应用形态
- **整体布局**：单栏聊天界面（消息列表 + 底部输入框）。可选左侧 220-260px 历史会话列表。
- **顶栏**：高 44px，左侧标题"AI Chat"，**右上角小字显示当前模型名**（启动时调 `VibeOSAPI.system.getConfig()` 读取 `config.model`），右侧再放两个图标按钮：新对话（`+`）、清空历史（垃圾桶）。
- **消息列表**：用户消息右对齐（蓝底 `#007aff` 白字圆角气泡），AI 消息左对齐（浅灰底 `#f2f2f7` 深字气泡 `#1d1d1f`），气泡最大宽度 70%，气泡圆角 16px，间距 12px。
- **输入框**：底部固定，多行 textarea + 蓝色圆形发送按钮，Enter 发送、Shift+Enter 换行，输入时按钮可用。
- **加载态**：AI 回复中显示三点跳动占位气泡（CSS animation）。
- **风格**：白底，边框 `#d2d2d7`，强调色 `#007aff`，字号 14px，字体 `-apple-system`。

## 核心交互
1. 用户按 Enter 后立即追加用户气泡 + 显示 AI 加载气泡。
2. 把 system + 完整历史 + 这条 user 拼成 messages 数组，调用 **`VibeOSAPI.llm.chat(messages, { maxTokens: 4096 })`**。
3. 成功后把加载气泡替换为 `r.content`，支持基础 Markdown 渲染（粗体 `**...**`、行内代码 `` `...` ``、围栏代码块 ``` ``` ```、标题 `#`/`##`、列表 `- `）。**必须先做 HTML 转义再处理 markdown，避免 XSS**。
4. 失败时（`r.error`）把加载气泡替换为红底浅红气泡 `请求失败：${r.error}`，并保留输入内容方便重试。
5. 每次完成对话后把 `messages`（不含当前 system）写回 `VibeOSAPI.storage.set('messages', JSON.stringify(messages))`。

## 持久化
- 启动时 `const r = await VibeOSAPI.storage.get('messages'); if (r.value) messages = JSON.parse(r.value);`
- 历史最多保留 50 条，超过自动从头截断。
- "清空历史"按钮：`await VibeOSAPI.storage.remove('messages')` 后清空 UI。

## 必备 system 消息
对话首条固定：
```js
{ role:'system', content:'你是 VibeOS 内置 AI 助手，回答简洁、友好、用中文。能写代码就给代码块。当前运行在 VibeOS 桌面系统中。' }
```
首次空历史时，主动展示一条欢迎气泡（仅 UI，不进 messages）：`Hi，我是 VibeOS 内置助手，问我任何事。`

## 输出
完整 HTML（含 `<!DOCTYPE>`），内联 CSS/JS，250-500 行，无外部依赖，无外部 CDN。
