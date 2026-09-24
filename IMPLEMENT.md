# IMPLEMENT.md — TINDA POS Web Engineering Log

## Architectural Decisions & Changelog

### 2026-09-24: Account Sign-Up, Locked-by-Default (00:00:00), 30s Cooldown & Direct Ad Onboarding
- **Decision**: New accounts start with `00:00:00` Pro time (locked by default). Basic cashier counter remains functional, while Pro features (Analytics, DTI SRP Sync, Expiration Watch, Expenses, Suppliers) require active Pro session.
- **Decision**: Added in-app User Sign-Up to `VaultAuthModal.tsx` allowing cashiers and store owners to register with Name, Username, Role, and 4-digit PIN stored in Dexie `users` table.
- **Decision**: Added immediate first-time direct popup to Ads Manager modal right after login when remaining time is `00:00:00`.
- **Decision**: Extended ad cooldown to **30 seconds** (from 20s) to adhere strictly to Google AdSense spam prevention policies.
- **Decision**: Configured Google AdSense publisher `ca-pub-8613908595644796` in `index.html` and `public/ads.txt`, along with public `/privacy` and `/terms` disclosures displaying verified contact email `skorts188@gmail.com`.
