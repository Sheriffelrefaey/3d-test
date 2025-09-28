-- Add file_size column to models table if it doesn't exist
ALTER TABLE models ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- Optional: Add a comment to describe the column
COMMENT ON COLUMN models.file_size IS 'File size in bytes';

-- Optional: Update the updated_at trigger to include this column
-- (It should already work with the existing trigger)