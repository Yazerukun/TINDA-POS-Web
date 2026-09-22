<div align="center">

# 💎 TINDA POS Web v1.0.1
### "Millionaire-Grade" Offline-First Retail POS & Cloudflare Edge Web Platform

**Fast, 100% offline, sign-language & touch-friendly Point of Sale and Inventory System designed for Philippine sari-sari stores, retail counters, and minimarts on any browser (Desktop, iPad, Tablet, Mobile).**

[![Live Production](https://img.shields.io/badge/Live-tindaposweb.yomikaze--md.workers.dev-10B981?style=for-the-badge&logo=cloudflare&logoColor=white)](https://tindaposweb.yomikaze-md.workers.dev/)
[![Build Status](https://img.shields.io/badge/Build-Passing%20(Vite%208)-10B981?style=for-the-badge&logo=vite&logoColor=white)](#-building-and-deploying)
[![Database](https://img.shields.io/badge/Storage-100%25%20Offline%20(Dexie%20v4)-3B82F6?style=for-the-badge&logo=sqlite&logoColor=white)](#-offline-first-architecture)
[![License](https://img.shields.io/badge/License-Free%20for%20Small%20Business-8B5CF6?style=for-the-badge)](#-license)

> 🚀 **Live Production Link:** [https://tindaposweb.yomikaze-md.workers.dev/](https://tindaposweb.yomikaze-md.workers.dev/)

---

</div>

## 🏪 The Complete Retail Counter in Any Browser

**TINDA POS Web v1.0.1** brings enterprise-level retail point-of-sale functionality directly to any web browser. Engineered with the **Apple Design Standard**, it features deep obsidian aesthetics, layered glassmorphism, luminous emerald accents, and sub-16ms tactile responsiveness.

### 🌟 Key Highlights in v1.0.1:
* ⚡ **100% True Offline Operation**: Stored directly within your browser's persistent Dexie IndexedDB engine. No recurring monthly fees, no mandatory server connection, and zero internet data consumed during checkout.
* 📸 **Dual Photo Mode (Camera & Gallery)**: Easily attach product photos using your device camera or choose pictures directly from your files/gallery.
* 🚀 **Client-Side Canvas Auto-Compressor**: Automatically resizes high-resolution photos to 320×320px WebP (~15KB) on the device before saving, eliminating database bloat and guaranteeing buttery 60fps scrolling.
* 🏷️ **Senior Citizen & PWD 20% Auto-Discount**: 1-tap statutory discount recalculation on the active shopping cart.
* ⏸️ **Hold & Resume Cart Queue**: Temporarily park transactions when a customer forgets an item and resume instantly.
* 💳 **Customer Store Credit (*Utang*) Ledger**: Track customer balances, credit limits, and record partial/full payments.
* 📊 **Executive Analytics & Profit Dashboard**: Real-time sales totals, gross profit estimates, and top-selling products leaderboard.
* 💾 **Universal Backup Compatibility**: Export and import `.tinda-backup` files seamlessly interoperable with the TINDA POS Android app.

---

## 🚀 Quick Start (Local Development)

```bash
# 1. Navigate to project folder
cd D:\TINDA-POS-Web

# 2. Run local development server
npm run dev

# 3. Open browser at http://localhost:5173
```

---

## 🌐 Deploying to Cloudflare Pages

TINDA POS Web is pre-configured for instant zero-cost deployment on **Cloudflare Pages**:

### Option A: Direct Git Deployment (Recommended)
1. Push this repository to GitHub: `https://github.com/Yazerukun/TINDA-POS-Web`.
2. Open your [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
3. Select the `TINDA-POS-Web` repository.
4. Set Build Settings:
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
5. Click **Save and Deploy**. Cloudflare will automatically compile and provide you with a global edge URL (e.g. `https://tinda-pos-web.pages.dev`) with free SSL.

### Option B: Direct CLI Deployment via Wrangler
```bash
# Build the distribution bundle
npm run build

# Deploy directly using Wrangler
npx wrangler pages deploy dist --project-name tinda-pos-web
```

---

## 💻 Tech Stack
- **Framework:** React 19, TypeScript, Vite 8
- **Styling:** Tailwind CSS, Glassmorphism, CSS Backdrop Filters
- **Database:** Dexie.js (IndexedDB v4)
- **Icons & Delight:** Lucide React, Canvas Confetti
- **Edge CDN:** Cloudflare Pages

---

## 📄 License
Proprietary. **Free to use for personal and small retail businesses in the Philippines.**
