<div align="center">

  <img src="https://img.shields.io/badge/Glex%20OS-v1.0-6e48aa?style=for-the-badge&logo=linux&logoColor=white&labelColor=2a1b47" alt="Glex OS">

  <br><br>

  

  <h1>🌌 Glex OS</h1>

  <h3>A modular, high-performance browser-native desktop environment</h3>

  

  <br>

  

  <p>

    <a href="https://github.com/urehrhhdhdhd-pixel/Glex/stargazers">

      <img src="https://img.shields.io/github/stars/urehrhhdhdhd-pixel/Glex?style=for-the-badge&logo=starship&color=yellow&logoColor=white&labelColor=1a1a2e" alt="stars">

    </a>

    <a href="https://github.com/urehrhhdhdhd-pixel/Glex/forks">

      <img src="https://img.shields.io/github/forks/urehrhhdhdhd-pixel/Glex?style=for-the-badge&logo=git-fork&logoColor=white&color=cyan&labelColor=0f3460" alt="forks">

    </a>

    <a href="https://github.com/urehrhhdhdhd-pixel/Glex/issues">

      <img src="https://img.shields.io/github/issues/urehrhhdhdhd-pixel/Glex?style=for-the-badge&logo=git-bug&color=ff6b6b&labelColor=3d0000" alt="issues">

    </a>

    <a href="https://github.com/urehrhhdhdhd-pixel/Glex/blob/main/LICENSE">

      <img src="https://img.shields.io/github/license/urehrhhdhdhd-pixel/Glex?style=for-the-badge&color=9d4edd&logoColor=white&labelColor=240046" alt="license">

    </a>

  </p>



  <br>



  <p>

    <a href="#-getting-started">

      <img src="https://img.shields.io/badge/Explore%20Docs-00d4ff?style=for-the-badge&logo=read-the-docs&logoColor=white&labelColor=004d80" alt="docs">

    </a>

    <span>&nbsp;&nbsp;</span>

    <a href="https://github.com/urehrhhdhdhd-pixel/Glex/issues/new?labels=bug&template=bug_report.md">

      <img src="https://img.shields.io/badge/Report%20Bug-ff4757?style=for-the-badge&logo=bug&logoColor=white&labelColor=870000" alt="report bug">

    </a>

    <span>&nbsp;&nbsp;</span>

    <a href="https://github.com/urehrhhdhdhd-pixel/Glex/issues/new?labels=enhancement&template=feature_request.md">

      <img src="https://img.shields.io/badge/Request%20Feature-2ed573?style=for-the-badge&logo=idea&logoColor=white&labelColor=006400" alt="request feature">

    </a>

  </p>



  <br><br>



  <img width="780" src="https://via.placeholder.com/780x460/1a1a2e/00d4ff?text=Glex+OS+Screenshot+Here" alt="Glex OS Demo"><br>

  <small><i>Lightweight. Fast. 100% browser-native.</i></small>



</div>



<br><br>



---



## 🌠 Why Glex OS?



A full desktop-like experience **without installing anything**, running completely inside your browser with:



- ⚡ Near-native performance (Preact + HTM + pure JS)

- 🪟 Beautiful, physics-feeling window manager

- 🎨 Clean neumorphic + glassmorphic design

- 💾 Persistent workspace via IndexedDB + localStorage

- 🔌 Modular app architecture — easy to extend

- ⌨️ Global hotkeys & context-aware shortcuts

- 🖼️ Built-in Gallery, Notes, File Explorer, Settings…



---



## ✨ Core Highlights



| Feature                     | Description                                          | Status     |

|-----------------------------|------------------------------------------------------|------------|

| Window Manager              | Draggable • Resizable • Snap • Minimize • Maximize   | ✓ Complete |

| Taskbar + Start Menu        | Dynamic, theme-aware                                 | ✓ Complete |

| File System (virtual)       | Upload, download, drag & drop support                | ✓ Complete |

| Theme Engine                | Dark / Light / Glass / Custom                        | ⚙️ Active  |

| Notification Center         | System-wide toast & persistent notifications         | ✓ Complete |

| Local Persistence           | Saves layout, open apps, files, settings             | ✓ Complete |

| App Store / sideload        | Planned — load apps from URL or GitHub               | 🛠️ Planned |



---



## 📂 Project Anatomy



```text

Glex/

├── GLEX_OS.html           # ← single-file entry point (or minimal index)

├── assets/

│   ├── icons/             # system + app icons (svg + png)

│   ├── wallpapers/        # default backgrounds

│   └── fonts/             # optional custom fonts

├── src/

│   ├── core/              # WindowManager, Taskbar, Registry, Hotkeys, Notifications...

│   ├── apps/              # FileExplorer, Notes, Gallery, Settings, Terminal...

│   ├── components/        # reusable UI (TaskbarButton, Window, ContextMenu...)

│   ├── styles/

│   │   ├── main.css       # global variables & base styles

│   │   ├── themes/        # dark.css, glass.css, light.css...

│   │   └── animations.css

│   └── main.js            # bootstrap & app registry

└── vendor/                # Preact, HTM, JSZip, idb-keyval, etc.
