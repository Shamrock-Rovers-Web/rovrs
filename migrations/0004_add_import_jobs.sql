-- Import jobs table for tracking CSV imports
CREATE TABLE import_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    total_rows INTEGER DEFAULT 0,
    created_rows INTEGER DEFAULT 0,
    skipped_rows INTEGER DEFAULT 0,
    errors TEXT DEFAULT '[]',  -- JSON array of error objects
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- Index for job_id lookup
CREATE INDEX idx_import_jobs_job_id ON import_jobs(job_id);

-- Index for status filtering
CREATE INDEX idx_import_jobs_status ON import_jobs(status);

-- Index for created_at sorting
CREATE INDEX idx_import_jobs_created_at ON import_jobs(created_at);