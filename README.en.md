<div align="center">

# 🧠 Kids Focus Camp

<img src="assets/logo.svg" alt="Kids Focus Camp Logo" width="180">

**A collection of free focus-training mini games for kids**

A pure static web app (vanilla HTML / CSS / JS, zero dependencies, no build step). Fully supports **touch screens and mouse**, and deploys to **GitHub Pages for free**.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/%F0%9F%9A%80%20Live-GitHub%20Pages-blue.svg)](https://juntiy.github.io/kids-focus/)
[![AI](https://img.shields.io/badge/AI-Pollinations%20FLUX-green.svg)](https://pollinations.ai/)
[![Stack](https://img.shields.io/badge/Stack-HTML%20%2F%20CSS%20%2F%20JS-orange.svg)]()
[![Touch](https://img.shields.io/badge/%F0%9F%91%86%20Touch-Friendly-brightgreen.svg)]()

**👉 Live demo: https://juntiy.github.io/kids-focus/**

**English** | [中文](README.md)

</div>

---

## ✨ Features

- 🎮 **Six focus-training games** — all free, no ads, no downloads
- 📱 **Touch + mouse support**, designed for young kids on tablets and phones
- 🔍 **Spot the Difference**: upload your own images or generate with free AI; pre-made pair images are kept as-is with local answer scanning — AI only provides hints and the final answer key
- 🤖 **Free open-source AI**: FLUX (Pollinations) generates images — no sign-up, no API key
- ⭐ **Reward system**: star certificates and unlockable skins (Shock Maze)
- 🌐 **Free hosting**: GitHub Pages with built-in HTTPS

## 🎮 Games

| Game | How to play |
| --- | --- |
| 🔍 Spot the Difference | Tap or draw a circle (hand-drawn marks, undo supported). Choose "single image" (auto-generate subtle differences) or "pre-made pair image" (play as-is with AI hints + answer key); or generate with free AI |
| 🎨 Color Match | Find the one tile with a slightly different color; difficulty increases round by round |
| 🌀 Maze | Drag the ball through the maze with your finger; mazes grow from 6×6 to 12×12 |
| 🦘 Obstacle Jump | Tap to make the frog jump over obstacles and go as far as possible |
| ⚡ Shock Maze | Steady-hand game: guide the little bee along the flower path without touching the electric web; checkpoints and unlockable skins |
| 🔢 Schulte Grid | Tap numbers 1→N in order — the classic attention-training exercise; 3×3 / 4×4 / 5×5 |

## 🤖 About the AI

- Service: Pollinations.ai — completely free, no registration or API key required
- Model: FLUX.1-schnell (open source)
- Generation requires internet, usually 10–60 seconds; when offline, upload your own images instead

## 🚀 Run locally

Any static file server works (no Python? just use Node):

```bash
python -m http.server 8000
# or
npx serve .
# or (built-in)
node serve.mjs
```

Then open `http://localhost:8000`.

## 📦 Deploy to GitHub Pages (free)

1. Push this project to a GitHub repository
2. In the repo `Settings → Pages → Source`, choose `Deploy from a branch` → `main` / `(root)`
3. Wait 1–2 minutes and visit `https://<username>.github.io/<repo>/`

## 🗂 Project structure

```text
kids-focus/
├── index.html          # Entry page
├── css/style.css       # Global styles
├── js/
│   ├── main.js         # Home page & routing
│   ├── touch.js        # Unified touch/mouse gestures
│   ├── ai.js           # Free AI image generation
│   ├── storage.js      # Local image gallery (IndexedDB)
│   ├── sound.js        # WebAudio sound effects
│   └── games/          # Six game modules
├── assets/
│   ├── logo.svg        # Project logo
│   ├── donate-qr.png   # Alipay QR code
│   └── wechat-qr.png   # WeChat QR code
└── README.md
```

## 🧩 Add a new game

Create a module under `js/games/` that exports `id / name / icon / desc / create(container, onExit)`, then add one line to the `GAMES` array in `js/main.js`.

## 🛠 Tech stack

| Category | Details |
| --- | --- |
| Frontend | Vanilla HTML / CSS / JavaScript (ES Modules) |
| Storage | localStorage + IndexedDB (image gallery) |
| AI | Pollinations.ai · FLUX.1-schnell (free & open source) |
| Hosting | GitHub Pages (free, HTTPS) |
| Sound | WebAudio synthesized, no external assets |

## ☕ Support us

If this project helps your kids, feel free to buy us a coffee ☕

<div align="center">

<img src="assets/donate-qr.png" alt="Alipay QR code" width="240">
<img src="assets/wechat-qr.png" alt="WeChat QR code" width="240">

*Scan with Alipay / WeChat to buy us a coffee ☕*
</div>

Every bit of support fuels our work on educational content for kids. Thank you! ❤️

## 📄 License

Licensed under the [MIT License](LICENSE).

---

<div align="center">Made with ❤️ for kids</div>
