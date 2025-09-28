-- Add menu_visible, menu_order, and menu_name columns to annotations table

-- Add menu_visible column (defaults to true)
ALTER TABLE public.annotations
ADD COLUMN IF NOT EXISTS menu_visible BOOLEAN DEFAULT true;

-- Add menu_order column (defaults to 0)
ALTER TABLE public.annotations
ADD COLUMN IF NOT EXISTS menu_order INTEGER DEFAULT 0;

-- Add menu_name column for custom menu display names
ALTER TABLE public.annotations
ADD COLUMN IF NOT EXISTS menu_name TEXT;

-- Create an index on menu_order for better query performance
CREATE INDEX IF NOT EXISTS idx_annotations_menu_order
ON public.annotations(model_id, menu_order);

-- Update existing records to have sequential menu_order values
WITH numbered_annotations AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY model_id ORDER BY created_at) - 1 as new_order
  FROM public.annotations
)
UPDATE public.annotations a
SET menu_order = na.new_order
FROM numbered_annotations na
WHERE a.id = na.id
  AND a.menu_order = 0;

-- Add comments for documentation
COMMENT ON COLUMN public.annotations.menu_visible IS 'Whether this annotation should be visible in the menu';
COMMENT ON COLUMN public.annotations.menu_order IS 'Display order of this annotation in the menu';
COMMENT ON COLUMN public.annotations.menu_name IS 'Custom display name for this annotation in the menu';