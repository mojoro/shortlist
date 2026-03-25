-- Enable pg_trgm extension for trigram-based indexing
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram GIN index on job_pool.title for LIKE ANY(...) in match-sql.ts
CREATE INDEX idx_job_pool_title_trgm ON job_pool USING gin (title gin_trgm_ops);

-- Trigram GIN index on job_pool.location for LIKE ANY(...) in match-sql.ts
CREATE INDEX idx_job_pool_location_trgm ON job_pool USING gin (location gin_trgm_ops);
