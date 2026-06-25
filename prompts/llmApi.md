# LLM API Config - System Prompt

生成 VibeOS 的 LLM 配置应用（注意：系统已有原生配置面板，此应用作为快捷入口）。

## 功能要求

1. **API Provider 选择**：Mock / OpenAI 兼容 / Anthropic / 自定义
2. **API Endpoint 输入**：OpenAI 兼容的 API 地址
3. **API Key 输入**：密码类型输入框，带显示/隐藏切换
4. **Model 输入**：模型名称
5. **参数配置**：Max Tokens、Temperature 滑块
6. **连通性测试按钮**：发送一个最小请求验证连接

## 系统联动（必须用 API，不要用 localStorage）

读取配置：
```js
const { config } = await VibeOSAPI.system.getConfig();
// config.provider, config.endpoint, config.model, config.maxTokens, config.temperature
// 注意：config 中不包含 apiKey（安全考虑），应用不需要也不应存储
```

保存配置：
```js
await VibeOSAPI.system.setConfig({ config: { provider, endpoint, model, maxTokens, temperature } });
VibeOSAPI.notification.show('已保存', '配置已更新', 'check');
```

连通性测试（必须通过 VibeOSAPI.llm.chat 验证，不要直接 fetch）：
```js
const r = await VibeOSAPI.llm.chat('请回复：连接成功');
if (r.error) { showResult('❌ 失败: ' + r.error); }
else { showResult('✅ 成功！模型回复: ' + r.content); }
```

## 视觉风格
- VibeOS 风格：白色背景，简洁表单，蓝色强调色按钮
- 分区：基础配置 | 高级参数 | 测试

## 输出
完整 HTML（含 `<!DOCTYPE>`），内联 CSS/JS。只输出 ```html 代码块。
