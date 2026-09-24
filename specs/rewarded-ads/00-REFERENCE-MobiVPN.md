# 00 — Reference: MobiVPN Rewarded-Ad / Token / Expiry Architecture

Reverse-engineered from `MobiVPN_3.3.91_apkcombo.com` (XAPK, `codes.juanscript.vpn`, version 91) via jadx 1.5.6 + aapt2. This is the reference pattern to replicate in TINDA POS Web.

## The loop (what Ian wants to copy)

```
watch ad (AdMob Rewarded) → onUserEarnedReward
  → client POSTs to own server /reward-ads/session
  → server verifies (Play Integrity session + cooldown + count)
  → server credits TIME (minutes) into a per-account vault
  → client uses time; EXPIRES server-side
  → on connect, revalidates fingerprint + remaining time
```

Key property: **time is server-enforced**. Local prefs edits fail a fingerprint check. The web equivalent is: **server-issued signed session token; client clock never trusted**.

## Server endpoints (base `https://www.juanscript.codes/api/`)

| Endpoint | Purpose | Notes |
|---|---|---|
| `POST /integrity/challenge` | Start Play Integrity | client gets a challenge from own server (not Google) |
| `POST /integrity/verify` | Submit IntegrityToken | On pass → `session_token` + `expires_at` stored in prefs `play_integrity_session` |
| `POST /reward-ads/session` | Claim a reward from a watched ad | client sends `ad_id` (AdMob rewarded unit id) |
| `GET /reward-ads/status` | Cooldown + available credit count | returns `available_count` |
| `POST /account-verify` | Revalidate remaining time | headers `X-App-Package`, `X-App-Version-Code` |

Client HTTP headers sent on `/account-verify`:
- `X-App-Package: codes.juanscript.vpn`
- `X-App-Version-Code: 91`
- `X-App-Version-Name: 3.3.91`

Related endpoints seen in the API client (`defpackage/yi0.java`): `/account-recovery`, `/days-accounts`.

## Verified response fields (class `defpackage/ij1.java`)

`verified`, `message`, `available_count`, `cooldown_sec`, `pending`.

## Local state keys (prefs)

| Key | Fields |
|---|---|
| `rewarded_ads` | `available_count`, `cooldown_until_millis` |
| `vpn_account_remaining_time` | `expiration_millis`, `remaining_millis`, `captured_at_millis`, `account_fingerprint` |
| `play_integrity_session` | session token + expiry |

`account_fingerprint` = SHA-256 of `host:user:pass`. If it mismatches on connect, time is voided → **prevents copy-paste of a working config to another device**.

## Ad money side (for reference only)

- Real publisher ID `ca-app-pub-6774364081978440`, app id `codes.juanscript.vpn` (this is MobiVPN's own monetization, NOT ours).
- AdMob units: app_open `/9075660808`, home_banner `/7881415471`, interstitial `/6653139498`, rewarded `/5040674921`.

## Integrity model

1. Client asks OWN server for a challenge → sends challenge to Google Play Integrity API → gets an IntegrityToken → sends it to OWN server.
2. Server verifies the token with Google (server-side), so `verify()` cannot be called from an emulator/spoofed client. Only a server-to-Google round trip passes.
3. Rewards are only credited from a server-verified session; cooldown is enforced server-side via `cooldown_until_millis`.

## Lessons for a WEB build

1. **Never trust the client clock.** MobiVPN stores time but the server re-validates on every connect. Web equivalent: server issues an HMAC-signed expiry, client only displays it.
2. **Never trust client claims of "I watched an ad".** Mobile has Play Integrity + AdMob's rewarded callback. Web has **no Play Integrity**; the cheapest trustworthy gate is Cloudflare Turnstile (server-side verify) + server-enforced cooldown + HMAC challenge.
3. **Local edits must fail.** Mobile: fingerprint. Web: signed token — an edited `pro_expires_at` breaks the signature.