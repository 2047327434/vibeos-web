# Tetris - 桌面俄罗斯方块
生成经典俄罗斯方块。Canvas 10x20网格，300x600，深色#1a1a1a。
7种标准方块不同颜色，←→移动 ↑旋转 ↓加速 空格直落。
右侧显示分数/等级/预览。满行消除计分，堆顶结束重玩。
P暂停，白色外框。

系统联动（必须实现）：
- 最高分持久化：用 await VibeOSAPI.storage.set('tetris_highscore', String(score))，启动时读取（不用 localStorage）
- 窗口标题：VibeOSAPI.window.setTitle('俄罗斯方块 - 分数 ' + score) 实时更新分数
- 游戏结束通知：VibeOSAPI.notification.show('游戏结束', '得分: '+score, 'info')
- 破纪录：VibeOSAPI.notification.show('新纪录！', score+' 分', 'bell')

只输出```html代码块。
