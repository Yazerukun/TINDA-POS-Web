## Executive Summary

TINDA POS Web (Cloudflare Pages, Dexie IndexedDB, React 19 + TypeScript) is already strong offline-first retail POS. Competitors: Aronium Lite (Windows WPF/.NET 4.7.1) excels at modular POS with receipts/printers, discounts/promotions, users/permissions, taxes, documents (invoices/refunds), and fiscal/receipt printing. Loyverse (cross-platform mobile POS) emphasizes easy onboarding, loyalty, employee roles, multi-store, offline resilient workflows. Vertex (SaaS/web) emphasizes branded online ordering, QR ordering/pay, KDS routing/timers, multi-outlet, HRM, accounting, coupons.

Gap to close (priority): offline-first resilience parity/UX polish (session state, network-blind flows), KDS integration + kitchen tickets, branded online storefront + QR order/pay, franchise/multi-outlet controls, receipt/thermal printer drivers (ESC/POS + 58/80mm), stock/expiry (where applicable), customer display (Aronium has customer display module), loyalty/promotions unification, Z/X reports alignment.

## Methodology & Evidence

1. REA (6.5.0, GHIDRA 12.1.4) static inspection of installed Aronium Lite assemblies (from Inno Setup 6.5.2 installer extracted via 7zz+innoextract). Collected: types, user strings, SQL migrations (76 Lite migrations), workflows (26 .wf), modules list.
2. Public web: Loyverse (loyverse.com, help.loyverse.com, developer.loyverse.com), Vertex (vertexpos.tech) surface scan.
3. Repo read: MASTER_DOCUMENT.md, SYSTEM_MASTER.md, README.md, specs/ rewarded-ads, graphify-out.
4. ai-memory: attempted to recall parity pages; current session scope used repo files.

## Aronium RE Findings (evidence-backed)

