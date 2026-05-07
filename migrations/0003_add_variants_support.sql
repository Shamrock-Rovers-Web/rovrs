-- Add variant support to links table
ALTER TABLE links ADD COLUMN variant_of INTEGER REFERENCES links(id);
ALTER TABLE links ADD COLUMN variant_suffix TEXT;

-- Create index for variant_of
CREATE INDEX idx_links_variant_of ON links(variant_of);

-- Create table to track variant generations
CREATE TABLE variant_generations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    base_link_id INTEGER NOT NULL REFERENCES links(id),
    variant_type TEXT NOT NULL,
    variant_slugs TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT
);

-- Index for variant_generations
CREATE INDEX idx_variant_generations_base_link_id ON variant_generations(base_link_id);
CREATE INDEX idx_variant_generations_created_at ON variant_generations(created_at);