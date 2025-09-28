const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createModelsBucket() {
  console.log('Creating models storage bucket...');

  try {
    // Create the bucket
    const { data, error } = await supabase.storage.createBucket('models', {
      public: true,
      allowedMimeTypes: [
        'model/gltf-binary',
        'model/gltf+json',
        'application/octet-stream',
        'model/obj',
        'model/fbx',
      ],
      fileSizeLimit: 104857600, // 100MB
    });

    if (error) {
      if (error.message.includes('already exists')) {
        console.log('✓ Models bucket already exists');
      } else {
        console.error('Error creating bucket:', error.message);
      }
    } else {
      console.log('✓ Models bucket created successfully');
    }

    // List all buckets to confirm
    const { data: buckets } = await supabase.storage.listBuckets();
    console.log('\nAvailable buckets:', buckets?.map(b => b.name).join(', '));

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createModelsBucket();