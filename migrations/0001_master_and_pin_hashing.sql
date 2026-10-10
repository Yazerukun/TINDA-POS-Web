-- 0001: platform master flag + PIN hashing.
--
-- `is_master` grants cross-store visibility in Master Control. It is
-- server-owned: never written from a client request body.
--
-- `must_rotate_pin` is set on every existing account because the plaintext PINs
-- in the `pin` column were readable through the old public GET /api/users.
-- Each account must change its PIN through POST /api/users before it is trusted.

ALTER TABLE users ADD COLUMN is_master INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN pin_hash TEXT;
ALTER TABLE users ADD COLUMN pin_salt TEXT;
ALTER TABLE users ADD COLUMN must_rotate_pin INTEGER NOT NULL DEFAULT 0;

UPDATE users SET must_rotate_pin = 1 WHERE pin IS NOT NULL;

-- Failed-login lockout.
CREATE TABLE IF NOT EXISTS login_attempts (
  username TEXT PRIMARY KEY COLLATE NOCASE,
  fails INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

-- `pin` was declared NOT NULL on the live table, which blocks clearing the
-- compromised plaintext values. Rebuild the table with it nullable. D1 wraps
-- `wrangler d1 execute --file` in a transaction, so this either lands whole or
-- not at all. Verified against the live database on 2026-10-01.
CREATE TABLE users_new (
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
INSERT INTO users_new (id, username, name, email, role, pin, pin_hash, pin_salt, must_rotate_pin, status, store_name, is_owner, avatar_url, is_master, created_at, updated_at, last_active_at)
SELECT id, username, name, email, role, pin, pin_hash, pin_salt, must_rotate_pin, status, store_name, is_owner, avatar_url, is_master, created_at, updated_at, last_active_at FROM users;
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username COLLATE NOCASE);
