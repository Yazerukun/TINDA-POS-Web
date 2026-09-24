# 02 — Implement Brief: Server-Enforced Rewarded-Ad Time (TINDA POS Web)

## Goal

Give the TINDA POS Web rewarded-ad system the MobiVPN property: **time is server-issued, server-verifiable, and local edits can never mint it.** Keep the current UX (gate modal, 1 ad = +1 token = +8h, 30s cooldown, 60d cap, owner bypass) — only make it honest.

## Constraint reality-check (read before designing)

- Web has **no Play Integrity**. The AdMob "rewarded video" unit used by MobiVPN does **not** exist for bare web pages (AdMob rewarded is mobile-SDK only).
- Real web rewarded-monetization networks are thin/unreliable. The pragmatic MVP: keep Ian's **mock sponsor video** as the "ad", but back it with **Cloudflare Turnstile** (free, server-verifiable proof a human watched) + **server cooldown + HMAC-signed expiry token**. That makes the system structurally identical to MobiVPN (server-enforced) without needing a real ad network. Swapping in a genuine rewarded network later touches only one function.
- Turnstile needs a site key/repo. The claim endpoint `POST /api/credits/claim` must verify the Turnstile token server-side (Cloudflare `siteverify`) — never trust the client.

## Architecture (minimal, harness-grade)

```
RewardedAdModal (existing)            proAccess.ts (existing)
        │ watch finishes                     │
        ▼                                    │
 POST /api/credits/claim {turnstile, deviceId, nonce, adId}
        │   Cloudflare Worker (new: functions/api/credits/*)
        ▼
 1. verify Turnstile token (server→CF siteverify)
 2. HMAC-check a client proof nonce (session-bound, 5-min TTL)
 3. server cooldown per deviceId (30s, monotonic)
 4. credit: +8h capped at 60d from now, if already-signed time is older
 5. persist ledger (D1 or KV) {deviceId, claimed_at, expires_at, count}
 6. return signed payload: { expires_at, tokens, signature(HMAC-SHA256) }
        ▼
 proAccess stores signed payload; isPro = signature valid AND Date.now() < expires_at
```

Every render gate calls `GET /api/credits/status?deviceId=...` (worker re-signs current expiry, so **changing the system clock cannot add time**). Offline fallback: allow last signed payload, but 5-min grace then require network.

- `owner_bypass` becomes a **server flag** (per device/owner token), not a local boolean.

## Anti-spoof rules

1. Expiry comes only from the worker; client never computes `+8h`.
2. Signature = HMAC-SHA256 over `deviceId|expires_at|nonce` with a worker secret (`CREDITS_HMAC_SECRET`).
3. Nonce: issued per claim, single-use, TTL 5 min → replay of a claim fails.
4. Rate limit: 30s cooldown + max 6 claims/device/hour (double-checks `total_ads_watched`).
5. DeviceId: first-party stable fingerprint (crypto.hash of UA + storage salt + `navigator` bits), rotated transparently — re-farming by clearing storage only buys a new fingerprint, but server may still flag "same payment path".

## Files to touch

| File | Change |
|---|---|
| `functions/api/credits/claim.ts` | NEW worker: Turnstile verify + nonce + cooldown + credit + sign |
| `functions/api/credits/status.ts` | NEW worker: re-sign current expiry for a device |
| `functions/api/credits/issue.ts` | NEW worker: issue single-use nonce (session-bound) |
| `src/services/proAccess.ts` | Drive from server-signed payload; `requireProFeature` hits status; keep Dexie cache as offline fallback only |
| `src/components/RewardedAdModal.tsx` | On finish → real `claim()` call; remove `alert`-only spoof path; wire Turnstile widget in place of decorative badge |
| `src/services/adBlocker.ts` | Keep as UX hint, NOT a hard gate (server gate is the real one) |
| `src/types.ts` | `ProAccessState` + signed payload types |
| `wrangler.jsonc` | Add `CREDITS_HMAC_SECRET` var, KV/D1 binding |

## Acceptance checklist (run before calling done)

- [ ] `python3 -m hunter.cli`-style verification not applicable; do `npm run build` + `npx wrangler dev` + manual flow
- [ ] Empty storage + 0 tokens + clock set +50y → still `00:00:00`, features locked
- [ ] Claim via replay of a captured request → rejected (nonce)
- [ ] 3 claims in 1s → rejected (cooldown)
- [ ] Manual `pro_expires_at` edit → UI still locked (signature)
- [ ] Legit path: 20s video + Turnstile + cooldown → +1 token, +8h, status reflects it
- [ ] Offline → cached signed time usable ≤5 min, then gate locks

## Out of scope (defer)

- Real rewarded ad network / CPM money (swap-in point: `claim()` only).
- Multi-device account sync (device-scoped is fine for POS single-license).
- Ledger analytics UI — persistence is enough for now.