-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view models" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload models" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own models" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own models" ON storage.objects;
DROP POLICY IF EXISTS "Public can view models" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload models temporarily" ON storage.objects;

-- Create new storage policies for the models bucket

-- Allow anyone to view files in the models bucket
CREATE POLICY "Public can view models"
ON storage.objects FOR SELECT
USING (bucket_id = 'models');

-- For development/testing: Allow anyone to upload (you can make this more restrictive later)
CREATE POLICY "Anyone can upload models temporarily"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'models');

-- Allow anyone to update their files (for development)
CREATE POLICY "Anyone can update models temporarily"
ON storage.objects FOR UPDATE
USING (bucket_id = 'models');

-- Allow anyone to delete their files (for development)
CREATE POLICY "Anyone can delete models temporarily"
ON storage.objects FOR DELETE
USING (bucket_id = 'models');

-- Note: In production, you should use more restrictive policies like:
-- CREATE POLICY "Authenticated users can upload models"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'models'
--   AND auth.uid() IS NOT NULL
-- );

-- Verify the bucket exists and is public
UPDATE storage.buckets
SET public = true
WHERE id = 'models';

-- Grant necessary permissions
GRANT ALL ON storage.objects TO anon;
GRANT ALL ON storage.buckets TO anon;

-- Optional: For authenticated users only (comment out for testing)
-- GRANT ALL ON storage.objects TO authenticated;
-- GRANT ALL ON storage.buckets TO authenticated;