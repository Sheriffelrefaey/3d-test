const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  console.log('URL:', supabaseUrl);

  try {
    // Test 1: Check if models table exists
    console.log('\n1. Checking models table...');
    const { data: models, error: modelsError } = await supabase
      .from('models')
      .select('*')
      .limit(5);

    if (modelsError) {
      console.log('   Models table error:', modelsError.message);
    } else {
      console.log('   ✓ Models table accessible');
      console.log('   Found', models?.length || 0, 'models');
    }

    // Test 2: Check if annotations table exists
    console.log('\n2. Checking annotations table...');
    const { data: annotations, error: annotationsError } = await supabase
      .from('annotations')
      .select('*')
      .limit(5);

    if (annotationsError) {
      console.log('   Annotations table error:', annotationsError.message);
    } else {
      console.log('   ✓ Annotations table accessible');
      console.log('   Found', annotations?.length || 0, 'annotations');
    }

    // Test 3: Check storage bucket
    console.log('\n3. Checking storage bucket...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.log('   Storage error:', bucketsError.message);
    } else {
      console.log('   ✓ Storage accessible');
      const modelsBucket = buckets?.find(b => b.name === 'models');
      if (modelsBucket) {
        console.log('   ✓ Models bucket exists');
      } else {
        console.log('   ⚠ Models bucket not found. Available buckets:', buckets?.map(b => b.name).join(', '));
      }
    }

    console.log('\n✅ Connection test complete!');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testConnection();