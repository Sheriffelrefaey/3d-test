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

async function setupStorage() {
  console.log('Setting up storage bucket for models...\n');

  try {
    // First, check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }

    const modelsBucket = buckets?.find(b => b.name === 'models');

    if (modelsBucket) {
      console.log('✓ Models bucket already exists');
      console.log('  ID:', modelsBucket.id);
      console.log('  Public:', modelsBucket.public);

      // Update bucket to be public if it's not
      if (!modelsBucket.public) {
        const { error: updateError } = await supabase.storage.updateBucket('models', {
          public: true
        });

        if (updateError) {
          console.log('⚠ Could not update bucket to public:', updateError.message);
        } else {
          console.log('✓ Updated bucket to public');
        }
      }
    } else {
      // Create the bucket
      console.log('Creating models bucket...');
      const { data, error } = await supabase.storage.createBucket('models', {
        public: true,
        fileSizeLimit: 104857600, // 100MB
      });

      if (error) {
        console.error('Error creating bucket:', error.message);
      } else {
        console.log('✓ Models bucket created successfully');
        console.log('  ID:', data.name);
      }
    }

    // Test upload permissions
    console.log('\nTesting upload permissions...');
    const testFile = new Blob(['test'], { type: 'text/plain' });
    const { error: uploadError } = await supabase.storage
      .from('models')
      .upload('test.txt', testFile, {
        upsert: true
      });

    if (uploadError) {
      console.log('⚠ Upload test failed:', uploadError.message);
      console.log('\nPlease ensure RLS policies are set up correctly in Supabase dashboard.');
    } else {
      console.log('✓ Upload test successful');

      // Clean up test file
      await supabase.storage.from('models').remove(['test.txt']);
    }

    console.log('\n✅ Storage setup complete!');
    console.log('\nNote: If uploads are still failing, please check:');
    console.log('1. RLS policies in Supabase dashboard (Storage > Policies)');
    console.log('2. Ensure the bucket is set to public');
    console.log('3. Check that your service key has proper permissions');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

setupStorage();