# Calculator - 桌面计算器
生成标准桌面计算器。布局紧凑，适合窗口打开。

布局：顶部显示区（大字号右对齐，灰底#f8f8f8，显示表达式+结果）→ 按钮区4列网格
按钮行：C CE % ÷ | 7 8 9 × | 4 5 6 - | 1 2 3 + | 0 . =
按钮圆角8px，hover深色，active内阴影。键盘数字键直输，Enter=等号，Esc=清除。

系统联动（必须实现）：
- 计算历史：每次按=后存入历史记录，用 VibeOSAPI.storage 持久化（key: 'calc_history'，JSON 数组，最多 50 条）。启动时读取并显示在侧边或下拉中。
- 复制结果：长按或右键结果区，调 await VibeOSAPI.clipboard.copy(result) + VibeOSAPI.notification.show('已复制', result, 'check')
- 窗口标题：VibeOSAPI.window.setTitle('计算器')，有未完成表达式时显示表达式片段

VibeOS白色背景。只输出```html代码块。
