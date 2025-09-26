-- Add file_size column to models table to track file sizes
ALTER TABLE models
ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- Add comment for documentation
COMMENT ON COLUMN models.file_size IS 'Size of the uploaded file in bytes';

-- Optional: Update existing records with a default value (0 means unknown)
UPDATE models
SET file_size = 0
WHERE file_size IS NULL;