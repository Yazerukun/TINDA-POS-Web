-- TINDA POS — Cloudflare D1 Cloud Schema
-- Fresh-install schema. Already-deployed databases use the numbered migrations
-- in migrations/ instead; this file must stay idempotent.

-- Users / Accounts
-- `pin` is legacy plaintext and is only populated on pre-migration rows.
-- New and rotated PINs live in `pin_hash` / `pin_salt` (PBKDF2-SHA256).
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'CASHIER',
  pin TEXT,
  pin_hash TEXT,
  pin_salt TEXT,
  must_rotate_pin INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  store_name TEXT,
  is_owner INTEGER NOT NULL DEFAULT 0,
  avatar_url TEXT,
  is_master INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  last_active_at TEXT
);

-- Failed-login counter. A 4-6 digit PIN is brute-forceable no matter how it is
-- stored, so the login endpoint locks an account after repeated failures.
CREATE TABLE IF NOT EXISTS login_attempts (
  username TEXT PRIMARY KEY COLLATE NOCASE,
  fails INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

-- Pro Access State (synced on every ad watch / redeem)
CREATE TABLE IF NOT EXISTS pro_access (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL DEFAULT 0,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  store_name TEXT,
  pro_expires_at INTEGER NOT NULL DEFAULT 0,
  tokens INTEGER NOT NULL DEFAULT 0,
  last_ad_watched_at INTEGER NOT NULL DEFAULT 0,
  total_ads_watched INTEGER NOT NULL DEFAULT 0,
  owner_bypass INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

-- Registered stores
CREATE TABLE IF NOT EXISTS stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  owner_username TEXT,
  owner_name TEXT,
  address TEXT,
  contact TEXT,
  created_at TEXT NOT NULL
);