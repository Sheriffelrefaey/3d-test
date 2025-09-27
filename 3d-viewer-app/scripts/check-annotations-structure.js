require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTable() {
  // Try to select all columns
  const { data, error } = await supabase
    .from('annotations')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Annotations table structure:');
    if (data && data.length > 0) {
      console.log('Columns:', Object.keys(data[0]));
      console.log('Sample row:', data[0]);
    } else {
      console.log('No data in table, trying insert with minimal fields...');

      // Try with just the basic fields
      const testInsert = {
        model_id: 'test-123',
        title: 'Test',
        description: 'Test description',
        position: { x: 0, y: 0, z: 0 }
      };

      const { data: insertData, error: insertError } = await supabase
        .from('annotations')
        .insert([testInsert])
        .select();

      if (insertError) {
        console.error('Insert error:', insertError);

        // Try another structure
        const testInsert2 = {
          model_id: 'test-123',
          title: 'Test',
          description: 'Test description',
          position_x: 0,
          position_y: 0,
          position_z: 0
        };

        const { error: insertError2 } = await supabase
          .from('annotations')
          .insert([testInsert2])
          .select();

        if (insertError2) {
          console.error('Insert error 2:', insertError2);
        }
      } else {
        console.log('Successful insert! Columns:', Object.keys(insertData[0]));

        // Clean up
        await supabase
          .from('annotations')
          .delete()
          .eq('id', insertData[0].id);
      }
    }
  }
}

checkTable();