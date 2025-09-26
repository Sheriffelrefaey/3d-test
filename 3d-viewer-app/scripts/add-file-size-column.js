const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addFileSizeColumn() {
  console.log('Adding file_size column to models table...');

  try {
    // Execute SQL to add the column if it doesn't exist
    const { error } = await supabase.rpc('execute_sql', {
      query: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name='models'
            AND column_name='file_size'
          ) THEN
            ALTER TABLE models ADD COLUMN file_size BIGINT;
          END IF;
        END $$;
      `
    }).single();

    if (error) {
      // If RPC doesn't exist, try a different approach
      console.log('Note: Could not add column via RPC. Please run this SQL manually in Supabase dashboard:');
      console.log('\nALTER TABLE models ADD COLUMN IF NOT EXISTS file_size BIGINT;\n');
    } else {
      console.log('✓ file_size column added successfully (or already exists)');
    }

    // Verify the column exists by trying to query it
    const { data, error: queryError } = await supabase
      .from('models')
      .select('id, name, file_size')
      .limit(1);

    if (!queryError) {
      console.log('✓ Verified: file_size column is accessible');
    } else if (queryError.message.includes('file_size')) {
      console.log('⚠ Column may not exist yet. Please add it manually in Supabase dashboard.');
    }

  } catch (error) {
    console.error('Error:', error);
    console.log('\nPlease run this SQL in your Supabase dashboard SQL editor:');
    console.log('ALTER TABLE models ADD COLUMN IF NOT EXISTS file_size BIGINT;');
  }
}

addFileSizeColumn();