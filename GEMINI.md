# Project Context & Powerhouse Directives (TINDA POS Web)

## Permanent Agent Directives
1. Proactively greet Boss at the start of every session: *"Boss, naa ba tay i-update sa atong project?"* and check project status from this `GEMINI.md`.
2. **Always Active Core Skills & MCPs**:
   - **`agentmemory` MCP**: Recall context on startup; save lessons, patterns, and release metadata.
   - **`headroom` MCP**: Optimize token budget and compress long contexts/logs.
   - **`council` (Council of High Intelligence)**: Automatically conduct multi-persona strategic & architectural deliberation on tough technical dilemmas or critical changes.
   - **`smart-ralph`**: Spec-driven plan, requirements, design, tasks, and test verification gates.
   - **`ponytail`**: Lazy senior dev - fewest lines, YAGNI, standard library, root-cause fixes.
   - **`apple-design`**: Apple design standard for all UI/UX (springs, 1:1 tracking, typography, materials).
3. **FULL YOLO MODE**: Proactively execute all terminal commands, code changes, tests, and builds without asking for permission. Deliver complete, working results immediately.
4. **Storage Constraint**:
   - **Drive C: has critically low space (< 4.6 GB)**.
   - **ZERO bytes must be written to Drive C:**.
   - All node modules, caches, builds, and development tools must stay strictly in **Drive D:** (`D:\TINDA-POS-Web`, `D:\DevTools\npm-cache`).

---

## Current Release Status (TINDA POS Web)
- **Version**: `v1.0.1` (Production Live)
- **Primary Live Short URL (Cloudflare Pages)**: [https://tindapos-web.pages.dev/](https://tindapos-web.pages.dev/)
- **Secondary Edge Mirror (Cloudflare Workers)**: [https://tindaposweb.yomikaze-md.workers.dev/](https://tindaposweb.yomikaze-md.workers.dev/)
- **GitHub Repository**: [https://github.com/Yazerukun/TINDA-POS-Web](https://github.com/Yazerukun/TINDA-POS-Web)
- **Local Dev Server**: `http://localhost:5173/` (Network: `http://192.168.27.67:5173/`)

---

## Architecture & Tech Stack
- **Framework**: React 19 (`react`, `react-dom`) + TypeScript
- **Bundler & Build**: Vite 8 with ESM code splitting
- **Styling**: Tailwind CSS 3.4 + Apple Design Standard (Obsidian glassmorphism, layered translucent backdrops, fluid spring physics)
- **Database**: 100% Offline Dexie IndexedDB v4 (`db/index.ts`)
- **Graphics & Icons**: Lucide React + Canvas Confetti
- **Image Processing**: Client-side canvas compressor (320×320px WebP, ~15KB per item)

---

## Key Features in v1.0.1
1. 🏛️ **Ultra-Luxury "Quiet Luxury" Redesign**:
   - **The Private Vault (Authentication & Shift Onboarding)**: Floating obsidian glass vault card, gold monogram, cashier selection, 4-digit hairline PIN pad with masked dot feedback, and Opening Register Balance float stepper (₱1,000, ₱2,000, ₱5,000, Custom).
   - **The Executive POS Counter**: Private Reserve v1.0 header with live metallic status pulse, active Concierge avatar, Quick Search with `[ ⌘K ]` shortcut listener, horizontal sliding gold category indicator line, razor-thin catalog product cards with soft inner shadows, client assignment selector (VIP / Utang accounts), editorial grand total centerpiece, quick tender gold chips (`[ Exact ]`, `[ ₱500 ]`, `[ ₱1,000 ]`, `[ Custom ]`), and brushed gold checkout authorization with champagne confetti.
2. 📸 **Dual Photo Mode**: Device Camera capture (`capture="environment"`) & Gallery photo upload with zero backend dependency.
3. ⚡ **Offline Canvas Compressor**: Prevents IndexedDB bloat by auto-downscaling to 320×320 WebP on the client before saving.
4. 🏷️ **PWD / Senior Citizen 20% Auto-Calc**: 1-tap statutory discount on active shopping cart items.
5. ⏸️ **Held Carts Queue**: Temporarily park active transactions and resume immediately when the customer returns.
6. 💳 **Utang / Credit Ledger**: Tracks customer debt, credit ceilings, and partial/full settlement payments.
7. 📊 **Executive Analytics**: Gross profit calculation, revenue statistics, audit log, and top-selling product leaderboard.
8. 💾 **Universal Parity**: Seamless `.tinda-backup` export and import compatible with TINDA POS Android APK (`v1.0.38`).

---

## Deployment & Build Workflows
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Deployment via Git**: Pushing commits to `main` automatically triggers Cloudflare Pages & Workers builds.
- **Manual CLI Deploy (Pages)**: `npx wrangler pages deploy dist --project-name tindapos-web`
- **Manual CLI Deploy (Workers)**: `npx wrangler deploy`
