# Clock - 桌面时钟
生成桌面时钟应用，支持模拟时钟+数字时钟双模式切换。

布局：顶部模式切换标签（模拟/数字/世界时钟）→ 主显示区
- 模拟模式：SVG 绘制圆形表盘，时针/分针/秒针实时旋转，12个刻度，中心圆点，秒针红色
- 数字模式：大字号 HH:MM:SS 居中，下方显示日期（YYYY年M月D日 星期X）
- 世界时钟：3列卡片显示北京/纽约/伦敦/东京当前时间，城市名+时间+时差

每秒更新（requestAnimationFrame 或 setInterval 1000ms）。
启动时调 const {now}=await VibeOSAPI.system.now() 校准时间，之后本地 tick。

VibeOS 白色背景，表盘深色描边。只输出```html代码块。