-- rov.rs initial schema
CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  destination_url TEXT NOT NULL,
  destination_domain TEXT,
  title TEXT,
  campaign TEXT,
  channel TEXT,
  owner TEXT,
  sponsor TEXT,
  opponent TEXT,
  competition TEXT,
  match_date TEXT,
  home_away TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  redirect_code INTEGER NOT NULL DEFAULT 302,
  is_qr BOOLEAN NOT NULL DEFAULT 0,
  is_offsite_ticket BOOLEAN NOT NULL DEFAULT 0,
  show_offsite_preview BOOLEAN NOT NULL DEFAULT 0,
  is_protected BOOLEAN NOT NULL DEFAULT 0,
  variant_of TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_by TEXT,
  updated_at TEXT,
  expires_at TEXT,
  deleted_at TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_links_status ON links(status);
CREATE INDEX IF NOT EXISTS idx_links_campaign ON links(campaign);
CREATE INDEX IF NOT EXISTS idx_links_expires_at ON links(expires_at);
CREATE INDEX IF NOT EXISTS idx_links_channel ON links(channel);
CREATE INDEX IF NOT EXISTS idx_links_variant_of ON links(variant_of);
CREATE INDEX IF NOT EXISTS idx_links_sponsor ON links(sponsor);
CREATE INDEX IF NOT EXISTS idx_links_opponent ON links(opponent);

CREATE TABLE IF NOT EXISTS click_events (
  id TEXT PRIMARY KEY,
  link_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  clicked_at TEXT NOT NULL,
  country TEXT,
  referrer TEXT,
  device_type TEXT,
  is_bot BOOLEAN DEFAULT 0,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  event_type TEXT NOT NULL DEFAULT 'click'
);

CREATE INDEX IF NOT EXISTS idx_click_events_link_id ON click_events(link_id);
CREATE INDEX IF NOT EXISTS idx_click_events_clicked_at ON click_events(clicked_at);
CREATE INDEX IF NOT EXISTS idx_click_events_slug ON click_events(slug);

CREATE TABLE IF NOT EXISTS destination_history (
  id TEXT PRIMARY KEY,
  link_id TEXT NOT NULL,
  old_destination_url TEXT NOT NULL,
  new_destination_url TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  changed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dest_history_link_id ON destination_history(link_id);
CREATE INDEX IF NOT EXISTS idx_dest_history_changed_at ON destination_history(changed_at);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor',
  display_name TEXT,
  created_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS rate_limits (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_email_created ON rate_limits(email, created_at);

-- Seed evergreen links
INSERT INTO links (id, slug, destination_url, destination_domain, title, status, redirect_code, is_protected, created_by, created_at) VALUES
  ('evergreen000001', 'tickets', 'https://www.shamrockrovers.ie/first-team-tickets', 'www.shamrockrovers.ie', 'Tickets', 'active', 301, 1, 'system', '2026-05-07T00:00:00Z'),
  ('evergreen000002', 'shop', 'https://shop.shamrockrovers.ie', 'shop.shamrockrovers.ie', 'Shop', 'active', 301, 1, 'system', '2026-05-07T00:00:00Z'),
  ('evergreen000003', 'fixtures', 'https://www.shamrockrovers.ie/fixtures', 'www.shamrockrovers.ie', 'Fixtures', 'active', 301, 1, 'system', '2026-05-07T00:00:00Z'),
  ('evergreen000004', 'members', 'https://www.shamrockrovers.ie/membership', 'www.shamrockrovers.ie', 'Members', 'active', 301, 1, 'system', '2026-05-07T00:00:00Z'),
  ('evergreen000005', 'academy', 'https://www.shamrockrovers.ie/academy', 'www.shamrockrovers.ie', 'Academy', 'active', 301, 1, 'system', '2026-05-07T00:00:00Z'),
  ('evergreen000006', 'women', 'https://www.shamrockrovers.ie/women', 'www.shamrockrovers.ie', 'Women', 'active', 301, 1, 'system', '2026-05-07T00:00:00Z');
