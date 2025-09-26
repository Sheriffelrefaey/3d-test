const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixStoragePolicies() {
  console.log('Fixing storage policies for models bucket...\n');

  try {
    // First, let's check current policies
    console.log('Checking current RLS status...');

    // Try to disable RLS on storage.objects temporarily
    const queries = [
      // First, ensure the bucket is public
      `UPDATE storage.buckets SET public = true WHERE id = 'models';`,

      // Drop existing policies
      `DROP POLICY IF EXISTS "Anyone can view models" ON storage.objects;`,
      `DROP POLICY IF EXISTS "Authenticated users can upload models" ON storage.objects;`,
      `DROP POLICY IF EXISTS "Users can update their own models" ON storage.objects;`,
      `DROP POLICY IF EXISTS "Users can delete their own models" ON storage.objects;`,
      `DROP POLICY IF EXISTS "Public can view models" ON storage.objects;`,
      `DROP POLICY IF EXISTS "Anyone can upload models temporarily" ON storage.objects;`,

      // Create permissive policies for testing
      `CREATE POLICY "Public can view models" ON storage.objects FOR SELECT USING (bucket_id = 'models');`,
      `CREATE POLICY "Anyone can upload models temporarily" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'models');`,
      `CREATE POLICY "Anyone can update models temporarily" ON storage.objects FOR UPDATE USING (bucket_id = 'models');`,
      `CREATE POLICY "Anyone can delete models temporarily" ON storage.objects FOR DELETE USING (bucket_id = 'models');`,
    ];

    console.log('Applying storage policies...\n');

    // Note: Supabase JS client doesn't support raw SQL execution directly
    // We'll need to use the REST API or run these via the dashboard

    console.log('⚠️  IMPORTANT: Supabase JS client cannot execute raw SQL directly.');
    console.log('\n Please run the following SQL in your Supabase Dashboard (SQL Editor):\n');
    console.log('----------------------------------------');
    queries.forEach(query => {
      console.log(query);
    });
    console.log('----------------------------------------\n');

    console.log('Alternatively, you can run this simplified version that makes the bucket fully public:\n');
    console.log('----------------------------------------');
    console.log(`
-- Make bucket public and disable RLS temporarily
UPDATE storage.buckets SET public = true WHERE id = 'models';

-- Drop all existing policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
    END LOOP;
END $$;

-- Create a simple public policy
CREATE POLICY "Public Access" ON storage.objects
FOR ALL USING (bucket_id = 'models');
    `);
    console.log('----------------------------------------\n');

    // Test if we can list files (this will work if policies allow SELECT)
    const { data: files, error: listError } = await supabase.storage
      .from('models')
      .list();

    if (listError) {
      console.log('❌ Cannot list files. RLS policies need to be updated in Supabase Dashboard.');
    } else {
      console.log('✅ Can list files. SELECT policy is working.');
    }

    // Try a test upload with the service key
    console.log('\nTesting upload with service key...');
    const testBlob = new Blob(['test'], { type: 'text/plain' });
    const { error: uploadError } = await supabase.storage
      .from('models')
      .upload(`test_${Date.now()}.txt`, testBlob, {
        upsert: false
      });

    if (uploadError) {
      console.log('❌ Upload test failed:', uploadError.message);
      console.log('\n⚠️  Please run the SQL queries above in your Supabase Dashboard to fix this.');
    } else {
      console.log('✅ Upload test successful with service key!');

      // Clean up test file
      await supabase.storage
        .from('models')
        .remove([`test_${Date.now()}.txt`]);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

fixStoragePolicies();