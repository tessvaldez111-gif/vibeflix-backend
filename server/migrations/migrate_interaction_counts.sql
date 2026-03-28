-- Migration: Add comment_count and share_count to dramas table
-- Date: 2026-03-28

ALTER TABLE dramas ADD COLUMN IF NOT EXISTS comment_count INT NOT NULL DEFAULT 0;
ALTER TABLE dramas ADD COLUMN IF NOT EXISTS share_count INT NOT NULL DEFAULT 0;
