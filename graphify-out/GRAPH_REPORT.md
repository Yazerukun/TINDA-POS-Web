# Graph Report - TINDA-POS-Web  (2026-10-23)

## Corpus Check
- 119 files · ~401,434 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: (none) 6, .csv 2, .css 2)

## Summary
- 768 nodes · 1881 edges · 38 communities (30 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `82ddb7a1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.tsx
- money
- types.ts
- react
- auth.ts
- cloudSync.ts
- TerminalToolsModal.tsx
- compilerOptions
- package.json
- .surgical_fix.js
- devDependencies
- dependencies
- RewardedAdModal.tsx
- hash-pins.mjs
- vite.config.ts
- api-test.sh
- scripts
- prices.ts
- api/paymongo.ts
- 🛒 1. Basic Necessities (Pangunahing Pangangailangan)
- 3. Bawat Araw — Cashier
- TINDA POS Web — Master Engineering Architecture & Specification Document
- 💎 TINDA POS Web v1.2.0
- 00 — Reference: MobiVPN Rewarded-Ad / Token / Expiry Architecture
- tools
- EwalletScreen.tsx
- Architectural Decisions & Changelog
- Requirements — pos-competitive-parity (Epic Charter)
- stream.ts
- research.md
- Progress — pos-competitive-parity
- pos-competitive-parity (epic)
- OPENCODE IDENTITY & ARCHITECTURAL DIRECTIVES (TINDA POS WEB)
- Project Context & Powerhouse Directives (TINDA POS Web)
- SYSTEM_MASTER.md — TINDA POS Web Architecture

## God Nodes (most connected - your core abstractions)
1. `react` - 56 edges
2. `lucide-react` - 50 edges
3. `money()` - 46 edges
4. `App()` - 43 edges
5. `Product` - 33 edges
6. `db` - 28 edges
7. `playScanSuccess()` - 25 edges
8. `Transaction` - 25 edges
9. `POSScreen()` - 22 edges
10. `toastSuccess()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `Key Features in v1.2.0` --references--> `playJeepneyHorn()`  [INFERRED]
  GEMINI.md → src/lib/sound.ts
- `4. Business Logic Guardrails` --references--> `CartQuantityInput()`  [INFERRED]
  SYSTEM_MASTER.md → src/components/POSScreen.tsx
- `What exists (files)` --references--> `useProAccess()`  [INFERRED]
  specs/rewarded-ads/01-CURRENT-STATE-TINDAPOS-Web.md → src/services/proAccess.ts
- `Files to touch` --references--> `ProAccessState`  [INFERRED]
  specs/rewarded-ads/02-IMPLEMENT-BRIEF.md → src/types.ts
- `BatchInItem` --references--> `Product`  [EXTRACTED]
  src/components/InventoryScreen.tsx → src/types.ts

## Import Cycles
- None detected.

## Communities (38 total, 8 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.06
Nodes (73): App(), AiAssistantModal(), AppLogo(), AppLogoProps, BackupScreen(), BackupScreenProps, CustomersScreen(), DashboardScreen() (+65 more)

### Community 1 - "money"
Cohesion: 0.06
Nodes (58): @zxing/browser, BarcodeScannerModal(), BarcodeScannerModalProps, hasNativeBarcodeDetector(), NATIVE_FORMATS, CheckoutModal(), CyberStreetScene(), CyberStreetSceneProps (+50 more)

### Community 2 - "types.ts"
Cohesion: 0.06
Nodes (69): AnalyticsScreen(), AnalyticsScreenProps, AnalyticsTab, DENOMINATIONS, CheckoutModalProps, CustomersScreenProps, DashboardScreenProps, ExpensesScreenProps (+61 more)

### Community 3 - "react"
Cohesion: 0.05
Nodes (73): lucide-react, react, AiAssistantModalProps, ChatMessage, PRESET_QUERIES, CASH_DENOMINATIONS, CashierCalculatorModal(), CashierCalculatorModalProps (+65 more)

### Community 4 - "auth.ts"
Cohesion: 0.12
Nodes (40): onRequestPost(), onRequestPost(), onRequestGet(), onRequestPost(), onRequestGet(), onRequestPost(), b64url(), enc (+32 more)

### Community 5 - "cloudSync.ts"
Cohesion: 0.08
Nodes (37): 01 — Current State: TINDA POS Web rewarded-ad system, Gaps (vs. the MobiVPN reference), The user story today, What exists (files), What this means, 02 — Implement Brief: Server-Enforced Rewarded-Ad Time (TINDA POS Web), Acceptance checklist (run before calling done), Anti-spoof rules (+29 more)

### Community 6 - "TerminalToolsModal.tsx"
Cohesion: 0.14
Nodes (13): react-dom, ErrorBoundary, Props, State, TerminalToolsModal(), TerminalToolsModalProps, fetchRecentSentryEvents(), getActiveDsn() (+5 more)

### Community 7 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowJs, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+8 more)

### Community 8 - "package.json"
Cohesion: 0.10
Nodes (19): allowScripts, esbuild@0.28.1, name, private, type, version, autoprefixer, clsx (+11 more)

### Community 9 - ".surgical_fix.js"
Cohesion: 0.15
Nodes (8): fs, ds, fs, handlers, hasVaultLabel, navFixed, navs, vamN

### Community 10 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, autoprefixer, postcss, tailwindcss, @types/canvas-confetti, @types/react, @types/react-dom, typescript (+3 more)

### Community 11 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, canvas-confetti, clsx, dexie, lucide-react, react, react-dom, @sentry/react (+3 more)

### Community 12 - "RewardedAdModal.tsx"
Cohesion: 0.31
Nodes (7): canvas-confetti, MONETAG_DIRECT_LINKS, RewardedAdModal(), RewardedAdModalProps, AdBlockerStatus, detectAdBlocker(), useAdBlocker()

### Community 13 - "hash-pins.mjs"
Cohesion: 0.22
Nodes (3): APPLY, left, rows

### Community 15 - "api-test.sh"
Cohesion: 0.90
Nodes (4): bad(), check(), ok(), api-test.sh script

### Community 16 - "scripts"
Cohesion: 0.50
Nodes (4): scripts, build, dev, preview

### Community 19 - "🛒 1. Basic Necessities (Pangunahing Pangangailangan)"
Cohesion: 0.10
Nodes (19): 🛒 1. Basic Necessities (Pangunahing Pangangailangan), 🥫 2. Prime Commodities (Pangunahing Kalakal), A. Canned Meat (Corned Beef, Meat Loaf, Beef Loaf), A. Canned Sardines in Tomato Sauce (155g), B. Condiments (Suka, Toyo, Patis), B. Processed Milk (Evaporated, Condensed, Powdered), C. Coffee (3-in-1 Original & Refill Packs), C. Toilet Soap (Sabong Panligo) (+11 more)

### Community 22 - "3. Bawat Araw — Cashier"
Cohesion: 0.07
Nodes (27): 1. Mga Role (Anong kaya ng bawat isa), 2.1 Gumawa ng account, 2.2 I-set up ang store, 2. Araw-araw na Daloy (Unang Araw), 3.1 Simulan ang shift (Opening Float), 3.2 Pagbebenta, 3.3 Checkout — pagtanggap ng bayad, 3.4 Restock (Magdagdag ng stock) (+19 more)

### Community 23 - "TINDA POS Web — Master Engineering Architecture & Specification Document"
Cohesion: 0.11
Nodes (17): 1. Executive Summary & Core Philosophy, 2. System Architecture & Tech Stack, 3. Desktop Parity Matrix, 4.1 Chiteng CT-221B (Clabel) Barcode & Thermal Sticker Printing, 4. Hardware & Printing Specifications, 5.1 Desktop Backup Format (`.tinda-backup`), 5.2 Desktop to Web Entity Field Mapping, 5. Offline Desktop Database Migration Specification (+9 more)

### Community 24 - "💎 TINDA POS Web v1.2.0"
Cohesion: 0.18
Nodes (10): 🌐 Deploying to Cloudflare Pages, 🌟 Key Highlights:, 📄 License, "Millionaire-Grade" Offline-First Retail POS & Cloudflare Edge Web Platform, Option A: Direct Git Deployment (Recommended), Option B: Direct CLI Deployment via Wrangler, 🚀 Quick Start (Local Development), 💻 Tech Stack (+2 more)

### Community 25 - "00 — Reference: MobiVPN Rewarded-Ad / Token / Expiry Architecture"
Cohesion: 0.22
Nodes (8): 00 — Reference: MobiVPN Rewarded-Ad / Token / Expiry Architecture, Ad money side (for reference only), Integrity model, Lessons for a WEB build, Local state keys (prefs), Server endpoints (base `https://www.juanscript.codes/api/`), The loop (what Ian wants to copy), Verified response fields (class `defpackage/ij1.java`)

### Community 26 - "tools"
Cohesion: 0.14
Nodes (13): agent, yuki, default_agent, instructions, $schema, bash, changed-files, edit (+5 more)

### Community 27 - "EwalletScreen.tsx"
Cohesion: 0.11
Nodes (25): BillCategory, BILLER_PRESETS, BillTransaction, calculateStandardFee(), CASH_COUNT_DENOMINATIONS, CashCountDenomination, DEFAULT_FLOAT_BALANCES, EwalletAuditRecord (+17 more)

### Community 28 - "Architectural Decisions & Changelog"
Cohesion: 0.40
Nodes (4): 2026-09-24: Account Sign-Up, Locked-by-Default (00:00:00), 30s Cooldown & Direct Ad Onboarding, 2026-09-24: Master Platform Admin (`skorts188@gmail.com`), Zero-Ads Bypass & Store Hierarchy Control Panel, Architectural Decisions & Changelog, IMPLEMENT.md — TINDA POS Web Engineering Log

### Community 29 - "Requirements — pos-competitive-parity (Epic Charter)"
Cohesion: 0.18
Nodes (10): Child Spec Seeds, Cross-Cutting Constraints, Epic Acceptance Criteria, Epic Goal, Executive Summary, Loyalty Model (Epic Level), Open Questions, Out of Scope (+2 more)

### Community 31 - "research.md"
Cohesion: 0.18
Nodes (10): Aronium RE Findings (evidence-backed), Design Pattern References (D3: structural, no copy), Executive Summary, Gap Analysis, Gap-Ranked Feature Recommendations, Limitations & Open Questions, Loyverse Profile (web), Methodology & Evidence (+2 more)

### Community 32 - "Progress — pos-competitive-parity"
Cohesion: 0.20
Nodes (9): Approved decisions (requirements interview iv-req-4ea90fc1), Blockers, Current phase, Epic constraints carried forward, Goal, Learnings, Next step, Progress — pos-competitive-parity (+1 more)

### Community 34 - "OPENCODE IDENTITY & ARCHITECTURAL DIRECTIVES (TINDA POS WEB)"
Cohesion: 0.40
Nodes (4): 1. IDENTITY & SUPREME COMMAND, 2. THE 5 CORE SUPERPOWERS, 3. PROJECT ANCHOR: TINDA POS WEB, OPENCODE IDENTITY & ARCHITECTURAL DIRECTIVES (TINDA POS WEB)

### Community 35 - "Project Context & Powerhouse Directives (TINDA POS Web)"
Cohesion: 0.25
Nodes (7): Architecture & Tech Stack, Current Release Status (TINDA POS Web), Deployment & Build Workflows, Key Features in v1.2.0, Permanent Agent Directives, Project Context & Powerhouse Directives (TINDA POS Web), 📌 Session Checkpoint & Continuation State (Ready for Tomorrow)

### Community 36 - "SYSTEM_MASTER.md — TINDA POS Web Architecture"
Cohesion: 0.25
Nodes (7): 1. System Identity & North Star, 2. Tech Stack & Environment Locks, 3. Data Schema & Core Stores, 4. Business Logic Guardrails, 5. Verification & Definition of Done, 6. Forbidden Actions, SYSTEM_MASTER.md — TINDA POS Web Architecture

## Knowledge Gaps
- **10 isolated node(s):** `@zxing/library`, `clsx`, `tailwind-merge`, `@types/canvas-confetti`, `@types/react` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 350 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `App.tsx`, `money`, `types.ts`, `cloudSync.ts`, `TerminalToolsModal.tsx`, `package.json`, `RewardedAdModal.tsx`, `EwalletScreen.tsx`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **What connects `@zxing/library`, `clsx`, `tailwind-merge` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06148088746324512 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `react` to `App.tsx`, `money`, `types.ts`, `cloudSync.ts`, `TerminalToolsModal.tsx`, `package.json`, `RewardedAdModal.tsx`, `EwalletScreen.tsx`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Should `money` be split into smaller, more focused modules?**
  _Cohesion score 0.06169772256728778 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.060917343526039176 - nodes in this community are weakly interconnected._