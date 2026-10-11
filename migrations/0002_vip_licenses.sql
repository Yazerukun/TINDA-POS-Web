-- 0002: VIP Pro licensing hardlock and anti-replay ledger.
--
-- Guarantees 1:1 account-bound lifetime licensing.
-- Anti-replay: payment_intent_id is strictly UNIQUE across the entire database,
-- preventing payment intent reuse or replay attacks.

CREATE TABLE IF NOT EXISTS vip_licenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  payment_intent_id TEXT NOT NULL UNIQUE,
  payment_method TEXT NOT NULL DEFAULT 'PAYMONGO_QRPH',
  amount_cents INTEGER NOT NULL DEFAULT 50000,
  currency TEXT NOT NULL DEFAULT 'PHP',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  license_signature TEXT NOT NULL,
  registered_store TEXT,
  activated_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vip_orders (
  payment_intent_id TEXT PRIMARY KEY,
  username TEXT NOT NULL COLLATE NOCASE,
  store_name TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 50000,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vip_licenses_username ON vip_licenses(username COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_vip_orders_username ON vip_orders(username COLLATE NOCASE);
