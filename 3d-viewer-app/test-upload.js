const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

console.log('Testing Supabase Storage Upload with Service Key\n');
console.log('URL:', supabaseUrl);
console.log('Service Key exists:', !!supabaseServiceKey);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testUpload() {
  try {
    // Create a test file
    const testContent = 'Test 3D model content';
    const testFileName = `test_model_${Date.now()}.txt`;

    console.log(`\nAttempting to upload: ${testFileName}`);

    // Try to upload
    const { data, error } = await supabase.storage
      .from('models')
      .upload(testFileName, testContent, {
        contentType: 'text/plain',
        upsert: false
      });

    if (error) {
      console.error('\n❌ Upload failed:', error.message);
      console.error('Error details:', error);

      // Check if it's an RLS error
      if (error.message?.includes('row-level security') || error.message?.includes('RLS')) {
        console.log('\n⚠️  This is an RLS policy issue.');
        console.log('Please run the SQL fix in your Supabase Dashboard:');
        console.log('https://supabase.com/dashboard/project/ksbmiosnzixuybijyvwo/sql/new');
        console.log('\nRefer to SUPABASE_FIX_INSTRUCTIONS.md for the SQL to run.');
      }
    } else {
      console.log('\n✅ Upload successful!');
      console.log('File path:', data.path);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('models')
        .getPublicUrl(testFileName);

      console.log('Public URL:', publicUrl);

      // Clean up test file
      const { error: deleteError } = await supabase.storage
        .from('models')
        .remove([testFileName]);

      if (!deleteError) {
        console.log('✅ Test file cleaned up');
      }
    }

    // Also test listing files
    console.log('\n📋 Testing file listing...');
    const { data: files, error: listError } = await supabase.storage
      .from('models')
      .list();

    if (listError) {
      console.log('❌ Cannot list files:', listError.message);
    } else {
      console.log('✅ Can list files. Found', files?.length || 0, 'files');
    }

  } catch (err) {
    console.error('\n❌ Unexpected error:', err);
  }
}

testUpload();