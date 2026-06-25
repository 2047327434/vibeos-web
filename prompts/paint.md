# Paint - 桌面画板
生成桌面绘图应用，支持画笔/橡皮擦/颜色选择/保存。

布局：左侧工具栏（画笔✏️/橡皮🧽/直线/矩形/圆形/填充/清空）→ 中间画布区（白色，监听 mousedown/mousemove/mouseup 绘制）→ 右侧属性面板

属性面板：
- 颜色选择器：预设色板（黑红橙黄绿蓝紫灰白）+ 原生 color picker
- 笔触粗细：滑块 1-30px，实时预览
- 撤销/重做：栈管理，Ctrl+Z / Ctrl+Shift+Z
- 清空按钮（带 confirm 确认）

保存：调 await VibeOSAPI.fs.writeFile('/Pictures/drawing_' + Date.now() + '.html', canvasWrapperHTML)
保存后 VibeOSAPI.notification.show('已保存', '图片已存至 /Pictures', 'check')

Canvas 800x500，鼠标松开后存 undo 快照（最多 20 步）。
VibeOS 白色背景，工具栏 #f5f5f5。只输出```html代码块。