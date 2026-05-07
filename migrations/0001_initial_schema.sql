-- Links table with indexes
CREATE TABLE links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    destination_url TEXT NOT NULL,
    title TEXT,
    campaign TEXT,
    channel TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'expired', 'deleted')),
    redirect_code INTEGER DEFAULT 302 CHECK(redirect_code IN (301, 302)),
    is_protected BOOLEAN DEFAULT FALSE,
    expires_at DATETIME,
    match_info TEXT,
    show_interstitial BOOLEAN DEFAULT FALSE,
    is_qr_generated BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT
);

-- Click events table with indexes
CREATE TABLE click_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    referrer TEXT,
    country TEXT,
    city TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Destination history table with indexes
CREATE TABLE destination_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL,
    old_destination TEXT NOT NULL,
    new_destination TEXT NOT NULL,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    changed_by TEXT
);

-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Rate limits table with index
CREATE TABLE rate_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT NOT NULL,
    path TEXT NOT NULL,
    count INTEGER NOT NULL,
    window_start DATETIME NOT NULL,
    window_end DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for links table
CREATE INDEX idx_links_slug ON links(slug);
CREATE INDEX idx_links_status ON links(status);
CREATE INDEX idx_links_created_at ON links(created_at);
CREATE INDEX idx_links_expires_at ON links(expires_at);
CREATE INDEX idx_links_campaign ON links(campaign);
CREATE INDEX idx_links_channel ON links(channel);

-- Indexes for click_events table
CREATE INDEX idx_click_events_slug ON click_events(slug);
CREATE INDEX idx_click_events_clicked_at ON click_events(clicked_at);

-- Indexes for destination_history table
CREATE INDEX idx_destination_history_slug ON destination_history(slug);
CREATE INDEX idx_destination_history_changed_at ON destination_history(changed_at);

-- Index for rate_limits table
CREATE INDEX idx_rate_limits_ip_path_window ON rate_limits(ip_address, path, window_start);

-- Seed evergreen links
INSERT INTO links (slug, destination_url, title, status, redirect_code, is_protected, created_by) VALUES
('tickets', 'https://www.shamrockrovers.ie/tickets', 'Tickets', 'active', 301, TRUE, 'system'),
('shop', 'https://shop.shamrockrovers.ie', 'Shop', 'active', 301, TRUE, 'system'),
('fixtures', 'https://www.shamrockrovers.ie/fixtures', 'Fixtures', 'active', 301, TRUE, 'system'),
('members', 'https://www.shamrockrovers.ie/members', 'Members', 'active', 301, TRUE, 'system'),
('academy', 'https://www.shamrockrovers.ie/academy', 'Academy', 'active', 301, TRUE, 'system'),
('women', 'https://www.shamrockrovers.ie/women', 'Women''s Team', 'active', 301, TRUE, 'system');

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_links_timestamp
    AFTER UPDATE ON links
    FOR EACH ROW
BEGIN
    UPDATE links SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;