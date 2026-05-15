# Audio 占位目录

## BGM 接口（放真实音频）

把 mp3 / ogg 文件放这里，命名约定：

- `bgm-channel.mp3` — Memoria 领域页主 BGM (循环, 低能量氛围)
- `bgm-pull.mp3` — 抽卡前 8 秒蓄能 + 揭晓 (一次性)
- `bgm-battle.mp3` — 共鸣对决战斗 BGM (循环)
- `bgm-archive.mp3` — 图鉴翻阅 BGM (循环, 安静)

## SFX 程序化合成

8 种音效用 Web Audio API 直接合成，无需音频文件，见 `../sfx.js`：

| 函数 | 触发场景 |
|---|---|
| `playTap()` | UI 轻点（按钮、tab、卡片） |
| `playSwipe()` | 切换/抽屉打开 |
| `playPullCharge()` | 抽卡蓄能（按钮按下） |
| `playPullRelease()` | 抽卡释放（vortex 开始） |
| `playRevealSignal()` | R 揭晓 |
| `playRevealEcho()` | SR 揭晓 |
| `playRevealResonance()` | SSR 揭晓（带和声层） |
| `playComplete()` | 兑换成功/购买完成/任务领奖 |

## 怎么换成真实 BGM

`sfx.js` 内 `playBGM(name)` 接口已经预留：
```js
playBGM('bgm-channel');  // 自动从 assets/audio/bgm-channel.mp3 加载
stopBGM();
```
首次接触音频前会等待用户首次点击（浏览器 autoplay policy）。
