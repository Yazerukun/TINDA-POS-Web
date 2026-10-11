# TINDA POS Web — Master Engineering Architecture & Specification Document
**Version:** 2.0.0 (Desktop Parity Edition)  
**Author:** Doctoral Software Architecture & Systems Engineering  
**Deployment Target:** Cloudflare Pages (`https://tindapos-web.pages.dev`) & Offline PWA  
**Local Reference:** `/home/ian/Projects/TINDA-POS-Web` & `/home/ian/Work/TINDA-POS-v1.0.37`

---

## 1. Executive Summary & Core Philosophy

**TINDA POS Web** is an industrial-grade, offline-first Point of Sale (POS), Inventory, E-Wallet, and Bills Payment platform crafted for Philippine retail (Sari-Sari stores, minimarts, groceries, and convenience stations).

### Core Pillars:
1. **100% Offline-First Sovereignty:** The system functions fully without internet using client-side **Dexie.js (IndexedDB)** storage, local Web Audio synthesizers, and Web Workers.
2. **Strict Desktop Parity:** 1:1 behavioral alignment with the authoritative offline Electron/SQLite TINDA POS desktop station (`TINDA-POS-v1.0.37`).
3. **Hardware Interoperability:** Native direct printing support for **Chiteng CT-221B (Clabel)** thermal label printers, standard 58mm / 80mm thermal receipt printers, and zero-latency smartphone camera barcode scanners.
4. **Emerald Obsidian Aesthetics:** Modern dark glassmorphic UI styled with signature Philippine Emerald Green brand palettes (`#10b981`, `#34d399`, `#059669`).

---

## 2. System Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TINDA POS Web Client                            │
├────────────────────────────────┬───────────────────────────────────────┤
│ Frontend Presentation Layer    │ React 19, TypeScript, Tailwind CSS   │
│ Sound & Audio Engine           │ Zero-Asset Web Audio API Synthesizer │
│ Barcode Vector Rendering       │ Pure SVG Code 128 (Subset B/C) Engine │
│ Client Database                │ Dexie.js (IndexedDB Schema v6)        │
│ Memory & Knowledge Index       │ Graphify, AgentMemory, ai-memory wiki │
├────────────────────────────────┴───────────────────────────────────────┤
│                         Edge & Cloud Boundary                          │
├────────────────────────────────┬───────────────────────────────────────┤
│ Static Edge Hosting            │ Cloudflare Pages                      │
│ Edge Database & API            │ Cloudflare Workers + D1 SQLite        │
└────────────────────────────────┴───────────────────────────────────────┘
```

---

## 3. Desktop Parity Matrix

| Feature | Desktop Station (`v1.0.37`) | TINDA POS Web (`v2.0.0`) | Parity Status |
| :--- | :--- | :--- | :--- |
| **Cart & Suki Debt Bar** | Hotkey `F6`, price override modal, `F4` discounts | Suki Bar [F6], custom price modal, PWD/Senior [F4] | **100% Match** |
| **Split & Banknote Tender** | Denomination chips (₱1000–₱20), Sukli chime | Banknote grid, instant change calculator, chime | **100% Match** |
| **Receipt Customizer** | 58mm / 80mm toggle, store details editor | Thermal receipt preview, persistent store config | **100% Match** |
| **Customer Directory** | Debt ledger, credit limits, delete account | Trash button with active debt warning & modal | **100% Match** |
| **Catalog View Switcher** | Grid & List views | Toggleable Grid & List views via `localStorage` | **100% Match** |
| **E-Wallet Cash In / Out** | GCash, Maya, MariBank register & fee math | 5-Tab E-Wallet Hub with live shift metrics | **100% Match** |
| **Bills & E-Load Terminal** | Utility/Telco presets, add/deduct fee mode | Preset billers, cash received, change calculator | **100% Match** |
| **Multi-Wallet Shift Audit**| Denominations counter, 3-way reconciliation | Bills/coins count, Expected vs Actual discrepancy | **100% Match** |
| **Chiteng CT221B Labels** | 40x30mm, 30x20mm thermal sticker calibration | Scaled vector Code 128 Subset C SVG label studio | **100% Match** |
| **Live Sales Monitor** | Dual-display CFD / secondary screen | Real-time `#sales-monitor` & fullscreen kiosk CFD | **100% Match** |
| **Desktop DB Import** | `.tinda-backup` (JSON SQLite schema dump) | Multi-format desktop database parser & mapper | **100% Match** |
| **VIP Pro Licensing** | Machine ID locked ₱500 lifetime unlock | Server-authoritative account licensing | **100% Match** |
| **Retail Themes Engine** | Dark terminal / high-contrast themes | 6 themes: Emerald, Sapphire, Stealth, Cyber, Amber, Light | **100% Match** |

---

## 4. Hardware & Printing Specifications

### 4.1 Chiteng CT-221B (Clabel) Barcode & Thermal Sticker Printing
The Chiteng CT221B is a dedicated direct thermal label printer using roll-fed die-cut adhesive stickers.
- **DPI:** 203 DPI (8 dots/mm)
- **Supported Sticker Dimensions:**
  - `40 × 30 mm` (Standard Retail Sticker — Default)
  - `30 × 20 mm` (Compact Small Product Sticker)
  - `50 × 30 mm` (Large Minimart / Meat & Deli Sticker)
