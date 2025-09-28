'use client';

import { use, useEffect, useState, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase/client';
import type { Model, Annotation } from '@/types';

// Use the new dark enhanced editor
const DarkEnhancedModelEditor = dynamic(() => import('@/components/3d/DarkEnhancedModelEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-black">
      <div className="text-lg text-white">Loading Enhanced 3D Editor...</div>
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

      // Convert position format
      const convertedAnnotations = (annotationData || []).map(ann => ({
        ...ann,
        position_x: ann.position?.x || 0,
        position_y: ann.position?.y || 0,
        position_z: ann.position?.z || 0,
        object_name: ann.object_name || 'Object'
      }));

      setAnnotations(convertedAnnotations);
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
            object_name: ann.object_name || 'Object', // Include object_name field
            title: ann.title,
            description: ann.description || '',
            position: {
              x: ann.position_x || 0,
              y: ann.position_y || 0,
              z: ann.position_z || 0
            },
            color: ann.color || '#ff0000'
          }));

          console.log('Inserting annotations:', annotationsToInsert);

          const { data: insertData, error: insertError } = await supabase
            .from('annotations')
            .insert(annotationsToInsert)
            .select();

          if (insertError) {
            console.error('Insert error:', insertError);
            console.error('Insert error details:', JSON.stringify(insertError, null, 2));
            console.error('Data being inserted:', JSON.stringify(annotationsToInsert, null, 2));
            throw new Error(insertError.message || 'Failed to insert annotations');
          }

          console.log('Inserted annotations:', insertData);
        }
      }

      // Success feedback
      console.log('Annotations saved successfully!');
      toast.success('Annotations saved successfully!', {
        position: 'bottom-left',
        duration: 3000,
      });

      // Fetch updated annotations to sync IDs
      await fetchModelData();
    } catch (error) {
      console.error('Error saving annotations:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));

      // Show more detailed error information
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        toast.error(`Failed to save annotations: ${error.message}`, {
          position: 'bottom-left',
          duration: 4000,
        });
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        toast.error(`Failed to save annotations: ${(error as any).message}`, {
          position: 'bottom-left',
          duration: 4000,
        });
      } else {
        toast.error('Failed to save annotations. Please check the console for details.', {
          position: 'bottom-left',
          duration: 4000,
        });
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
    <div className="h-screen bg-black">
      {/* Use the dark enhanced editor directly without header */}
      <DarkEnhancedModelEditor
        modelUrl={model.file_url}
        modelId={resolvedParams.id}
        annotations={annotations}
        onAnnotationsChange={setAnnotations}
        onSave={() => handleSaveAnnotations(annotations)}
      />

      {/* Toast Notifications */}
      <Toaster
        toastOptions={{
          className: '',
          style: {
            background: 'rgba(17, 24, 39, 0.95)',
            color: '#fff',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
}