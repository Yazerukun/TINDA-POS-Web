# Requirements — pos-competitive-parity (Epic Charter)

## Executive Summary

This spec is an **epic charter**, not a feature spec (D5). TINDA POS Web is a strong offline-first retail POS (Cloudflare Pages, React 19 + TypeScript, Dexie/IndexedDB) that currently lacks the kitchen, online-ordering, loyalty, printing, and multi-outlet capabilities competitors (Aronium, Loyverse, Vertex) offer. This epic closes those gaps in seven sequential phases — KDS and kitchen tickets first, then branded storefront + QR order/pay, unified loyalty/promotions, ESC/POS receipt printing, customer display, multi-outlet/roles, and finally offline UX polish with X/Z reports — rebuilding reference-led UX patterns in TINDA's own obsidian-and-gold design language, with no competitor branding, imagery, exact-layout copying, or source-code lifting. A triage phase immediately following this charter splits the epic into one child spec per phase; every child spec must be independently implementable and verifiable.

## Epic Goal

Achieve feature parity with — and superiority over — the strongest capabilities found in Aronium Lite, Loyverse, and Vertex (per `research.md` gap analysis), without compromising TINDA's hard offline-first architecture, its design identity, or its small-business positioning. Each phase delivers a complete, shippable capability that survives without network where physically possible (local features) and degrades gracefully where network is inherently required (online storefront).

## Phase Sequence

Ordered per approved decision D4. Each phase becomes one child spec via triage; a phase's exit criteria are also its child spec's release gate.

| Phase | Scope | Exit Criteria |
|---|---|---|
| 1 | KDS + kitchen tickets: kitchen stations, tickets from POS orders, status flow (new → preparing → ready → served), station routing, item notes, timers + color-coded overdue alerts, sound/visual notification, fullscreen touch UI | Tickets appear on KDS within ~1s of order placement (local broadcast); status transitions persist in Dexie and survive reload; timers/alerts verifiable with a seeded order |
| 2 | Branded online storefront + QR order/pay: public menu/catalog view, guest cart, pickup/delivery/table-QR ordering, order channel flag, pay-online or pay-at-counter, order status tracking; brand configurable via settings (logo, name, colors from TINDA tokens) | A QR code resolves to the storefront; a guest order lands in the POS order flow with channel=online; offline POS checkout remains unaffected |
| 3 | Loyalty + promotions (unified engine, see Loyalty Model below): points earning/redemption, coupon codes, promotion rules (BOGO, %, fixed amount, min-qty, time-based), integration with existing SC/PWD discounts and utang ledger | Points accrue and redeem against a sale; a coupon/promotion applies deterministically with a visible breakdown; rules engine unit-testable without UI |
| 4 | ESC/POS receipt printing (58/80mm): printer profiles (USB/serial/network via WebUSB/WebSerial where supported, print-template fallback), receipt layout per reference (header → items → discounts/tax → payments → change → footer), cut/feed/logo/barcode commands, browser-support fallback UX | A test receipt prints correctly on at least one real or emulated 58mm and one 80mm device; unsupported browsers get a clear fallback path |
| 5 | Customer display (second screen): mirrored cart/total view on a second window/screen, BroadcastChannel/WebSocket sync, display templates (scanning, line items, running total, payment/ads state), high-contrast minimal layout | Second window opens and live-mirrors cart mutations; state survives reload; single-screen mode unaffected |
| 6 | Multi-outlet / roles: outlets, per-outlet users/roles, granular ACL (sale, void/refund, discount override, reports, stock, settings), outlet switcher, per-outlet + consolidated reporting | Two seeded outlets isolate data and permissions correctly; a restricted role is blocked at both UI and domain layers |
| 7 | Offline UX polish + X/Z reports: network-awareness UX (session state, sync indicators, network-blind flows), business-day open/close checklist, X (mid-day) and Z (close-day) reports by payment type/discounts/voids/refunds, alignment with existing cash_counts and z_reads | Z-report totals reconcile against seeded sales; offline session survives airplane-mode full checkout cycle; parity checklist from research gap table closed |

## Epic Acceptance Criteria

Every child spec inherits these; a phase cannot exit unless its implementation satisfies all of them.

1. **Offline-first:** any locally-possible feature (all phases except the network-dependent storefront serving of Phase 2) must function with the network disconnected; data persists in Dexie and survives reload.
2. **Backward-compatible data:** schema changes are additive Dexie version upgrades; existing `.tinda-backup` export/import from prior versions keeps working (or a documented, tested migration is provided).
3. **Design language:** all UI uses TINDA's existing tokens/theme (obsidian + champagne gold, existing typography and spacing scale); no competitor branding, imagery, proprietary text, or exact-layout copying (reference-led rebuild only).
4. **No lifted source:** Aronium RE findings are structural/behavioral references only; no competitor code, binary fragments, or decompiled artifacts are copied into the repo.
5. **Independently implementable & verifiable:** each child spec delivers its phase with its own tests/verification, without requiring later phases, and without breaking prior phases (regression check against existing checkout flow).
6. **Money-path correctness:** cents-based pricing end-to-end; any discount/loyalty/print calculation is deterministic, unit-tested, and reconciles exactly in Z-reports.
7. **Accessibility/touch parity:** keyboard reachable and touch-friendly at existing breakpoints (768/1024/1440px), consistent with current POS UX.
8. **Citations:** each child spec cites the relevant `research.md` sections as evidence; no new ungrounded competitor claims.

