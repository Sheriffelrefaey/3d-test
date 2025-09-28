'use client';

import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { Plus, Eye, Edit, Trash2, Search, Grid, List, Calendar, FileBox, Box, MessageSquare } from 'lucide-react';
import UploadModal from '@/components/ui/UploadModal';
import type { Model } from '@/types';
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

  const fetchData = async () => {
    await fetchModels();
    // Fetch statistics after models are loaded
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const totalStorage = modelsList.reduce((acc, model) => acc + (model.file_size || 0), 0);

      setStats({
        totalModels: modelsList.length,
        totalViews: viewCount || 0,
        totalAnnotations: annotationCount || 0,
        storageUsed: totalStorage,
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const fetchModels = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('models')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setModels(data || []);
      await fetchStatistics(data || []);
    } catch (error) {
      console.error('Error fetching models:', error);
      toast.error('Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    // eslint-disable-next-line no-alert
    const userConfirmed = window.confirm('Are you sure you want to delete this model?');
    if (!userConfirmed) return;

    try {
      const { error } = await supabase
        .from('models')
        .delete()
        .eq('id', modelId);

      if (error) throw error;

      toast.success('Model deleted successfully');
      fetchModels();
    } catch (error) {
      console.error('Error deleting model:', error);
      toast.error('Failed to delete model');
    }
  };

  const handleUploadSuccess = () => {
    fetchModels();
    setIsUploadModalOpen(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredModels = models.filter(model =>
    model.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Toaster position="top-right" />

      <div className="relative">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(90deg, #ffffff 1px, transparent 1px), linear-gradient(180deg, #ffffff 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />

        <div className="relative z-10">
          {/* Header */}
          <header className="border-b border-gray-700">
            <div className="container mx-auto px-6 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-light">
                    <span className="bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                      Model Dashboard
                    </span>
                  </h1>
                  <p className="text-gray-400 text-sm mt-1">Manage your 3D models and configurations</p>
                </div>
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-all duration-200 font-medium"
                >
                  <Plus size={18} strokeWidth={1.5} />
                  <span className="font-light">Upload Model</span>
                </button>
              </div>
            </div>
          </header>

          {/* Statistics */}
          <div className="container mx-auto px-6 py-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                    <Box size={20} className="text-gray-400" strokeWidth={1} />
                  </div>
                  <div>
                    <p className="text-2xl font-light text-white">{stats.totalModels}</p>
                    <p className="text-xs text-gray-500">Total Models</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                    <Eye size={20} className="text-gray-400" strokeWidth={1} />
                  </div>
                  <div>
                    <p className="text-2xl font-light text-white">{stats.totalViews}</p>
                    <p className="text-xs text-gray-500">Total Views</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                    <MessageSquare size={20} className="text-gray-400" strokeWidth={1} />
                  </div>
                  <div>
                    <p className="text-2xl font-light text-white">{stats.totalAnnotations}</p>
                    <p className="text-xs text-gray-500">Annotations</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                    <FileBox size={20} className="text-gray-400" strokeWidth={1} />
                  </div>
                  <div>
                    <p className="text-2xl font-light text-white">{formatFileSize(stats.storageUsed)}</p>
                    <p className="text-xs text-gray-500">Storage Used</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Search and View Controls */}
            <div className="flex items-center justify-between mb-8">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4" strokeWidth={1} />
                <input
                  type="text"
                  placeholder="Search models..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-500 transition-colors"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <Grid size={18} strokeWidth={1} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <List size={18} strokeWidth={1} />
                </button>
              </div>
            </div>

            {/* Models Display */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
                <p className="text-gray-400 mt-4">Loading models...</p>
              </div>
            ) : filteredModels.length === 0 ? (
              <div className="text-center py-12">
                <Box className="w-16 h-16 text-gray-600 mx-auto mb-4" strokeWidth={1} />
                <p className="text-gray-400 mb-4">No models found</p>
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Upload your first model →
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredModels.map((model) => (
                  <div
                    key={model.id}
                    className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg overflow-hidden hover:border-gray-500 transition-all duration-200 group"
                  >
                    <div className="aspect-square bg-gradient-to-br from-gray-800 to-gray-900 relative">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Box className="w-12 h-12 text-gray-700" strokeWidth={1} />
                      </div>
                      {model.thumbnail_url && (
                        <img
                          src={model.thumbnail_url}
                          alt={model.name}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-light text-gray-200 truncate mb-2">{model.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                        <Calendar size={12} strokeWidth={1} />
                        <span>{formatDate(model.created_at)}</span>
                        <span className="ml-auto">{formatFileSize(model.file_size || 0)}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/viewer/${model.id}`)}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-gray-600 text-gray-300 rounded hover:bg-gray-700 hover:text-white transition-colors"
                        >
                          <Eye size={14} strokeWidth={1} />
                          <span className="text-xs">View</span>
                        </button>
                        <button
                          onClick={() => router.push(`/admin/edit/${model.id}`)}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-gray-600 text-gray-300 rounded hover:bg-gray-700 hover:text-white transition-colors"
                        >
                          <Edit size={14} strokeWidth={1} />
                          <span className="text-xs">Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteModel(model.id)}
                          className="px-3 py-1.5 border border-gray-600 text-gray-400 rounded hover:bg-red-900/30 hover:border-red-800 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} strokeWidth={1} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 font-light text-gray-400 text-sm">Name</th>
                      <th className="text-left py-3 px-4 font-light text-gray-400 text-sm">Date</th>
                      <th className="text-left py-3 px-4 font-light text-gray-400 text-sm">Size</th>
                      <th className="text-right py-3 px-4 font-light text-gray-400 text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredModels.map((model) => (
                      <tr
                        key={model.id}
                        className="border-b border-gray-700/50 hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                              <Box size={16} className="text-gray-600" strokeWidth={1} />
                            </div>
                            <span className="text-gray-200 font-light">{model.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-500 text-sm">
                          {formatDate(model.created_at)}
                        </td>
                        <td className="py-3 px-4 text-gray-500 text-sm">
                          {formatFileSize(model.file_size || 0)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => router.push(`/viewer/${model.id}`)}
                              className="p-1.5 text-gray-500 hover:text-white transition-colors"
                              title="View"
                            >
                              <Eye size={16} strokeWidth={1} />
                            </button>
                            <button
                              onClick={() => router.push(`/admin/edit/${model.id}`)}
                              className="p-1.5 text-gray-500 hover:text-white transition-colors"
                              title="Edit"
                            >
                              <Edit size={16} strokeWidth={1} />
                            </button>
                            <button
                              onClick={() => handleDeleteModel(model.id)}
                              className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} strokeWidth={1} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <footer className="mt-16 border-t border-gray-700 pt-8 pb-4">
            <div className="text-center">
              <p className="text-gray-500 text-sm font-light">
                Powered by <span className="text-gray-300">Weventures AI</span>
              </p>
            </div>
          </footer>
        </div>
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
}