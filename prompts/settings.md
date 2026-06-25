# Settings - 系统设置
生成极简的系统设置面板。禁止任何动画、渐变、阴影、圆角特效。只用纯色背景和简单边框。

布局：左侧 140px 导航栏(背景#f5f5f5)，右侧内容区(padding 16px)。
导航项：「壁纸」「主题」「LLM」「缓存」「关于」。

## 壁纸页
6个色块按钮(36x36px，无边框，display:inline-block)，色值：#ffffff #1a365d #1a4731 #2d1b69 #4a148c #004d40。
点击调 `await VibeOSAPI.desktop.setWallpaper({color:'#xxx'})`，成功后 `VibeOSAPI.notification.show('壁纸','已更新','check')`。

## 主题页
两个按钮：「浅色」「深色」。
点击调 `await VibeOSAPI.desktop.setTheme('light'/'dark')`。

## LLM 页
只读展示，调 `const {config}=await VibeOSAPI.system.getConfig()` 后用文本显示：Provider、Model、Endpoint、Max Tokens、Temperature。
底部一行提示文字(12px,#999)：「详细 LLM 配置请点左上角 VibeOS 菜单 → LLM 设置」。

## 缓存页
一个按钮「清除应用缓存」，调 `await VibeOSAPI.system.clearCache()` + `VibeOSAPI.notification.show('缓存','已清除','check')`。

## 关于页
居中显示文字：VibeOS v0.1，AI 驱动的网页桌面系统。调 `const info=await VibeOSAPI.system.getInfo()` 显示版本和窗口数。

## 要求
- 切换导航页时只显示对应内容，用 display:none/block 控制
- 启动时调 `VibeOSAPI.window.setTitle('系统设置')`
- 所有按钮点击必须有 await 和错误处理(try/catch)
- 总输出不超过 300 行，不含任何 CSS 动画或 transition
- 只输出```html代码块