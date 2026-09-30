# Dynamic Planner

A modular, privacy-first, and offline-capable time-blocking system built with **SvelteKit**, **TypeScript**, **Tailwind CSS**, and **Dexie (IndexedDB)**.

Inspired by the local-first philosophy of tools like Obsidian, **Dynamic Planner** keeps all your data strictly on your device with zero cloud tracking, zero telemetry, and an air-gapped design.

---

## ✨ Features

- **Local-First & Private (Obsidian-Style):** 100% of your data lives in your browser's IndexedDB. No accounts, no external servers, no tracking, and strict Content Security Policy (CSP) blocking unauthorized outbound network traffic.
- **Modular Time-Blocking:** Assemble custom routines from a catalog of reusable activities and day templates ("Focus Day", "Rest Day", etc.) with single-click scheduling.
- **Weekly Drag & Drop Board:** Fluidly move time blocks between days using `@this-is-solved/svelte-dnd-action`.
- **Minimalist Aesthetic:** Compact block cards with clean tabular number typography and a smooth, GPU-accelerated hover action tab (complete, edit, delete).
- **High-Definition Graphic Export:** Snapshot and export your daily or weekly schedule as clean PNG, JPEG, or WebP images (1x or 2x Retina) with automatic exclusion of UI controls (`.no-export`).
- **Data Portability:** Full backup and restore via standard local JSON files.
- **PWA & Offline Ready:** Pre-cached static application assets via Vite PWA and Workbox for reliable offline usage.
- **Customizable Appearance:** Light / Dark mode toggle and switchable block styling (left border vs. full tint).

---

## 🛠️ Tech Stack

- **Framework:** SvelteKit (Svelte 5 with Runes) + TypeScript
- **Styling:** Tailwind CSS v4
- **Database:** IndexedDB via [Dexie.js](https://dexie.org/)
- **Icons:** [Lucide Svelte](https://lucide.dev/)
- **Drag & Drop:** `svelte-dnd-action`
- **Image Export:** `html-to-image`
- **PWA:** `@vite-pwa/sveltekit`
- **Package Manager:** `pnpm`

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (>= 18.0.0)
- [pnpm](https://pnpm.io/) (>= 9.0.0, recommended `pnpm@11.3.0` or later)

### Installation

Clone the repository and install dependencies using `pnpm`:

```sh
pnpm install
```

### Development

Start the local development server:

```sh
pnpm dev

# Or start and open directly in your browser:
pnpm dev -- --open
```

### Type Checking & Diagnostics

Run Svelte and TypeScript diagnostics:

```sh
pnpm check
```

### Production Build

Compile the production SPA static build:

```sh
pnpm build
```

Preview the production build locally:

```sh
pnpm preview
```

---

## 🔒 Privacy & Architecture

1. **Zero External Requests:** No fonts from Google CDN, no remote scripts, and no analytics SDKs.
2. **Strict Content Security Policy (CSP):** The application enforces `connect-src 'self' ws: wss:;` and `no-referrer` to ensure that no personal schedule data can ever be transmitted to external endpoints.
3. **Local JSON Backup:** To transfer schedules across browsers or devices, use the **Export JSON** and **Import JSON** utilities in the Settings modal or weekly navigation bar.

---

## 📄 License

MIT
