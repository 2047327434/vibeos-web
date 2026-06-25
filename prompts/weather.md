# Weather - 桌面天气应用
生成桌面天气应用，通过 LLM 生成模拟天气数据（无外部 API key）。

布局：顶部搜索栏（城市输入框 + 查询按钮）→ 天气展示区

天气展示：
- 大图标（emoji：☀️🌤️🌧️⚡️❄️ 根据 LLM 返回的天气类型映射）
- 温度大字号显示（°C）
- 城市名 + 天气描述
- 体感温度 / 湿度 / 风速 三列
- 未来 3 天预报卡片（日期 + emoji + 高低温）

数据获取：
const r = await VibeOSAPI.llm.chat(`请以JSON格式返回${city}的天气数据，包含：type(sunny/cloudy/rainy/stormy/snowy), temp, feelsLike, humidity, forecast:[{day, type, high, low}]。只返回JSON，不要其他文字。`);
解析 r.content 为 JSON，若解析失败则显示错误通知。

搜索历史：用 VibeOSAPI.storage 保存最近 5 个城市，搜索栏下方显示快捷标签。

VibeOS 白色背景，天气卡片圆角 12px。只输出```html代码块。