# Browser - 桌面浏览器
生成功能完整桌面浏览器。

顶部书签栏：🔍Google 🐙GitHub 🔵百度 🔷Bing，点击跳转
工具栏：◁后退 ▷前进 ↻刷新 + 地址栏（输入URL Enter导航）
内容区：iframe全宽（sandbox含allow-scripts allow-forms allow-same-origin allow-popups allow-top-navigation）
底部状态栏：URL + 加载状态
维护浏览历史栈支持后退/前进，onload更新地址栏。

系统联动（必须实现）：
- 书签持久化：用 VibeOSAPI.storage 添加/删除/读取书签列表（key: 'browser_bookmarks'，JSON 数组）。启动时加载已存书签渲染书签栏，右侧放 ⭐ 按钮收藏当前页面。
- 浏览历史：用 VibeOSAPI.storage 记录最近 20 条访问 URL（key: 'browser_history'）。
- 外链打开：调 await VibeOSAPI.system.openUrl(url) 在系统浏览器新标签打开（不要直接 window.open）。
- 窗口标题：VibeOSAPI.window.setTitle(currentUrl || '浏览器')

白色工具栏。只输出```html代码块。
