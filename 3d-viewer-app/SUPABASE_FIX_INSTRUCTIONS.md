# Fix Storage Upload Issues - Supabase Dashboard Instructions

## Quick Fix (Run in SQL Editor)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project (ksbmiosnzixuybijyvwo)
3. Click on **SQL Editor** in the left sidebar
4. Copy and paste this SQL:

```sql
-- Fix storage policies to allow uploads
DO $$
BEGIN
    -- Make bucket public
    UPDATE storage.buckets SET public = true WHERE id = 'models';

    -- Drop all existing policies on storage.objects for models bucket
    DROP POLICY IF EXISTS "Anyone can view models" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload models" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own models" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own models" ON storage.objects;
    DROP POLICY IF EXISTS "Public can view models" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can upload models temporarily" ON storage.objects;
    DROP POLICY IF EXISTS "Public Access" ON storage.objects;

    -- Create a single permissive policy for all operations
    CREATE POLICY "Allow public access to models bucket"
    ON storage.objects
    FOR ALL
    USING (bucket_id = 'models')
    WITH CHECK (bucket_id = 'models');

    RAISE NOTICE 'Storage policies updated successfully';
END $$;
```

5. Click **Run** button
6. You should see "Success. No rows returned"

## Alternative: Manual Fix via UI

If the SQL doesn't work, you can fix it manually:

1. Go to **Storage** in the left sidebar
2. Click on the **models** bucket
3. Click on **Policies** tab
4. Delete all existing policies
5. Click **New Policy**
6. Select **Custom Policy**
7. Set:
   - Policy name: `Public Access`
   - Allowed operations: Check ALL (SELECT, INSERT, UPDATE, DELETE)
   - Target roles: Select `anon` (anonymous)
   - USING expression: `bucket_id = 'models'`
   - WITH CHECK expression: `bucket_id = 'models'`
8. Click **Create Policy**

## Verify It Works

After applying the fix:

1. Go back to your app at http://localhost:3000/admin
2. Click "Upload Model"
3. Try uploading a small test file

The upload should now work!

## Note

These are permissive policies for development/testing. For production, you should:
- Require authentication for uploads
- Limit file sizes and types
- Add user-specific policies

## Add File Size Tracking (Optional)

To track file sizes properly, run this additional SQL:

```sql
-- Add file_size column to models table
ALTER TABLE models
ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- Update existing records
UPDATE models SET file_size = 0 WHERE file_size IS NULL;
```

## Still Having Issues?

If uploads still fail after this fix:

1. Check that your `.env.local` has the correct `SUPABASE_SERVICE_KEY`
2. Make sure the `models` bucket exists in Storage
3. Try refreshing the page and clearing browser cache
4. Restart your Next.js development server