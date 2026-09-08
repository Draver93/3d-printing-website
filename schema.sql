CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  purpose TEXT NOT NULL DEFAULT '',
  item TEXT NOT NULL DEFAULT '',
  price REAL NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'received',
  note TEXT NOT NULL DEFAULT '',
  files TEXT NOT NULL DEFAULT '[]',
  dl_token TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_requests_created ON requests(created_at DESC);