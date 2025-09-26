'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Eye, Edit, Trash2, Search, Grid, List, Upload as UploadIcon, Calendar, FileBox, Box, MessageSquare } from 'lucide-react';
import UploadModal from '@/components/ui/UploadModal';
import { Model, Annotation } from '@/types';
import { supabase } from '@/lib/supabase/client';

export default function AdminPage() {
  const router = useRouter();
  const [models, setModels] = useState<Model[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Statistics
  const [stats, setStats] = useState({
    totalModels: 0,
    totalViews: 0,
    totalAnnotations: 0,
    storageUsed: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await fetchModels();
    // Fetch statistics after models are loaded
  };

  const fetchStatistics = async (modelsList: Model[] = models) => {
    try {
      // Fetch annotation count
      const { count: annotationCount } = await supabase
        .from('annotations')
        .select('*', { count: 'exact', head: true });

      // Fetch interaction count (views)
      const { count: viewCount } = await supabase
        .from('annotation_interactions')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'view');

      // Calculate storage usage from models
      let totalSize = 0;

      // If we have models with file_size, use that
      const { data: modelsWithSize, error: sizeError } = await supabase
        .from('models')
        .select('*');

      if (modelsWithSize) {
        totalSize = modelsWithSize.reduce((sum, model) => {
          return sum + (model.file_size || 0);
        }, 0);
        // Convert bytes to MB
        totalSize = totalSize / (1024 * 1024);
      } else {
        // Fallback estimate
        totalSize = models.length * 5; // Estimate 5MB per model
      }

      setStats({
        totalModels: modelsList.length,
        totalViews: viewCount || 0,
        totalAnnotations: annotationCount || 0,
        storageUsed: totalSize,
      });
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    }
  };

  const fetchModels = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/models');
      if (response.ok) {
        const data = await response.json();
        setModels(data);

        // Update model count in stats
        setStats(prev => ({ ...prev, totalModels: data.length }));

        // Fetch other statistics after models are loaded
        fetchStatistics(data);
      } else {
        setModels([]);
        fetchStatistics([]);
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
      setModels([]);
      fetchStatistics([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this model?')) return;

    try {
      const response = await fetch(`/api/models?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setModels(models.filter(m => m.id !== id));
        // Update stats
        setStats(prev => ({
          ...prev,
          totalModels: prev.totalModels - 1,
          storageUsed: Math.max(0, prev.storageUsed - 5) // Rough estimate
        }));
      } else {
        alert('Failed to delete model');
      }
    } catch (error) {
      console.error('Failed to delete model:', error);
      alert('An error occurred while deleting the model');
    }
  };

  const filteredModels = models.filter(model =>
    model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    model.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatStorageSize = (mb: number) => {
    if (mb < 1) return '0 MB';
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  // Placeholder component for missing thumbnails
  const ModelThumbnail = ({ model }: { model: Model }) => {
    const colors = ['from-purple-600 to-blue-600', 'from-green-600 to-cyan-600', 'from-orange-600 to-pink-600'];
    const colorIndex = parseInt(model.id, 36) % colors.length;

    return (
      <div className={`w-full h-full bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center`}>
        <Box className="w-12 h-12 text-white/80" />
      </div>
    );
  };

  return (
    <div className="min-h-screen relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-cyan-900/20" />

      <div className="relative z-10">
        {/* Header */}
        <div className="glass-dark border-b border-white/10">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  Admin Dashboard
                </h1>
                <p className="text-gray-400 mt-1">Manage your 3D models and annotations</p>
              </div>
              <button
                onClick={() => router.push('/')}
                className="glass rounded-lg px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                ← Back to Home
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="glass rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400">Total Models</span>
                <FileBox className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-3xl font-bold text-white">{stats.totalModels}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.totalModels === 0 ? 'No models yet' : 'In your library'}
              </p>
            </div>
            <div className="glass rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400">Total Views</span>
                <Eye className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-white">{stats.totalViews}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.totalViews === 0 ? 'No views yet' : 'All time'}
              </p>
            </div>
            <div className="glass rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400">Annotations</span>
                <MessageSquare className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-3xl font-bold text-white">{stats.totalAnnotations}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.totalAnnotations === 0 ? 'No annotations' : 'Across all models'}
              </p>
            </div>
            <div className="glass rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400">Storage Used</span>
                <UploadIcon className="w-5 h-5 text-orange-400" />
              </div>
              <p className="text-3xl font-bold text-white">{formatStorageSize(stats.storageUsed)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.storageUsed === 0 ? 'Empty' : 'Estimated usage'}
              </p>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search models..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg glass border border-gray-700 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-3 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'glass bg-purple-500/20 text-purple-400 border border-purple-500/50'
                    : 'glass text-gray-400 hover:text-white'
                }`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-3 rounded-lg transition-all ${
                  viewMode === 'list'
                    ? 'glass bg-purple-500/20 text-purple-400 border border-purple-500/50'
                    : 'glass text-gray-400 hover:text-white'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-semibold hover:from-purple-600 hover:to-cyan-600 transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Upload Model
            </button>
          </div>

          {/* Models Grid/List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-2 text-gray-400">
                <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                Loading models...
              </div>
            </div>
          ) : filteredModels.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <FileBox className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {searchTerm ? 'No models found' : 'No models uploaded yet'}
              </h3>
              <p className="text-gray-400 mb-6">
                {searchTerm ? 'Try adjusting your search terms' : 'Upload your first 3D model to get started'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-semibold hover:from-purple-600 hover:to-cyan-600 transition-all inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Upload Your First Model
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredModels.map((model) => (
                <div key={model.id} className="glass rounded-xl overflow-hidden group hover:scale-[1.02] transition-transform">
                  <div className="aspect-video relative overflow-hidden">
                    <ModelThumbnail model={model} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-2">{model.name}</h3>
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                      {model.description || 'No description'}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(model.created_at)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/viewer/${model.id}`)}
                        className="flex-1 py-2 rounded-lg glass border border-blue-500/50 text-blue-400 hover:bg-blue-500/10 transition-all flex items-center justify-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                      <button
                        onClick={() => router.push(`/admin/edit/${model.id}`)}
                        className="flex-1 py-2 rounded-lg glass border border-purple-500/50 text-purple-400 hover:bg-purple-500/10 transition-all flex items-center justify-center gap-1"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(model.id)}
                        className="py-2 px-3 rounded-lg glass border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredModels.map((model) => (
                <div key={model.id} className="glass rounded-xl p-6 flex items-center gap-6">
                  <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                    <ModelThumbnail model={model} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">{model.name}</h3>
                    <p className="text-gray-400 text-sm mb-2">
                      {model.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(model.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/viewer/${model.id}`)}
                      className="p-2 rounded-lg glass border border-blue-500/50 text-blue-400 hover:bg-blue-500/10 transition-all"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => router.push(`/admin/edit/${model.id}`)}
                      className="p-2 rounded-lg glass border border-purple-500/50 text-purple-400 hover:bg-purple-500/10 transition-all"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(model.id)}
                      className="p-2 rounded-lg glass border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <UploadModal isOpen={isUploadModalOpen} onClose={() => {
        setIsUploadModalOpen(false);
        fetchModels(); // Refresh the list after upload
        fetchStatistics(); // Update statistics
      }} />
    </div>
  );
}