Evidence sources: /tmp/aronium/wineprefix/drive_c/aronium; REA member/type/string inventories in /tmp/aronium/re/*.json. Findings:
- Platform: WPF/.NET 4.7.1, SQLite (System.Data.SQLite), modular: Aronium.Pos.Core, ViewModels, Presentation, Facade, Data.SQLite, many Modules/* (Users, Reports, Loyalty, Barcode, ReceiptPrinter, Takeaway, NamedOrder, CustomerDisplay, FiscalPrinter, PriceLists, Export, Email, etc.), Workflows/*.wf (Document.Create/Update/Delete, Order.Item.Add/Quantity, Payment, Refund, Void, BusinessDay.Close, Bootstrap, Authorization).
- Data model (Core Models): Document, DocumentItem, DocumentType, Order, OrderItem, Payment, PaymentType, Product, ProductGroup, Customer, Discount, Tax, StockItem/StockHistory, User, CashRegister, FloorPlan/Table, ZReport, StartingCash, Company, BankAccount. Enums: DocumentSource, PaidStatus, DiscountType/ApplyRule, PriceType, ServiceType.
- Documents & accounting: Supports invoices/refunds/proformas/loss/damage; tax handling (Tax table, DocumentItemTax), discounts per item/document, rounding adjustments, due dates, payments split.
- Sales flow: Order→Payment→Receipt; configurable payment types (quick keys), void/refund with reasons, cash drawer integration (CashDrawerPlugin), receipt templates, ESC/POS handlers (POS58/80, RTL variants), A4, template-based receipts.
- Printing: IPrinter/IPrinterProvider, PosPrinterSettings (margins, font size, codepage/charset, logo full width, barcode print), ReceiptPrinter module has EscPosReceiptPrinterHandler, POS58/80 handlers. Supports customer display (CustomerDisplay module: templates, customer display type, advertisement position).
- Promotions/loyalty: Loyalty module + Promotions (LoyaltyCard, Promotion, PromotionItem, promotion conditions/types). FeatureAccessManagement for gating features.
- Users/roles & security: Users module, Authorization workflow, SecurityKeyProvider, FeatureGate.
- Stock/inventory: StockItem, StockHistory, StockControl modules, migrations add stock tables/indexes, barcode module.
- Fiscal integration: FiscalPrinter module (tasks: close fiscal day, print daily/items/payments reports, programme fiscal items). GenericFiscalPrinterProvider.
- API/interop: ApiClient exists; Realm.dll has licensing/subscriptions models (License, Subscription, AccessToken) — not directly relevant to parity feature set for on-prem/offline web; note for commercial context only.
- Migrations show schema evolution (tax refactor, document/item fields, discounts, promotions, printer settings). Evidence: migrations/Lite/*.sql.

Limitations: installer newer Inno (6.5.2) blocked innoextract-1.9; analyzed installed files + REA JSON.

## Loyverse Profile (web)

From marketing/API/help pages:
- POS: sales, item management, categories, modifiers, discounts, tax, refunds, voids, split payments, cash register management, opening/closing shift, X/Z reports.
- Offline mode: works without internet; syncs when connected.
- Hardware: receipt printers (thermal/ESC/POS), cash drawers, barcode scanners, customer displays, kitchen printers, scales.
- Customer display: dedicated customer-facing screen.
- Loyalty: points/rewards.
- Employees/roles: permissions.
- Multi-store: central dashboard for multiple locations.
- Inventory: stock tracking, low stock alerts.
- API: REST (v1.0) documented (developer.loyverse.com) — items, customers, employees, receipts, taxes, categories, etc. (public developer docs exist).

## Vertex Profile (web)

From site:
- Modules: POS, KDS, QR Order & Pay, Online Ordering (branded), 3rd-party delivery integrations (Uber Eats/DoorDash/Grubhub context in module list), CRM/loyalty, coupons/discounts, inventory, purchase/suppliers, recipes/production, barcode/labels, multi-outlet, shifts/HRM, accounting, reports advanced, gift cards, WhatsApp ordering, blog.
- Focus: restaurant-first (dine-in/takeaway/delivery), table management (reservations), kitchen routing, QR table ordering, branded storefront, franchise/multi-location. Pricing shows tiered modules (Growth/Starter/Enterprise).

## TINDA POS Web Current State

From MASTER_DOCUMENT.md / README.md / repo:
- Offline-first Dexie IndexedDB (v4), React 19 + TS + Vite. Runs fully offline; no server required for checkout.
- "Executive" UI: Vault auth, cart, quick tender, hold/resume, SC/PWD discount, customer credit (utang), receipts, barcode sticker printing (CT-221B 40x30mm, Code 128), auto-photo compress to 320x320 WebP. Export/import .tinda-backup (interoperable with desktop).
- Schema: products, categories, customers, sales/transactions, sale_items, expenses, suppliers, cash_counts, z_reads, settings. Cents-based pricing (price_c, cost_price_c).
- Analytics/dashboard, profit estimation, top sellers. Touch friendly.

## Gap Analysis

Capability | TINDA | Aronium | Loyverse | Vertex | Gap (H/M/L)
--- | --- | --- | --- | --- | ---
Offline-first checkout | Excellent | Offline desktop (Win) | Excellent mobile offline | Mixed (web SaaS; some offline modes?) | L (already strong)
Receipt/thermal printer (ESC/POS 58/80) | Label printer (CT221B); need ESC/POS drivers | Yes (escpos handlers) | Yes | Yes | H (native printer support: USB/serial/network ESC/POS; browser WebUSB/WebSerial? or use print service)
Customer display (2nd screen) | Partial/none visible | Yes | Yes | Mentioned in context | M-H
KDS (Kitchen Display System) | None | Not obvious in Lite core (Takeaway exists; KDS routing?) | Yes | Yes (routing/timers) | H
QR Order & Pay / Table QR | None | None obvious | Yes in some contexts? | Yes | H
Branded online ordering storefront | None | None | No (dashboard-focused) | Yes | H
Multi-outlet / franchise mgmt | Single store | Multi? (users/stores?) | Multi-store dashboard | Yes | M-H
Promotions/coupons | Basic discounts | Strong (promotions tables) | Discounts/coupons | Yes | M
Loyalty points | None | Loyalty module | Yes | Yes | M-H
Users/roles/permissions | Basic | Granular | Granular | Granular | M
Z/X reports + shifts | Z/X, cash counts | Close day/Z reports | Yes | Yes | L-M
Stock/expiry/batches | Basic stock | Stock module | Basic/advanced inventory | Full | M
Delivery integrations (3rd-party) | None | None | Varies | Yes | M (nice-to-have)
Fiscal printer integration | None | Yes | Regional | Regional | M (region-dependent)
Modifiers/variants | Simple | Yes? | Yes | Yes | M

## Gap-Ranked Feature Recommendations

1. **KDS (kitchen display system)** - H: Real-time order status (new/preparing/ready/served), ticket routing by station (grill/bar/drinks), timers, sound/alerts. Adopt UI: ticket panel (order #, items, qty, notes, table/service type), color-coded status. Extend schema: kitchen_stations, kitchen_tickets, ticket_items, status history. Update UI: new /kds route (fullscreen, touch friendly). Effort: S-M.
2. **Branded online storefront + ordering** - H: Menu pages, cart, delivery/pickup, table QR deep links, order status tracking. Reuse product/catalog schema; add orders from public (flag channel: online). Generate QR per table. Effort: M.
3. **QR order & pay** - H: Table-specific menu (scan QR → order → pay at table or online). Integrate with cart. Support service type (dine-in, takeaway, delivery). Effort: M.
4. **Receipt/ESC-POS thermal printer support** - H: Support 58/80mm thermal via WebUSB/WebSerial (where supported) + fallback to print template. Add printer profiles (baud/parity; or use ESC/POS commands). Map Aronium's EscPos handlers' behaviors (cut, line feeds, logo, barcode, bold). Effort: M-L (browser driver complexity; consider local bridge/service for broader support).
5. **Customer display (secondary screen)** - M-H: Show cart, totals, itemized, ads. Can use BroadcastChannel/WebSocket to mirror main POS. Templates similar to Aronium CustomerDisplay. Effort: S-M.
6. **Loyalty points + promotions** - M-H: Points per peso, redemption, expiry, tiers. Promotions (BOGO, %/fixed, min qty, time-based). Unify with discounts UI. Effort: M.
7. **Multi-outlet/franchise** - M-H: outlets, users scoped to outlet, outlet switcher, consolidated reports. Schema additions: outlets, user_outlet_roles. Effort: M.
8. **Users/roles/permissions** - M: Granular ACL (sale, void/refund, discount override, reports, stock, settings). Map Aronium FeatureGate. Effort: S-M.
9. **Modifiers/variants** - M: Product modifiers (add-ons, size, notes). Effort: S-M.
10. **Delivery integrations** - M: Abstract provider (DoorDash/Grab/Uber Eats) via webhook/API later; start with manual channel. Effort: S-M.

## Design Pattern References (D3: structural, no copy)

1. **Ticket panel (KDS + order review)** - Aronium order panel: left product catalog/grid, right ticket (line items, qty +/-/remove, discounts, customer, totals). TINDA: keep obsidian+gold theme, use same split layout (70/30) but with tighter spacing. Structure: list of line items with unit/total, void line, notes.
2. **Function keys / quick tender** - Aronium quick payment keys (cash, card, split). TINDA already has quick tender chips; extend to configurable keys.
3. **Document workflow states** - Document.Create/Update/Delete, Void, Refund (state machine). Mirror validation before transition (sufficient payment, not voided).
4. **Receipt layout** - Header (store, tin, address, date/time, cashier, invoice #), items (qty desc price total), discounts, VAT/tax summary, payments, change, footer (thanks, TIN, serial). Aronium ESC/POS handlers give proven field order.
5. **Customer display templates** - Show "Scanning items...", item line, running total, waiting for payment. Keep high-contrast, minimal.
6. **Modular feature gating** - FeatureAccessManagement pattern: check permission before action (void, discount %, close day). Apply in UI + domain.
7. **Shift/Z reports** - Close business day: open/close counts, cash in drawer, sales by payment type, discounts, voids/refunds, net. Aronium BusinessDay.Close workflow is reference for checklist.

## Limitations & Open Questions

- ESC/POS browser support varies (Chromium WebUSB best). May need local print service (HTTP bridge) for full compatibility. Research feasibility.
- Customer display: need 2nd window + sync (BroadcastChannel). Test on tablets.
- KDS: multi-station routing needs schema + real-time updates (BroadcastChannel + Dexie change streams; or just broadcast on mutations). For offline-first, local broadcast is fine.
- Loyalty/promotions: need clear rules, points rounding, expiration.
- Vertex's delivery/marketplace integrations are SaaS-level; implement internal tracking first, provider adapters later.
