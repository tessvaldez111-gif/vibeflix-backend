ALTER TABLE dramas ADD COLUMN comment_count INT NOT NULL DEFAULT 0;
ALTER TABLE dramas ADD COLUMN share_count INT NOT NULL DEFAULT 0;
SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='drama_platform' AND TABLE_NAME='dramas' AND COLUMN_NAME IN ('comment_count','share_count');