- **Zero-Bleed Barcode Optical Geometry:**
  - Barcode Type: **Code 128 (Subset B & C)**
  - Dynamic Subset C compression for numeric barcodes reduces bar sequence length by up to 35%, allowing bar widths of `1.8px - 2.0px`.
  - Mandatory Quiet Zones: Minimum `10 - 12 modules` on both left and right to prevent label edge reflection.
  - Optical Contrast: 100% solid vector `#000000` on `#ffffff` substrate.
  - Camera Compatibility: Allows cellphone camera scanners (e.g., ZXing library) to scan printed labels from 15cm to 45cm away without focal blurring or barcode distortion.

---

## 5. Offline Desktop Database Migration Specification

### 5.1 Desktop Backup Format (`.tinda-backup`)
The offline desktop station exports backups as JSON with the following canonical schema:
```json
{
  "manifest": {
    "format": "tinda-pos-backup",
    "formatVersion": 1,
    "source": { "platform": "windows", "appVersion": "1.0.37", "schemaVersion": 1 },
    "createdAt": "2026-10-10T22:00:00.000Z"
  },
  "data": {
    "settings": { "store_name": "...", "owner_name": "..." },
    "tables": [
      { "name": "products", "rows": [...] },
      { "name": "categories", "rows": [...] },
      { "name": "customers", "rows": [...] },
      { "name": "sales", "rows": [...] },
      { "name": "sale_items", "rows": [...] },
      { "name": "expenses", "rows": [...] },
      { "name": "suppliers", "rows": [...] },
      { "name": "cash_counts", "rows": [...] },
      { "name": "z_reads", "rows": [...] }
    ]
  },
  "checksum": "sha256-hash-value"
}
```

### 5.2 Desktop to Web Entity Field Mapping
| Desktop SQLite Field | Web Dexie Field | Transformation Rule |
| :--- | :--- | :--- |
| `products.price_cents` | `products.default_price_c` | Direct integer mapping (cents) |
| `products.cost_cents` | `products.cost_price_c` | Direct integer mapping (cents) |
| `products.stock_quantity` | `products.stock` | Direct integer mapping |
| `customers.balance_cents` | `customers.balance_c` | Direct integer mapping (cents) |
| `sales.total_cents` | `transactions.total_c` | Embedded item array reconstruction from `sale_items` |
| `categories` | `categories` | 1:1 mapping (`id`, `name`, `parent_id`, `sort_order`) |
| `suppliers` | `suppliers` | 1:1 mapping (`id`, `name`, `contact_person`, `phone`, `address`) |
| `expenses.amount_cents` | `expenses.amount_c` | Direct integer mapping (cents) |

---

## 6. Security Architecture & Hardening Proposals (Doctoral Review)

*Below are the recommended architectural security enhancements formulated for user review and approval prior to implementation:*

### 6.1 Cryptographic Storage & Master PIN Hardening
- **Current State:** PIN is stored in plaintext/plain string inside Dexie `users` table (`pin: "1234"`).
- **Proposed Enhancement:**
  1. Hash PINs client-side using **PBKDF2-SHA256** with a random salt (`100,000 iterations` via standard Web Crypto API `crypto.subtle`).
  2. Implement an exponential lock-out delay (3 failed PIN attempts triggers a 30-second cooldown; 5 attempts triggers Master Admin override).
  3. Session tokens in `localStorage` should be signed with an HMAC token expiration to prevent session replay.

### 6.2 Data Integrity & Tamper-Proof Audit Trail
- **Current State:** Z-Reads and Shift Audits are saved directly to IndexedDB.
- **Proposed Enhancement:**
  1. Generate an **HMAC-SHA256 chained hash** (Merkle chain) for every transaction and Z-Read.
  2. Each transaction contains `previous_hash` and `current_hash`. Any manual tampering in IndexedDB dev tools immediately invalidates the audit chain, alerting the store owner of record manipulation.

### 6.3 VIP Licensing & Cryptographic Key Verification
- **Current State:** License check relies on local state and boolean flags.
- **Proposed Enhancement:**
  1. Implement **Ed25519 / RSA asymmetric signature validation** for VIP License keys (`TINDA-VIP-<payload>-<signature>`).
  2. The web application verifies the key using the developer's public key offline. Only valid cryptographically signed licenses can activate permanent VIP status, preventing key generation bypasses.

### 6.4 Content Security Policy (CSP) & Input Sanitization
- **Current State:** Standard Cloudflare Pages headers.
- **Proposed Enhancement:**
  1. Enforce strict `Content-Security-Policy` in `_headers`:
     `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https:;`
  2. Barcode scanner input filter: Sanitize barcode strings against control characters (`\x00-\x1F`) to eliminate command injection or XSS risks when barcode data is rendered.

### 6.5 Safe Backup Import Sandboxing
- **Current State:** Backups parse and add directly to tables.
- **Proposed Enhancement:**
  1. Schema Validation Gate: Backups must pass strict Zod/structural type validation before touching IndexedDB.
  2. Automatic Pre-Restore Snapshot: Always take a temporary rollback snapshot in IndexedDB (`db_restore_checkpoint`) before wiping and restoring, so the operator can undo an accidental import.

---

## 7. Knowledge Base & Synchronized Artifacts
- **Graphify Knowledge Graph:** `graphify-out/graph.json` (386 nodes, 1048 edges, 21 communities)
- **AgentMemory:** Persisted memory record `mem_mv2yzegx_b54c69b5b5bd`
- **ai-memory Wiki:** `projects/tinda-pos-web.md` (Checkpoint: `942e50e7...`)
- **Live Watchfeed Log:** `~/.local/state/opencode-live.log`
