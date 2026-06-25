# Music - 桌面音乐播放器（多音色MIDI合成）
生成Apple Music风格桌面播放器。

## 布局
- 左侧200px浅灰#f5f5f7：资料库(最近添加/专辑/歌曲)、播放列表
- 右侧白色主区：歌曲名+艺人(大字体)、专辑封面占位(圆角方形浅灰底🎵)
- 底部毛玻璃控件：进度条可拖动 | ⏮ ⏯ ⏭ | 音量滑块

## 音色合成（Web Audio API多乐器）
必须用Web Audio API实现多音色MIDI合成，内置5首示例曲目：

音色定义（每个乐器用OscillatorNode+不同波形+ADSR包络）：
1. 🎹 钢琴：三角波(sine) + 三角波(sine)叠加八度，attack 0.01s decay 0.3s sustain 0.5 release 0.5
2. 🎻 弦乐：锯齿波(sawtooth)低频 + 方波(square)高频，attack 0.2s decay 0.1s sustain 0.8 release 1.0
3. 🎸 贝斯：三角波(triangle)低频，attack 0.05s decay 0.1s sustain 0.8 release 0.3
4. 🥁 打击乐：白噪声+方波低频，极短attack 0.001s decay 0.1s，用于节拍
5. 🎵 主旋律：正弦波(sine) + 三角波(triangle)叠加，attack 0.05s

每首曲目包含：BPM、旋律音符序列(用频率Hz数组)、和弦进行、鼓点节奏
用GainNode控制音量包络，BiquadFilter做EQ

## 示例曲目数据格式
```js
{ name:'月光', artist:'AI Composer', bpm:90,
  melody:[523,587,659,698,784,880,988,1047], // C5-B5-C6 (频率Hz)
  chords:[[261,329,392],[293,349,440],[329,392,493]], // C-E-G, D-F-A, E-G-B
  drums:[0,0,1,0,1,0,0,1], // 4/4拍 1=击鼓0=休止
  duration:120 // 秒
}
```

## 播放控制
- 播放/暂停：start/stop OscillatorNode
- 进度条：实时更新currentTime/totalDuration
- BPM可调，音量独立控制

## 系统联动（必须实现）
- 播放列表持久化：用 VibeOSAPI.storage 存储用户收藏的曲目ID（key: 'music_favorites'），启动时读取。不要用 localStorage。
- 收藏/取消收藏：await VibeOSAPI.storage.set('music_favorites', JSON.stringify(ids)) + VibeOSAPI.notification.show('已收藏', songName, 'check')
- 最近播放：用 VibeOSAPI.storage 存储最近播放记录（key: 'music_recent'，最多 20 条）
- 窗口标题：VibeOSAPI.window.setTitle(songName + ' - ' + artist + ' 🎵')

只输出```html代码块。
