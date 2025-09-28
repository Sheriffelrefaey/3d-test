'use client';

import { use, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import type { Annotation } from '@/types';
import { supabase } from '@/lib/supabase/client';
import LoaderScreen from '@/components/ui/LoaderScreen';

const DarkEnhancedModelEditor = dynamic(() => import('@/components/3d/DarkEnhancedModelEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-lg">Loading 3D Model...</div>
    </div>
  ),
});

interface ViewerPageProps {
  params: Promise<{ id: string }>;
}

interface Model {
  id: string;
  name: string;
  description?: string;
  file_url: string;
  file_size?: number;
  created_at: string;
  updated_at: string;
}

export default function ViewerPage({ params }: ViewerPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [model, setModel] = useState<Model | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [_isFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    const fetchModel = async () => {
      try {
        setLoading(true);

        // Fetch model from database
        const { data: modelData, error: modelError } = await supabase
          .from('models')
          .select('*')
          .eq('id', resolvedParams.id)
          .single();

        if (modelError) {
          throw new Error('Model not found');
        }

        setModel(modelData);

        // Fetch annotations for this model
        const { data: annotationsData, error: annotationsError } = await supabase
          .from('annotations')
          .select('*')
          .eq('model_id', resolvedParams.id);

        if (!annotationsError && annotationsData) {
          // Convert position format
          const convertedAnnotations = annotationsData.map(ann => ({
            ...ann,
            position_x: ann.position?.x || 0,
            position_y: ann.position?.y || 0,
            position_z: ann.position?.z || 0,
            object_name: ann.object_name || 'Object'
          }));
          setAnnotations(convertedAnnotations);
        } else {
          // No annotations found, leave empty
          setAnnotations([]);
        }
      } catch (err) {
        console.error('Error fetching model:', err);
        setError(err instanceof Error ? err.message : 'Failed to load model');
      } finally {
        setLoading(false);
      }
    };

    fetchModel();
  }, [resolvedParams.id]);


  // Remove the old loading screen - we use the new LoaderScreen component now

  if (!loading && (error || !model)) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-700 via-gray-800 to-gray-700">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error || 'Model not found'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative bg-black">
      {/* Loader Screen */}
      {(showLoader || loading) && (
        <LoaderScreen
          duration={7000}
          onComplete={() => setShowLoader(false)}
        />
      )}

      {/* 3D Viewer - Full Screen */}
      {model && !loading && (
        <DarkEnhancedModelEditor
          modelUrl={model.file_url}
          modelId={model.id}
          annotations={annotations}
          onAnnotationsChange={() => {}} // Read-only - no changes
          onSave={() => {}} // Read-only - no save
          readOnly={true} // Add this prop to disable editing
        />
      )}
    </div>
  );
}