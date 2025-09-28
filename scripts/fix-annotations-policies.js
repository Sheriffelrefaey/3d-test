require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Make sure you have NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env.local file');
  console.error('\nIf you don\'t have SUPABASE_SERVICE_KEY, you can:');
  console.error('1. Go to your Supabase dashboard');
  console.error('2. Navigate to Settings > API');
  console.error('3. Copy the "service_role" key (not anon key)');
  console.error('4. Add it to .env.local as SUPABASE_SERVICE_KEY=your_key_here');
  console.error('\n⚠️  For now, you can manually fix this by:');
  console.error('1. Go to Supabase Dashboard > SQL Editor');
  console.error('2. Run: ALTER TABLE annotations DISABLE ROW LEVEL SECURITY;');
  process.exit(1);
}

// Create client with service key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
});

async function fixAnnotationsPolicies() {
  try {
    console.log('🔧 Attempting to fix annotations table policies...\n');

    // Since we can't run raw SQL from the client library,
    // we'll test the current state and provide instructions

    // Test current access
    console.log('Testing current access levels...');

    // Test read
    const { data: readTest, error: readError } = await supabase
      .from('annotations')
      .select('*')
      .limit(1);

    if (readError) {
      console.log('❌ Cannot read from annotations table');
    } else {
      console.log('✅ Can read from annotations table');
    }

    // Test insert
    const testAnnotation = {
      model_id: '00000000-0000-0000-0000-000000000000', // Valid UUID
      title: 'RLS Test',
      description: 'Testing RLS policies',
      position: { x: 0, y: 0, z: 0 },
      color: '#ff0000'
    };

    const { data: insertTest, error: insertError } = await supabase
      .from('annotations')
      .insert([testAnnotation])
      .select();

    if (insertError && insertError.code === '42501') {
      console.log('❌ Cannot insert into annotations table (RLS policy blocking)');
      console.log('\n📋 To fix this, run the following SQL in your Supabase dashboard:\n');
      console.log('----------------------------------------');
      console.log('-- Option 1: Quick fix (disable RLS)');
      console.log('ALTER TABLE annotations DISABLE ROW LEVEL SECURITY;');
      console.log('');
      console.log('-- Option 2: Proper policies (keeps RLS enabled)');
      console.log('-- First ensure RLS is enabled');
      console.log('ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;');
      console.log('');
      console.log('-- Drop existing policies if any');
      console.log('DROP POLICY IF EXISTS "Allow public read access" ON annotations;');
      console.log('DROP POLICY IF EXISTS "Allow public insert access" ON annotations;');
      console.log('DROP POLICY IF EXISTS "Allow public update access" ON annotations;');
      console.log('DROP POLICY IF EXISTS "Allow public delete access" ON annotations;');
      console.log('');
      console.log('-- Create new permissive policies');
      console.log('CREATE POLICY "Allow public read access" ON annotations FOR SELECT USING (true);');
      console.log('CREATE POLICY "Allow public insert access" ON annotations FOR INSERT WITH CHECK (true);');
      console.log('CREATE POLICY "Allow public update access" ON annotations FOR UPDATE USING (true) WITH CHECK (true);');
      console.log('CREATE POLICY "Allow public delete access" ON annotations FOR DELETE USING (true);');
      console.log('----------------------------------------\n');
      console.log('📌 Steps:');
      console.log('1. Go to: ' + supabaseUrl.replace('supabase.co', 'supabase.com') + '/project/*/sql');
      console.log('2. Paste and run the SQL above');
      console.log('3. Try saving annotations again');
    } else if (insertError) {
      console.log('❌ Insert failed with different error:', insertError);
    } else {
      console.log('✅ Can insert into annotations table');

      // Clean up test annotation
      if (insertTest && insertTest[0]) {
        await supabase
          .from('annotations')
          .delete()
          .eq('id', insertTest[0].id);
        console.log('✅ Test annotation cleaned up');
      }

      console.log('\n🎉 Annotations table is properly configured!');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

fixAnnotationsPolicies();