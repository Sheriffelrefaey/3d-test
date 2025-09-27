'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase/client';
import type { Model, Annotation } from '@/types';

const ModelEditor = dynamic(() => import('@/components/3d/ModelEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <div className="text-lg">Loading 3D Editor...</div>
    </div>
  ),
});

interface EditPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditModelPage({ params }: EditPageProps) {
  const resolvedParams = use(params);
  const [model, setModel] = useState<Model | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const fetchModelData = useCallback(async () => {
    try {
      // Fetch model details
      const { data: modelData, error: modelError } = await supabase
        .from('models')
        .select('*')
        .eq('id', resolvedParams.id)
        .single();

      if (modelError) throw modelError;
      setModel(modelData);

      // Fetch existing annotations
      const { data: annotationData, error: annotationError } = await supabase
        .from('annotations')
        .select('*')
        .eq('model_id', resolvedParams.id);

      if (annotationError) throw annotationError;
      setAnnotations(annotationData || []);
    } catch (error) {
      console.error('Error fetching model data:', error);
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    fetchModelData();
  }, [fetchModelData]);

  const handleSaveAnnotations = async (updatedAnnotations: Annotation[]) => {
    setSaving(true);
    console.log('Saving annotations:', updatedAnnotations);

    try {
      // First, delete ALL existing annotations for this model
      const { error: deleteError } = await supabase
        .from('annotations')
        .delete()
        .eq('model_id', resolvedParams.id)
        .neq('id', '00000000-0000-0000-0000-000000000000'); // This ensures we delete all records

      if (deleteError) {
        console.error('Delete error:', deleteError);
        throw deleteError;
      }

      // Insert new annotations if any exist
      if (updatedAnnotations.length > 0) {
        // Filter out annotations without titles (they're not complete)
        const validAnnotations = updatedAnnotations.filter(ann => ann.title && ann.title.trim() !== '');

        if (validAnnotations.length > 0) {
          const annotationsToInsert = validAnnotations.map(ann => ({
            model_id: resolvedParams.id,
            object_name: ann.object_name || 'Unknown',
            title: ann.title,
            description: ann.description || '',
            position_x: ann.position_x || 0,
            position_y: ann.position_y || 0,
            position_z: ann.position_z || 0,
          }));

          console.log('Inserting annotations:', annotationsToInsert);

          const { data: insertData, error: insertError } = await supabase
            .from('annotations')
            .insert(annotationsToInsert)
            .select();

          if (insertError) {
            console.error('Insert error:', insertError);
            throw insertError;
          }

          console.log('Inserted annotations:', insertData);
        }
      }

      // Success feedback
      console.log('Annotations saved successfully!');
      alert('Annotations saved successfully!');

      // Fetch updated annotations to sync IDs
      await fetchModelData();
    } catch (error) {
      console.error('Error saving annotations:', error);
      // Show more detailed error information
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        alert(`Failed to save annotations: ${error.message}`);
      } else {
        alert('Failed to save annotations. Please check the console for details.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading model...</div>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Model not found</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold">Edit Model: {model.name}</h1>
              <p className="text-gray-600">Click on objects to add annotations</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/admin')}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => router.push(`/viewer/${resolvedParams.id}`)}
                className="px-4 py-2 border border-blue-500 text-blue-500 rounded-md hover:bg-blue-50"
              >
                Preview
              </button>
              <button
                onClick={() => handleSaveAnnotations(annotations)}
                disabled={saving}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Annotations'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Editor */}
      <div className="flex-1 relative">
        <ModelEditor
          modelUrl={model.file_url}
          modelId={resolvedParams.id}
          annotations={annotations}
          onAnnotationsChange={setAnnotations}
          onSave={handleSaveAnnotations}
        />
      </div>
    </div>
  );
}