<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=28&pause=1000&color=00D4FF&center=true&vCenter=true&width=435&lines=🌌+GLEX+OS+V1.0;BEYOND+THE+BROWSER;100%+NATIVE+PERFORMANCE" alt="Typing SVG" />

<br>

# 🌌 GLEX OS
### A modular, high-performance browser-native desktop environment

[![Download Glex OS](https://img.shields.io/badge/DOWNLOAD-GLEX_OS-00D4FF?style=for-the-badge&logo=github&logoColor=white&labelColor=1a1a2e)](https://github.com/urehrhhdhdhd-pixel/Glex/archive/refs/heads/main.zip)
[![Live Demo](https://img.shields.io/badge/LIVE-DEMO-2ed573?style=for-the-badge&logo=google-chrome&logoColor=white&labelColor=1a1a2e)](https://urehrhhdhdhd-pixel.github.io/Glex/Glex/GLEX_OS.html)

<br>

<p>
  <a href="https://github.com/urehrhhdhdhd-pixel/Glex/stargazers">
    <img src="https://img.shields.io/github/stars/urehrhhdhdhd-pixel/Glex?style=for-the-badge&logo=starship&color=FFEE00&logoColor=black&labelColor=1a1a2e" alt="stars">
  </a>
  <a href="https://github.com/urehrhhdhdhd-pixel/Glex/network/members">
    <img src="https://img.shields.io/github/forks/urehrhhdhdhd-pixel/Glex?style=for-the-badge&logo=git-fork&logoColor=white&color=00D4FF&labelColor=1a1a2e" alt="forks">
  </a>
  <a href="https://github.com/urehrhhdhdhd-pixel/Glex/issues">
    <img src="https://img.shields.io/github/issues/urehrhhdhdhd-pixel/Glex?style=for-the-badge&logo=git-bug&color=FF4757&labelColor=1a1a2e" alt="issues">
  </a>
</p>

<br>

<p>
  <a href="#-getting-started">
    <img src="https://img.shields.io/badge/DOCUMENTATION-70a1ff?style=for-the-badge&logo=read-the-docs&logoColor=white&labelColor=2f3542" alt="docs">
  </a>
  &nbsp;
  <a href="https://github.com/urehrhhdhdhd-pixel/Glex/issues/new">
    <img src="https://img.shields.io/badge/REPORT_BUG-ff4757?style=for-the-badge&logo=bug&logoColor=white&labelColor=2f3542" alt="report bug">
  </a>
</p>

<br>

<img width="850" src="https://via.placeholder.com/850x400/0f0c29/00d4ff?text=GLEX+OS+VIRTUAL+DESKTOP+INTERFACE" style="border-radius: 15px; border: 2px solid #00d4ff; box-shadow: 0 0 20px #00d4ff44;" alt="Glex OS Hero">

<br>
<sub><i>Lightweight. Fast. 100% browser-native.</i></sub>

</div>

---

## 🛰️ Why Glex OS?

Experience a full workstation environment directly in your browser. Glex OS leverages **Preact** and **HTM** to deliver a lag-free experience with zero installation.

- ⚡ **Quantum Speed** — Minimal overhead using native JS and lightweight UI libraries.
- 🪟 **Fluid Windows** — Smooth physics-based dragging, snapping, and resizing.
- 🎨 **Deep Dark Design** — Sophisticated glassmorphic UI optimized for late-night dev.
- 💾 **Safe-State** — Everything stays exactly where you left it via `localStorage` and `IndexedDB`.
- ⌨️ **Pro Hotkeys** — Navigate the OS like a power user with customizable shortcuts.

---

## 🛠️ System Capabilities

| Module | Functionality | Status |
| :--- | :--- | :--- |
| **Window Manager** | Resizing • Minimizing • Tiling • Physics | 🟦 **Active** |
| **Core Registry** | Dynamic App Mounting • Lifecycle Hooks | 🟦 **Active** |
| **File System** | Virtual Disk • Drag & Drop • Persistence | 🟦 **Active** |
| **Notification Engine** | Toast Popups • System Logs • Sound FX | 🟪 **Testing** |
| **App Store** | Remote App Sideloading via URL | 🟧 **Planned** |

---

## 📂 Project Anatomy

```bash
Glex/
├── 📄 GLEX_OS.html      # The Portal (Entry Point)
├── 📂 assets/
│   ├── 🖼️ icons/        # Custom-crafted SVG/PNG icons
│   └── 🎨 wallpapers/   # High-definition cyber-backgrounds
├── 📂 src/
│   ├── 🧠 core/         # The Brain (WindowMgr, Hotkeys, Taskbar)
│   ├── 🛠️ apps/         # The Tools (Notes, Files, Terminal)
│   └── 📜 main.js       # The Pulse (App Initialization)
└── 📦 vendor/           # The Engine (Preact, HTM, JSZip)
