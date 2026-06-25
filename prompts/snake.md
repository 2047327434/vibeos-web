# Snake - 桌面贪吃蛇
生成经典贪吃蛇游戏。Canvas 400x400，深色网格背景#1a1a1a。
方向键/WSAD控制，吃食物+10分长度+1，速度递增。
左上角显示分数和最高分，撞墙/撞身结束显示重玩按钮。
空格暂停。白色外框。

系统联动（必须实现）：
- 最高分持久化：用 await VibeOSAPI.storage.set('snake_highscore', String(score)) 存最高分，启动时 const {value}=await VibeOSAPI.storage.get('snake_highscore') 读取（不要用 localStorage）
- 游戏结束通知：撞墙/撞身时调 VibeOSAPI.notification.show('游戏结束', '得分: '+score+' | 最高: '+high, 'info')
- 破纪录提示：新最高分时 VibeOSAPI.notification.show('新纪录！', score+' 分', 'bell')

只输出```html代码块。
