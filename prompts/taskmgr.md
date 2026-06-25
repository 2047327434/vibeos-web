# TaskMgr - 桌面任务管理器
生成桌面任务管理器，展示系统运行状态和窗口列表。

布局：顶部标签页（进程/性能）→ 主区域

进程标签：
- 表头：应用名 | 窗口ID | 状态 | 操作
- 遍历 const info=await VibeOSAPI.system.getInfo() 获取窗口数
- 窗口列表带操作：切换至（focus）、最小化、关闭
- 底部显示总窗口数

性能标签：
- CPU 使用率模拟图（折线 SVG，随机波动 10-60%，2 秒刷新）
- 内存占用柱状图（已用/总量，localStorage 消耗估算）
- LLM 状态（provider + model，调 system.getConfig 读取）
- 系统版本 + 启动时长

操作按钮：
- 刷新：重新拉取系统信息
- 结束任务：关闭选定窗口（VibeOSAPI.window.close() 针对目标窗口）

VibeOS 白色背景，表格行 hover #f5f5f7。只输出```html代码块。