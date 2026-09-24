# IMPLEMENT.md — TINDA POS Web Engineering Log

## Architectural Decisions & Changelog

### 2026-09-24: Account Sign-Up, Locked-by-Default (00:00:00), 30s Cooldown & Direct Ad Onboarding
- **Decision**: New accounts start with `00:00:00` Pro time (locked by default). Basic cashier counter remains functional, while Pro features (Analytics, DTI SRP Sync, Expiration Watch, Expenses, Suppliers) require active Pro session.
- **Decision**: Added in-app User Sign-Up to `VaultAuthModal.tsx` allowing cashiers and store owners to register with Name, Username, Role, and 4-digit PIN stored in Dexie `users` table.
- **Decision**: Added immediate first-time direct popup to Ads Manager modal right after login when remaining time is `00:00:00`.
- **Decision**: Extended ad cooldown to **30 seconds** (from 20s) to adhere strictly to Google AdSense spam prevention policies.
- **Decision**: Configured Google AdSense publisher `ca-pub-8613908595644796` in `index.html` and `public/ads.txt`, along with public `/privacy` and `/terms` disclosures displaying verified contact email `skorts188@gmail.com`.

### 2026-09-24: Master Platform Admin (`skorts188@gmail.com`), Zero-Ads Bypass & Store Hierarchy Control Panel
- **Decision**: Platform Creator / Master Admin account configured for `skorts188@gmail.com` with password `muyco155`.
- **Decision**: Master Admin has **Zero Ads** (`owner_bypass: true` permanently active, never prompted with ad gates, no expiration timer).
- **Decision**: Added dedicated `MasterControlScreen.tsx` (accessible via golden Super Admin navigation item) displaying:
  - Total registered stores / merchants
  - Total staff/cashier accounts created under each merchant
  - Platform-wide sales and ad monetization metrics
  - PIN inspection & emergency reset capabilities
  - Manual merchant and staff registration
  - JSON ledger export
- **Decision**: Simplified public Sign-Up screen (`VaultAuthModal.tsx`): removed assigned role selector. Registration is strictly for Store Owners (Business Name, Owner Name, Username, Contact, PIN/Password).
- **Decision**: Store Owners can add their own staff (`CASHIER` or `INVENTORY_LEAD`) under Settings -> Staff Management, with automatic linking to their store.
- **Decision**: All non-master accounts (Store Owners and their cashiers) strictly require watching rewarded ads (+1h, +2h, +3h) with a 30-second cooldown to access Pro features.
