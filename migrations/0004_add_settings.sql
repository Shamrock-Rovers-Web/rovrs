-- Settings table for configuration
CREATE TABLE settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    updated_by TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX idx_settings_key ON settings(key);

-- Seed settings data
INSERT INTO settings (key, value, updated_by) VALUES
('slug_blocklist', '["javascript:", "data:", "file:", "ftp:", "localhost", "127.0.0.1"]', 'system'),
('known_domains', '["shamrockrovers.ie", "rov.rs", "admin.rov.rs"]', 'system');