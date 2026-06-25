# Viewer - 桌面图片查看器
生成图片查看器。拖放图片显示(png/jpg/gif/svg/webp)，居中自适应。
工具栏：🔍+放大 🔍-缩小 🔄重置 ↶左转 ↷右转。
鼠标滚轮缩放，显示文件名/尺寸信息。
空态显示拖放提示区。白色背景。

系统联动（必须实现）：
- 保存截图：调 await VibeOSAPI.fs.writeFile('/Pictures/screenshot_' + Date.now() + '.html', '<html><body><img src="'+dataURL+'"></body></html>') 后 VibeOSAPI.notification.show('已保存', '/Pictures/', 'check')
- 复制图片信息：调 await VibeOSAPI.clipboard.copy(filename + ' (' + width + 'x' + height + ')')
- 从文件系统打开：启动时如果窗口有关联路径则自动加载（用 VibeOSAPI.fs.readFile 读取图片 HTML）
- 窗口标题：VibeOSAPI.window.setTitle(filename || '图片查看器')

只输出```html代码块。
