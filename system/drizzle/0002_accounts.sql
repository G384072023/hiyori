CREATE TABLE app_accounts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  role TEXT NOT NULL CHECK (role IN ('admin','employee')),
  staff_name TEXT,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX app_accounts_staff_name ON app_accounts(staff_name) WHERE role='employee';
CREATE TABLE app_sessions (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES app_accounts(id),
  expires_at INTEGER NOT NULL
);
CREATE INDEX app_sessions_account ON app_sessions(account_id);
