'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, Check, Loader2 } from 'lucide-react';

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [modelName, setModelName] = useState('');
  const [description, setDescription] = useState('');

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (isValidFileType(droppedFile)) {
        setFile(droppedFile);
        setModelName(droppedFile.name.split('.')[0] || '');
      } else {
        console.error('Please upload a valid 3D model file (GLTF, GLB, OBJ, or FBX)');
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (isValidFileType(selectedFile)) {
        setFile(selectedFile);
        setModelName(selectedFile.name.split('.')[0] || '');
      } else {
        console.error('Please upload a valid 3D model file (GLTF, GLB, OBJ, or FBX)');
      }
    }
  };

  const isValidFileType = (file: File) => {
    const validTypes = ['.gltf', '.glb', '.obj', '.fbx'];
    const fileName = file.name.toLowerCase();
    return validTypes.some(type => fileName.endsWith(type));
  };

  const handleUpload = async () => {
    if (!file || !modelName) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', modelName);
      formData.append('description', description);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/viewer/${data.id}`);
      } else {
        console.error('Upload failed. Please try again.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      console.error('An error occurred during upload.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-blue-900/20 to-purple-900/20">
        <div className="absolute top-20 left-20 w-72 h-72 bg-green-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16">
        <button
          onClick={() => router.push('/')}
          className="mb-8 glass rounded-lg px-4 py-2 text-gray-300 hover:text-white transition-colors inline-flex items-center gap-2"
        >
          ← Back to Home
        </button>

        <div className="max-w-2xl mx-auto">
          <div className="glass rounded-3xl p-8">
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
              Upload 3D Model
            </h1>
            <p className="text-gray-400 mb-8">
              Upload your 3D model to view and annotate it
            </p>

            {/* Drop zone */}
            <div
              className={`relative rounded-2xl border-2 border-dashed transition-all ${
                dragActive
                  ? 'border-green-400 bg-green-400/10'
                  : file
                    ? 'border-blue-400 bg-blue-400/5'
                    : 'border-gray-600 bg-black/20'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileChange}
                accept=".gltf,.glb,.obj,.fbx"
              />

              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center py-16 px-4 cursor-pointer"
              >
                {file ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-4">
                      <Check className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-semibold text-white mb-1">{file.name}</p>
                      <p className="text-gray-400">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setFile(null);
                          setModelName('');
                        }}
                        className="mt-4 text-red-400 hover:text-red-300 transition-colors inline-flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Remove file
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4">
                      <Upload className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-xl font-semibold text-white mb-1">
                      Drop your 3D model here
                    </p>
                    <p className="text-gray-400">or click to browse</p>
                    <p className="text-sm text-gray-500 mt-4">
                      Supports: GLTF, GLB, OBJ, FBX (max 100MB)
                    </p>
                  </>
                )}
              </label>
            </div>

            {file && (
              <div className="mt-8 space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                    Model Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg glass border border-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors"
                    placeholder="Enter model name"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg glass border border-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors resize-none"
                    placeholder="Enter model description"
                  />
                </div>

                <button
                  onClick={handleUpload}
                  disabled={loading || !modelName}
                  className="w-full py-4 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Upload Model
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="mt-8 glass rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">Tips for best results:</h2>
            <ul className="space-y-2 text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">•</span>
                Use GLTF/GLB format for best compatibility
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">•</span>
                Keep file sizes under 50MB for optimal performance
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">•</span>
                Ensure textures are embedded or in the same directory
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">•</span>
                Use descriptive names for easy identification
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}