'use client';

import { use, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import type { Annotation } from '@/types';
import { Maximize2, Home, Settings, X, Eye, EyeOff, RotateCw, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

const ModelViewerWithAnnotations = dynamic(() => import('@/components/3d/ModelViewerWithAnnotations'), {
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
          setAnnotations(annotationsData);
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
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-600 via-gray-700 to-gray-600">
      {/* Header */}
      <header className="glass-dark border-b border-white/10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Home"
            >
              <Home className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h1 className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                {model.name}
              </h1>
              {model.description && (
                <p className="text-sm text-gray-400 mt-0.5">{model.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAnnotations(!showAnnotations)}
              className={`p-2 rounded-lg transition-all ${
                showAnnotations
                  ? 'glass bg-blue-500/20 text-blue-400'
                  : 'hover:bg-white/10 text-gray-400'
              }`}
              title={showAnnotations ? 'Hide Annotations' : 'Show Annotations'}
            >
              {showAnnotations ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
            <button
              onClick={handleReset}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400"
              title="Reset View"
            >
              <RotateCw className="w-5 h-5" />
            </button>
            <a
              href={model.file_url}
              download
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400"
              title="Download Model"
            >
              <Download className="w-5 h-5" />
            </a>
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400"
              title="Toggle Sidebar"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400"
              title="Fullscreen"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* 3D Viewer */}
        <div className="flex-1 relative">
          <ModelViewerWithAnnotations
            modelUrl={model.file_url}
            annotations={showAnnotations ? annotations : []}
          />

          {/* Controls overlay */}
          <div className="absolute bottom-4 left-4 glass rounded-lg p-3 text-xs text-gray-400">
            <div>🖱️ Left Click: Rotate</div>
            <div>🖱️ Right Click: Pan</div>
            <div>⚲ Scroll: Zoom</div>
          </div>
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <aside className="w-80 glass-dark border-l border-white/10 overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-white mb-6">Annotations</h2>

              {selectedAnnotation ? (
                <div className="glass rounded-xl p-4 mb-6 border border-blue-500/30 bg-blue-500/10">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="w-3 h-3 rounded-full mt-1 bg-red-500"
                    />
                    <button
                      onClick={() => setSelectedAnnotation(null)}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  <h3 className="font-semibold text-white mb-2">{selectedAnnotation.title}</h3>
                  <p className="text-sm text-gray-300">{selectedAnnotation.description}</p>
                </div>
              ) : (
                <div className="glass rounded-xl p-4 mb-6">
                  <p className="text-gray-400 text-sm">
                    Click on an annotation marker in the 3D view to see details
                  </p>
                </div>
              )}

              <div>
                <h3 className="font-medium text-white mb-4">All Annotations ({annotations.length})</h3>
                <div className="space-y-2">
                  {annotations.map((annotation) => (
                    <button
                      key={annotation.id}
                      onClick={() => setSelectedAnnotation(annotation)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        selectedAnnotation?.id === annotation.id
                          ? 'glass border border-blue-500/50 bg-blue-500/10'
                          : 'glass hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-3 h-3 rounded-full mt-1 flex-shrink-0 bg-red-500"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm text-white">{annotation.title}</p>
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                            {annotation.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Model Info */}
              <div className="mt-8 pt-6 border-t border-white/10">
                <h3 className="font-medium text-white mb-4">Model Information</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Format</span>
                    <span className="text-gray-300">{getFileFormat(model.file_url)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Size</span>
                    <span className="text-gray-300">{formatFileSize(model.file_size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Uploaded</span>
                    <span className="text-gray-300">{formatDate(model.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Model ID</span>
                    <span className="text-gray-300 text-xs font-mono">{model.id.slice(0, 8)}</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}