# 01 — Current State: TINDA POS Web rewarded-ad system

Stack: React 19 + Vite + TypeScript + Tailwind v3, Dexie (IndexedDB) local DB, Cloudflare Pages Functions (`functions/api/prices.ts` exists, wrangler configured). Ads-gate already implemented but **client-side only** and fully spoofable.

## What exists (files)

- `src/services/proAccess.ts` — `useProAccess()` hook. State:
  - `pro_expires_at`, `tokens`, `last_ad_watched_at`, `total_ads_watched`, `owner_bypass`.
  - Rule: 1 ad = +1 token = **+8 hours**. `tokens >= 3` unlocks features; then time must still be > 0 (`isPro`, `isFullyUnlocked`, `remainingSeconds`).
  - 30s cooldown (`DEFAULT_COOLDOWN_SECONDS`), max accumulation 60 days (`MAX_ACCUMULATION_MS`).
  - **Persistence: localStorage + Dexie `settings` table, keyed per user** (`tinda_pro_access_u<userId>`). No server. `owner_bypass` is a local flag.
  - `requireProFeature(featureName, cb)` opens the gate modal.
- `src/components/RewardedAdModal.tsx` — gate modal. Fake video ad player:
  - 20s countdown, `performance.now()` anti-tamper (only checks `elapsed < 18.5s`).
  - Claims "Google AdSense Rewarded Unit **ca-pub-8613908595644796**" — **decorative badge only; no real AdSense/AdMob call, no real ad.** The counted-down video is a mocked sponsor screen.
  - Ad-blocker gate via `src/services/adBlocker.ts` (DOM bait + HEAD probe to `adsbygoogle.js`). No `onGrantReward` server handshake.
- `src/services/adBlocker.ts` — detects Brave/uBlock/ABP/Pi-hole. Gates the "Watch" button.

## The user story today

Watch 20s spoof video → +1 token (+8h) → after 3 tokens, all features unlock while time runs. Re-watch to extend. Owner bypass flag for the shop owner.

## Gaps (vs. the MobiVPN reference)

| Gap | Severity | Detail |
|---|---|---|
| No server in the loop | **Critical** | `grantRewardForAd` just writes localStorage/Dexie. Anyone can set `pro_expires_at` to 2100 and get Pro forever. |
| Fake ad, no real monetization | **Critical** | The 20s screen is a mock; `ca-pub-...4796` is never really called. Rewards can be scripted (devtools `handleAdCompleted` / elapsed bypass). |
| Clocks are client-side | High | Expiry ticks from `Date.now()`; changing the system clock grants time. |
| Cooldown client-side | High | Edit `last_ad_watched_at` to bypass 30s. |
| `owner_bypass` client flag | Medium | A local boolean; anyone can enable it in devtools. |
| No per-device identity | Medium | No device/browser fingerprint, so "3 ads then time" can be re-farmed by clearing storage. |
| No ledger | Medium | `total_ads_watched` is cosmetic; no audit trail of claims. |

## What this means

TINDA POS is currently **"honor-system Pro"**: the UI gates features but persistence is trivially tampered with. If Ian wants the real MobiVPN behaviour ("kaya nato ingana nga ads"), the web build needs a **server-signed token + Cloudflare Worker claim endpoint** such that no local edit can mint time.