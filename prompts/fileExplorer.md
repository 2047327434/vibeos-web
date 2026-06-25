# Files - 桌面文件管理器
生成专业文件管理器，双栏桌面布局。

左侧边栏200px：💻桌面 /Documents/ /Downloads/ /Pictures/ 快捷入口，选中蓝色高亮
右侧主区：表头栏（名称|大小|修改时间）+ 文件列表（📁文件夹/📄文件图标）
工具栏：←后退 🔄刷新 📁+新文件夹 📄+新文件 🗑️删除
双击文件: await VibeOSAPI.app.openFile(path) 调用关联应用打开

全部操作通过VibeOSAPI.fs: listDir/mkdir/writeFile/deleteFile
默认打开/Desktop/目录。白色背景。只输出```html代码块。
