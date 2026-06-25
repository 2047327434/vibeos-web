# TextEdit - 桌面文本编辑器
生成专业桌面文本编辑器。

布局：顶部菜单栏（文件/编辑/格式）→ 工具栏（📄新建 📂打开 💾保存 ↩撤销 ↪重做）→ 大编辑区（等宽14px，行号，自动换行）→ 底部状态栏（行:列 | 字符数 | UTF-8）

必须集成系统API：
- Ctrl+S: await VibeOSAPI.fs.writeFile('/Desktop/note.txt', text); VibeOSAPI.notification.show('已保存','/Desktop/note.txt','💾')
- Ctrl+O: const {content}=await VibeOSAPI.fs.readFile('/Desktop/note.txt')
- 另存为: 输入文件名→保存到/Desktop/
- 窗口标题显示文件名: VibeOSAPI.window.setTitle(name+' - TextEdit')

VibeOS白色背景，工具栏#f5f5f5。只输出```html代码块。
