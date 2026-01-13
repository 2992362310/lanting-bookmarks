# 兰亭书签

一款基于 Tauri + Vue 3 的本地优先书签管理器。

## 🛠 Tech Stack

- **Core**: [Tauri](https://tauri.app/) (Rust + Webview)
- **Frontend**: Vue 3 (Composition API) + TypeScript
- **Build Tool**: Vite
- **State Management**: Pinia
- **UI Framework**: Tailwind CSS + DaisyUI
- **Persistence**: `tauri-plugin-store`

## 🚀 Development

### Prerequisites

- Node.js (v18+)
- Rust (Latest Stable)
- pnpm

### Getting Started

```bash
# Install dependencies
pnpm install

# Start development server (Web mode)
pnpm vite

# Start desktop application (Tauri mode)
pnpm tauri dev
```

### Build

```bash
# Production build
pnpm tauri build
```

## 📂 Documentation

- [Feature Design & Spec](docs/design_doc.md)
