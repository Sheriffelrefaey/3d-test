-- Add object_name column to annotations table
ALTER TABLE annotations
ADD COLUMN IF NOT EXISTS object_name TEXT;

-- Update existing annotations to have a default object_name
UPDATE annotations
SET object_name = 'Object'
WHERE object_name IS NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_annotations_object_name ON annotations(object_name);
CREATE INDEX IF NOT EXISTS idx_annotations_model_object ON annotations(model_id, object_name);