<div align="center">

# 🧠 专注力训练营 · Kids Focus Camp

<img src="assets/logo.svg" alt="专注力训练营 Logo" width="180">

**面向儿童的免费专注力训练小游戏合集**

纯静态网页（原生 HTML / CSS / JS，零依赖、无需构建），支持**触摸屏和鼠标**，可免费部署到 GitHub Pages。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![在线体验](https://img.shields.io/badge/%F0%9F%9A%80%20Live-GitHub%20Pages-blue.svg)](https://juntiy.github.io/kids-focus/)
[![AI 生成](https://img.shields.io/badge/AI-Pollinations%20FLUX-green.svg)](https://pollinations.ai/)
[![技术栈](https://img.shields.io/badge/Stack-HTML%20%2F%20CSS%20%2F%20JS-orange.svg)]()
[![触摸屏](https://img.shields.io/badge/%F0%9F%91%86%20Touch-Friendly-brightgreen.svg)]()

**👉 在线体验：https://juntiy.github.io/kids-focus/**

**中文** | [English](README.en.md)

</div>

---

## ✨ 功能特性

- 🎮 **六个专注力小游戏**，全部免费、无广告、无需下载
- 📱 **触摸屏 + 鼠标双支持**，专为平板 / 手机上的低龄儿童设计
- 🔍 **找不同**：支持上传自己的图片或免费 AI 生成；现成的双图可以本地扫描答案，AI 只负责提示和最终答案
- 🤖 **免费开源 AI**：FLUX（Pollinations）生成图片，无需注册、无需 API Key
- ⭐ **激励系统**：星级小奖状、皮肤解锁（防触电）
- 🌐 **免费部署**：GitHub Pages 一键托管，自带 HTTPS

## 🎮 游戏列表

| 游戏 | 玩法 |
| --- | --- |
| 🔍 找不同 | 点击或画圈（手绘标记、可撤销）；上传可选「普通单图自动生成细微不同」或「现成找不同图原样玩」（AI 提示 + 最终答案）；也可免费 AI 生成 |
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

## 🗂 目录结构

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
├── assets/
│   ├── logo.svg        # 项目 Logo
│   ├── donate-qr.png   # 支付宝收款码
│   └── wechat-qr.png   # 微信收款码
└── README.md
```

## 🧩 如何新增游戏

在 `js/games/` 下新建一个模块，导出 `id / name / icon / desc / create(container, onExit)`，然后在 `js/main.js` 的 `GAMES` 数组里加一行即可。

## 🛠 技术栈

| 类别 | 内容 |
| --- | --- |
| 前端 | 原生 HTML / CSS / JavaScript（ES Modules） |
| 存储 | localStorage + IndexedDB（图片图库） |
| AI | Pollinations.ai · FLUX.1-schnell（免费开源） |
| 托管 | GitHub Pages（免费，HTTPS） |
| 音效 | WebAudio 合成，无外部资源 |

## ☕ 打赏支持

如果这个项目对你的孩子有帮助，欢迎请我们喝杯咖啡 ☕～

<div align="center">

<img src="assets/donate-qr.png" alt="支付宝收款码" width="240">
<img src="assets/wechat-qr.png" alt="微信收款码" width="240">

*支付宝 / 微信扫一扫，请我们喝杯咖啡～*

</div>

每一份支持都是我们持续做儿童教育内容的动力，感谢你的鼓励！❤️

## 📄 License

本项目基于 [MIT License](LICENSE) 开源，欢迎学习、使用与二次开发。

---

<div align="center">Made with ❤️ for kids · 专注力训练营</div>
