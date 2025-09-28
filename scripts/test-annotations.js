require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAnnotations() {
  try {
    console.log('Testing annotations table...\n');

    // Test 1: Check if we can read from annotations table
    console.log('1. Reading from annotations table:');
    const { data: readData, error: readError } = await supabase
      .from('annotations')
      .select('*')
      .limit(1);

    if (readError) {
      console.error('Read error:', readError);
    } else {
      console.log('Successfully read from annotations table');
      console.log('Sample data:', readData);
    }

    // Test 2: Try to insert a test annotation
    console.log('\n2. Testing insert operation:');
    const testAnnotation = {
      model_id: 'test-model-id-123',
      object_name: 'Test Object',
      title: 'Test Annotation',
      description: 'This is a test annotation',
      position_x: 1.0,
      position_y: 2.0,
      position_z: 3.0
    };

    console.log('Attempting to insert:', testAnnotation);

    const { data: insertData, error: insertError } = await supabase
      .from('annotations')
      .insert([testAnnotation])
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      console.error('Error details:', JSON.stringify(insertError, null, 2));

      // Check if it's a permission issue
      if (insertError.code === '42501') {
        console.error('\n❌ Permission denied - RLS policy issue');
        console.error('You need to configure Row Level Security policies for the annotations table');
      }
    } else {
      console.log('Successfully inserted test annotation:', insertData);

      // Clean up - delete the test annotation
      if (insertData && insertData[0]) {
        const { error: deleteError } = await supabase
          .from('annotations')
          .delete()
          .eq('id', insertData[0].id);

        if (deleteError) {
          console.error('Failed to clean up test annotation:', deleteError);
        } else {
          console.log('Test annotation cleaned up successfully');
        }
      }
    }

    // Test 3: Check table structure
    console.log('\n3. Checking table columns (via select):');
    const { data: schemaData, error: schemaError } = await supabase
      .from('annotations')
      .select('*')
      .limit(0);

    if (!schemaError) {
      console.log('Table is accessible');
    } else {
      console.error('Schema error:', schemaError);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testAnnotations();