require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testWithRealModel() {
  try {
    // First, get a real model ID
    const { data: models, error: modelError } = await supabase
      .from('models')
      .select('id, name')
      .limit(1);

    if (modelError || !models || models.length === 0) {
      console.error('No models found in database');
      return;
    }

    const modelId = models[0].id;
    console.log(`Testing with model: ${models[0].name} (${modelId})`);

    // Try to insert an annotation for this model
    const testAnnotation = {
      model_id: modelId,
      title: 'Test Annotation',
      description: 'This is a test',
      position: { x: 1, y: 2, z: 3 },
      color: '#ff0000'
    };

    console.log('\nInserting test annotation...');
    const { data: insertData, error: insertError } = await supabase
      .from('annotations')
      .insert([testAnnotation])
      .select();

    if (insertError) {
      console.error('❌ Insert failed:', insertError);

      if (insertError.code === '42501') {
        console.log('\n⚠️  This is a Row Level Security issue!');
        console.log('\nTo fix, go to your Supabase dashboard SQL editor and run:');
        console.log('ALTER TABLE annotations DISABLE ROW LEVEL SECURITY;');
        console.log('\nOr create proper policies as shown in the previous output.');
      }
    } else {
      console.log('✅ Successfully inserted annotation!');
      console.log('Annotation data:', insertData[0]);

      // Clean up
      const { error: deleteError } = await supabase
        .from('annotations')
        .delete()
        .eq('id', insertData[0].id);

      if (!deleteError) {
        console.log('✅ Test annotation cleaned up');
      }

      console.log('\n🎉 Everything is working! Your annotations should save now.');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testWithRealModel();