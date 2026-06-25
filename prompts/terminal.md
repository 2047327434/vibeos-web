# Terminal - 桌面终端
生成专业终端模拟器，黑底绿字。

外观：黑色背景#1a1a1a，绿色等宽字体#00ff00 14px，闪烁块状光标。
命令集：help ls cd pwd cat echo date clear whoami uname df
- ls用VibeOSAPI.fs.listDir读取目录
- cat用VibeOSAPI.fs.readFile读取文件
功能：↑↓命令历史(50条)、Tab补全、Ctrl+L清屏、500行回滚。
白色边框。只输出```html代码块。
