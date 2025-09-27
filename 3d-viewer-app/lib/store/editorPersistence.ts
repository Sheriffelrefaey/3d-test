import { supabase } from '@/lib/supabase/client';
import type { ObjectMaterial, ObjectTransform, ModelEnvironment } from '@/types';

// Save materials to database
export async function saveMaterials(materials: ObjectMaterial[]) {
  if (materials.length === 0) return;

  const modelId = materials[0].model_id;

  console.log('Saving materials for model:', modelId);
  console.log('Number of materials to save:', materials.length);

  // Delete existing materials for this model
  const { error: deleteError } = await supabase
    .from('object_materials')
    .delete()
    .eq('model_id', modelId);

  if (deleteError) {
    console.error('Error deleting materials:', deleteError);
    console.error('Delete error details:', JSON.stringify(deleteError, null, 2));
    throw deleteError;
  }

  // Insert new materials, ensuring uniqueness by object_name and generating IDs
  const uniqueMaterials = new Map<string, ObjectMaterial>();

  materials.forEach(material => {
    // Ensure material has an ID and valid material_type
    const materialWithId = {
      ...material,
      id: material.id || crypto.randomUUID(),
      material_type: material.material_type === 'preset' ? 'preset' : 'custom'
    };
    uniqueMaterials.set(material.object_name, materialWithId);
  });

  const materialsToInsert = Array.from(uniqueMaterials.values());

  if (materialsToInsert.length > 0) {
    console.log('Inserting materials:', materialsToInsert);

    const { data: insertData, error: insertError } = await supabase
      .from('object_materials')
      .insert(materialsToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting materials:', insertError);
      console.error('Insert error details:', JSON.stringify(insertError, null, 2));
      console.error('Materials being inserted:', JSON.stringify(materialsToInsert, null, 2));
      throw insertError;
    }

    console.log('Successfully inserted', insertData?.length, 'materials');
  }
}

// Save transforms to database
export async function saveTransforms(transforms: ObjectTransform[]) {
  if (transforms.length === 0) return;

  const modelId = transforms[0].model_id;

  console.log('Saving transforms for model:', modelId);
  console.log('Number of transforms to save:', transforms.length);

  // First, delete all existing transforms for this model
  const { error: deleteError } = await supabase
    .from('object_transforms')
    .delete()
    .eq('model_id', modelId);

  if (deleteError) {
    console.error('Error deleting transforms:', deleteError);
    console.error('Delete error details:', JSON.stringify(deleteError, null, 2));
    throw deleteError;
  }

  // Then insert the new transforms
  // Make sure each transform has unique object_name and required fields
  const uniqueTransforms = new Map<string, ObjectTransform>();

  transforms.forEach(transform => {
    // Ensure all required fields are present
    const validTransform: any = {
      model_id: modelId,
      object_name: transform.object_name,
      visible: transform.visible !== undefined ? transform.visible : true,
      deleted: transform.deleted !== undefined ? transform.deleted : false,
      position: transform.position || { x: 0, y: 0, z: 0 },
      rotation: transform.rotation || { x: 0, y: 0, z: 0 },
      scale: transform.scale || { x: 1, y: 1, z: 1 }
    };

    // Use Map to ensure unique object_name per model
    uniqueTransforms.set(transform.object_name, validTransform);
  });

  const transformsToInsert = Array.from(uniqueTransforms.values());

  if (transformsToInsert.length > 0) {
    console.log('Inserting transforms:', transformsToInsert);

    const { data: insertData, error: insertError } = await supabase
      .from('object_transforms')
      .insert(transformsToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting transforms:', insertError);
      console.error('Insert error details:', JSON.stringify(insertError, null, 2));
      console.error('Transforms being inserted:', JSON.stringify(transformsToInsert, null, 2));
      throw insertError;
    }

    console.log('Successfully inserted', insertData?.length, 'transforms');
  }
}

// Save environment to database
export async function saveEnvironment(environment: ModelEnvironment) {
  // Delete existing environment for this model
  const { error: deleteError } = await supabase
    .from('model_environments')
    .delete()
    .eq('model_id', environment.model_id);

  if (deleteError) {
    console.error('Error deleting environment:', deleteError);
    throw deleteError;
  }

  // Insert new environment
  const { error: insertError } = await supabase
    .from('model_environments')
    .insert(environment);

  if (insertError) {
    console.error('Error inserting environment:', insertError);
    throw insertError;
  }
}

// Load materials from database
export async function loadMaterials(modelId: string): Promise<ObjectMaterial[]> {
  const { data, error } = await supabase
    .from('object_materials')
    .select('*')
    .eq('model_id', modelId);

  if (error) {
    console.error('Error loading materials:', error);
    return [];
  }

  return data || [];
}

// Load transforms from database
export async function loadTransforms(modelId: string): Promise<ObjectTransform[]> {
  const { data, error } = await supabase
    .from('object_transforms')
    .select('*')
    .eq('model_id', modelId);

  if (error) {
    console.error('Error loading transforms:', error);
    return [];
  }

  return data || [];
}

// Load environment from database
export async function loadEnvironment(modelId: string): Promise<ModelEnvironment | null> {
  const { data, error } = await supabase
    .from('model_environments')
    .select('*')
    .eq('model_id', modelId)
    .single();

  if (error) {
    // Don't log error if it's just that no row exists (PGRST116)
    if (error.code !== 'PGRST116') {
      console.error('Error loading environment:', error);
    }
    return null;
  }

  return data;
}