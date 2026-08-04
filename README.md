# 🧠 专注力训练营（Kids Focus Camp）

面向儿童的免费专注力训练小游戏合集。纯静态网页（原生 HTML / CSS / JS，零依赖、无需构建），支持**触摸屏和鼠标**，可免费部署到 GitHub Pages。

## ✨ 游戏内容

| 游戏 | 玩法 |
| --- | --- |
| 🔍 找不同 | 支持**点击**或**画圈**；上传时可选「普通单图自动生成不同」或「现成的找不同图原样玩」（本地扫描答案 / 自由标记）；也可**免费 AI 生成** |
| 🎨 找相近颜色 | 在一堆相近颜色中找出唯一不同的色块，难度逐关递增 |
| 🌀 走迷宫 | 手指拖动小球穿过迷宫，迷宫逐关变大（6×6 → 12×12） |
| 🦘 过障碍 | 点击跳跃，小青蛙躲避障碍物，挑战最远距离 |
| ⚡ 防触电 | 电流急急棒玩法：小蜜蜂沿着花路送花蜜，别碰带电的蜘蛛网，有安全站、星级皮肤 |
| 🔢 舒尔特方格 | 按顺序 1→N 点击数字，经典注意力训练，可选 3×3 / 4×4 / 5×5 |

## 🤖 AI 说明

- 服务：Pollinations.ai —— 完全免费，无需注册、无需 API Key
- 模型：FLUX.1-schnell（开源模型）
- 生成需要联网，通常 10~60 秒；网络不可用时可以改用上传图片

## 🚀 本地运行

任意静态服务器均可（本机没有 Python 时可以直接用 Node）：

```bash
python -m http.server 8000
# 或
npx serve .
# 或（本项目内置）
node serve.mjs
```

然后浏览器打开 `http://localhost:8000`。

## 📦 部署到 GitHub Pages（免费）

1. 把项目推送到 GitHub 仓库
2. 仓库 `Settings → Pages → Source` 选择 `Deploy from a branch`，分支 `main`、目录 `/ (root)`
3. 等待 1~2 分钟，访问 `https://<用户名>.github.io/<仓库名>/`

## 📁 目录结构

```text
kids-focus/
├── index.html          # 入口页
├── css/style.css       # 全局样式
├── js/
│   ├── main.js         # 首页与路由
│   ├── touch.js        # 触摸/鼠标统一手势
│   ├── ai.js           # 免费 AI 生成封装
│   ├── storage.js      # 浏览器本地图库（IndexedDB）
│   ├── sound.js        # WebAudio 音效
│   └── games/          # 六个小游戏模块
└── README.md
```

## 🧩 如何新增游戏

在 `js/games/` 下新建一个模块，导出 `id / name / icon / desc / create(container, onExit)`，然后在 `js/main.js` 的 `GAMES` 数组里加一行即可。
