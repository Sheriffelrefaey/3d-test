# Fix Annotations Row Level Security (RLS) Issue

## Problem
The annotations table has Row Level Security (RLS) enabled, which is blocking insert operations.

## Quick Fix (Recommended for Development)

1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Run this single command:

```sql
ALTER TABLE annotations DISABLE ROW LEVEL SECURITY;
```

4. Click "Run"
5. Try saving annotations again - it should work!

## Production Fix (With Proper Security)

If you want to keep RLS enabled for production, run these commands instead:

```sql
-- Ensure RLS is enabled
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Allow public read access" ON annotations;
DROP POLICY IF EXISTS "Allow public insert access" ON annotations;
DROP POLICY IF EXISTS "Allow public update access" ON annotations;
DROP POLICY IF EXISTS "Allow public delete access" ON annotations;

-- Create new permissive policies
CREATE POLICY "Allow public read access" ON annotations
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON annotations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON annotations
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete access" ON annotations
  FOR DELETE USING (true);
```

## How to Apply the Fix

1. Open your Supabase project dashboard
2. Go to the **SQL Editor** (in the left sidebar)
3. Copy and paste one of the SQL commands above
4. Click the **Run** button
5. You should see "Success. No rows returned"
6. Go back to your app and try saving annotations again

## Verification

After applying the fix, you can verify it worked by:

1. Going to http://localhost:3000/admin
2. Clicking "Edit" on any model
3. Clicking on the 3D model to add an annotation
4. Filling in title and description
5. Clicking "Save Annotations"
6. You should see "Annotations saved successfully!" alert

## Note for Production

For production environments, you should implement proper authentication and update the RLS policies to:
- Only allow authenticated users to insert/update/delete
- Possibly restrict edits to annotation owners only
- Keep public read access for viewing

Example production policies would check `auth.uid()` for authenticated users.