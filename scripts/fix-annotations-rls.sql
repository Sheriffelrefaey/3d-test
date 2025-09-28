-- Disable RLS temporarily or add proper policies for annotations table
-- Run this in your Supabase SQL editor

-- Option 1: Disable RLS (for development/testing)
ALTER TABLE annotations DISABLE ROW LEVEL SECURITY;

-- Option 2: Add permissive policies (recommended for production)
-- First, enable RLS if not already enabled
-- ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read annotations
-- CREATE POLICY "Allow public read access" ON annotations
--   FOR SELECT
--   USING (true);

-- Allow anyone to insert annotations (for demo purposes)
-- CREATE POLICY "Allow public insert access" ON annotations
--   FOR INSERT
--   WITH CHECK (true);

-- Allow anyone to update their annotations
-- CREATE POLICY "Allow public update access" ON annotations
--   FOR UPDATE
--   USING (true)
--   WITH CHECK (true);

-- Allow anyone to delete annotations
-- CREATE POLICY "Allow public delete access" ON annotations
--   FOR DELETE
--   USING (true);