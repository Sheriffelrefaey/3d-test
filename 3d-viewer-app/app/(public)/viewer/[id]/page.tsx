'use client';

import { use, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import type { Annotation } from '@/types';
import { Maximize2, Home, Settings, X, Eye, EyeOff, RotateCw, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

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
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [_isFullscreen, setIsFullscreen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleReset = () => {
    // Reset camera view - would be handled by ModelViewer
    window.location.reload();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(2)} KB` : `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const getFileFormat = (url: string) => {
    const ext = url.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'glb': return 'GLB (Binary GLTF)';
      case 'gltf': return 'GLTF 2.0';
      case 'obj': return 'Wavefront OBJ';
      case 'fbx': return 'Autodesk FBX';
      default: return ext?.toUpperCase() || 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-700 via-gray-800 to-gray-700">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading model...</p>
        </div>
      </div>
    );
  }

  if (error || !model) {
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
      {/* 3D Viewer - Full Screen */}
      <DarkEnhancedModelEditor
        modelUrl={model.file_url}
        modelId={model.id}
        annotations={annotations}
        onAnnotationsChange={() => {}} // Read-only - no changes
        onSave={() => {}} // Read-only - no save
        readOnly={true} // Add this prop to disable editing
      />
    </div>
  );
}