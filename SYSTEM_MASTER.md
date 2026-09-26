# SYSTEM_MASTER.md — TINDA POS Web Architecture
> **STATUS**: LIVING MASTER DOCUMENT | **STRICT ARCHITECTURE BLUEPRINT**
> GitHub: `Yazerukun/TINDA-POS-Web` | Cloudflare Pages + Dexie v4 + Edge Platform

---

## 1. System Identity & North Star
* **Core Purpose:** Luxury-tier, ONLINE web POS & retail management platform accessible worldwide from any modern browser (Desktop, Tablet, Mobile) hosted on Cloudflare Pages & Workers.
* **Non-Negotiable Invariants:**
  - **Online Cloudflare Edge Platform:** Fully hosted and live on Cloudflare Pages (`tindapos-web.pages.dev`) with Cloudflare D1 database sync.
  - **Cross-Device Cloud Access:** Users can access the web application anytime online via HTTPS without installing APKs or setup installers.
  - **Sub-16ms Tactile Response:** Ultra-smooth transitions, zero UI lag during high-frequency barcode scanning and cart operations.
  - **Client-Side High Performance:** Dexie v4 / IndexedDB serves as high-speed client-side local cache and responsive state manager syncing seamlessly with Cloudflare D1.

---

## 2. Tech Stack & Environment Locks
| Layer | Technology | Version / Rule |
| :--- | :--- | :--- |
| **Frontend Web** | React 19 + TypeScript + Vite 8 | Modern browser SPA, Tailwind CSS v3 |
| **Cloud Hosting** | Cloudflare Pages & Workers | Global edge CDN (`tindapos-web.pages.dev`) |
| **Cloud Database / API** | Cloudflare D1 + Pages Functions | Serverless Edge API for cross-device accounts & sync |
| **Client Storage & Cache** | Dexie.js 4.4+ (IndexedDB) | Reactive live queries, fast local state caching |
| **Barcode Engine** | `@zxing/browser` + camera stream | Instant camera scanning & USB HID barcode support |

---

## 3. Data Schema & Core Stores
* **`products`**: `id`, `barcode`, `name`, `cost_price`, `selling_price`, `stock_qty`, `category`
* **`transactions`**: `id`, `receipt_number`, `created_at`, `items[]`, `total_amount`, `tendered`, `change`
* **`customers`**: `id`, `name`, `phone`, `total_credit_balance`, `notes`
* **`audit_log`**: `id`, `timestamp`, `action`, `actor`, `details`

---

## 4. Business Logic Guardrails
1. **Barcode Scanning:** Support rapid continuous scanning without debounce race conditions on the cart state.
2. **Offline-to-Cloud Sync:** When syncing with Cloudflare D1/KV, local IndexedDB always acts as the immediate write master; sync happens asynchronously in the background.
3. **Receipt Formats:** Clean 58mm and 80mm ESC/POS compatible thermal print layouts.
4. **Cart Quantity Editing:** Cashiers can adjust item quantity via micro-steppers `[-]/[+]` or type directly into the interactive numeric input (`CartQuantityInput`) with automatic stock clamping.

---

## 5. Verification & Definition of Done
```bash
npm run build      # Must pass typecheck & vite build
npm run preview    # Verify production asset bundling
```

---

## 6. Forbidden Actions
1. ❌ Never break Cloudflare Pages edge build or introduce Node.js server-only runtime dependencies into client bundle.
2. ❌ Never bypass Dexie transaction wrappers during financial checkouts.
3. ❌ Never alter the signature obsidian / champagne gold design guidelines without design review.