## Cross-Cutting Constraints

- **Stack:** Cloudflare Pages (static/edge) + Vite + React 19 + TypeScript + Dexie v4 (IndexedDB). Server-dependent capabilities (e.g., public storefront hosting, payment webhooks) use Cloudflare Workers; no new backend framework, no Node server requirement.
- **Offline-first is a hard constraint:** checkout must work with zero network. Cross-window features (KDS, customer display) use BroadcastChannel/local Dexie change propagation first; network sync only as additive enhancement.
- **Design language:** TINDA theme/tokens only — no competitor branding, imagery, or exact-layout copying; structural patterns (ticket panel, receipt field order, status flows) may be adopted per research.md design-pattern references.
- **RE/legal note:** Aronium RE findings are evidence for feature structure and behavior only (D3/reference-led rebuild). No source-code lifting, no decompiled code, no copied assets. Competitor names appear only in specs as evidence citations.
- **Backup compatibility:** `.tinda-backup` interop with the Android app is preserved or explicitly migrated per the backward-compatibility criterion.
- **Child-spec independence:** each child spec must be independently implementable and verifiable (D5).

## Loyalty Model (Epic Level)

Per approved decision D6, TINDA uses a **unified loyalty engine** combining two competitor models:

1. **Loyverse-style points:** customers earn points on purchases (configurable rate, cents-based accrual), redeemable against future sales; points have clear balance, redemption caps, and (optionally) expiry.
2. **Vertex-style coupons/promotion rules:** rule-driven promotions — BOGO, percentage/fixed discounts, minimum-quantity, time-window — plus single-use/multi-use coupon codes, composable with (and precedence-tested against) existing SC/PWD statutory discounts and utang payments.

This charter defines only the model shape; **the loyalty child spec (Phase 3) owns the detailed requirements** (rounding, precedence, expiry, per-item vs per-document application, reporting hooks).

## Out of Scope

Explicitly excluded from this epic (may become future specs):

- Third-party delivery/marketplace integrations (Grab, DoorDash, Uber Eats) — research recommends internal channel tracking first; provider adapters deferred.
- Fiscal printer integration (region-specific BIR/domestic fiscalization) — separate regional compliance effort.
- Vertex-style HRM, accounting, gift cards, blog/WhatsApp ordering modules.
- Recipe/production management and purchase-order automation.
- Any migration off Cloudflare Pages / Dexie, or native (non-browser) POS shell.

## Child Spec Seeds

One child spec per phase, to be created by the triage phase; each seed names its working title and the questions its requirements must answer.

**Phase 1 — "KDS & Kitchen Tickets":** station schema and routing model; ticket lifecycle state machine; local realtime propagation (BroadcastChannel/Dexie); timer/overdue thresholds and alert UX; offline-only feasibility; interaction with hold/resume and voids.

**Phase 2 — "Branded Storefront & QR Order & Pay":** public surface hosting on Cloudflare (Workers/Pages); brand token extraction from settings; guest cart and order channel schema; QR generation per table/service-type; payment capture strategy (online vs pay-at-counter) and reconciliation into POS sales; security of the public endpoint.

**Phase 3 — "Unified Loyalty & Promotions Engine":** points accrual/redemption rules and rounding; coupon code model (single/multi-use, expiry); promotion rule types, stacking and precedence vs SC/PWD/utang; engine API surface (testable without UI); reporting hooks into Z-reports.

**Phase 4 — "ESC/POS Thermal Receipt Printing":** browser transport matrix (WebUSB/WebSerial/network) and fallback print template; printer profile settings; receipt layout spec (field order per reference); command set (cut, feed, barcode, codepage, logo); device-test verification plan.

**Phase 5 — "Customer Display (Second Screen)":** second-window architecture and sync channel; display template states; performance on low-end tablets; single-screen degradation; pairing/discovery UX.

**Phase 6 — "Multi-Outlet & Roles/Permissions":** outlet schema and data scoping; user→outlet→role ACL model and enforcement points (UI + domain); outlet switcher UX; per-outlet vs consolidated reports; backup/migration of single-outlet data into multi-outlet schema.

**Phase 7 — "Offline UX Polish & X/Z Reports":** network-awareness indicators and session-state UX; business-day open/close checklist; X-report (mid-day) and Z-report (close-day) content and reconciliation with cash_counts/z_reads; gap-table closure verification.

## Open Questions

1. Payment capture for online orders (Phase 2): which payment rails are viable for PH small businesses (e.g., GCash/Maya/Stripe), and what is the offline-adjacent reconciliation model? To be resolved in the Phase 2 child spec.
2. ESC/POS browser support reality (research limitation): confirm WebUSB/WebSerial feasibility vs a local HTTP print bridge on target hardware before finalizing Phase 4 approach.
3. KDS multi-station routing scale: single-store stations vs per-outlet stations — Phase 6 multi-outlet may affect Phase 1 schema; triage should sequence or future-proof the stations schema accordingly.
4. Loyalty points expiry defaults and rounding rules — to be set in the Phase 3 child spec with operator input.
5. Customer display hardware target (tablet? second browser? dedicated display?) — Phase 5 child spec should verify on real devices.
