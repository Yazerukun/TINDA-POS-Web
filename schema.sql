-- TINDA POS — Cloudflare D1 Cloud Schema
-- Users / Accounts
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'CASHIER',
  pin TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  store_name TEXT,
  is_owner INTEGER NOT NULL DEFAULT 0,
  avatar_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
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
