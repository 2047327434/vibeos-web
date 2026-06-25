# App Store - 应用商店
生成 AI 预制应用市场。功能：

1. 展示 12 个应用卡片网格，每张卡片含图标、名称、简短描述、⚡生成按钮
2. 点击生成按钮 → 调用 `await VibeOSAPI.app.launch(name, icon, description)` 触发 AI 生成
3. 系统会自动打开新窗口，按 description 作为提示词让 AI 生成完整应用

## 预制应用列表
- 📋 待办清单 | 添加/完成/删除任务，数据用 VibeOSAPI.storage 持久化
- 📅 日历 | 月视图，点击日期添加备忘，数据用 VibeOSAPI.storage 持久化
- 🎨 绘图板 | Canvas自由绘图，保存到 /Pictures/（VibeOSAPI.fs.writeFile）
- 📊 图表工具 | 输入数据生成柱状图/折线图，支持导出到 /Documents/
- 💣 扫雷 | 经典扫雷游戏，最高分存 VibeOSAPI.storage
- 🌤️ 天气预报 | 输入城市，调 VibeOSAPI.llm.chat 获取天气数据
- 📖 Markdown笔记 | 左右分栏编辑+实时预览，保存到 /Documents/
- ⏰ 番茄钟 | 25分钟工作+5分钟休息循环，统计存 VibeOSAPI.storage
- 💱 汇率换算 | 金额货币转换，调 VibeOSAPI.llm.chat 获取汇率
- 🎯 打砖块 | Canvas挡板反弹，最高分存 VibeOSAPI.storage
- 📝 日记本 | 日期标记，数据存 VibeOSAPI.storage
- 🧮 单位换算 | 长度/重量/温度转换

## API 调用示例
```js
await VibeOSAPI.app.launch('待办清单', '📋', '生成待办清单应用。支持添加任务、标记完成、删除任务，数据用VibeOSAPI.storage持久化。');
```

## 系统联动（必须实现）
- 已安装应用列表：启动时调 const {apps}=await VibeOSAPI.app.installed() 显示已安装的自定义应用
- 窗口标题：VibeOSAPI.window.setTitle('应用商店')

## 视觉
VibeOS白色背景，3列卡片网格，卡片hover上浮阴影。
只输出```html代码块。
