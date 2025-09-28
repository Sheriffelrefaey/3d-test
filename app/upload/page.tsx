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
    <div className="min-h-screen bg-gray-900 text-white relative">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(90deg, #ffffff 1px, transparent 1px), linear-gradient(180deg, #ffffff 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="relative z-10 container mx-auto px-6 py-16">
        <button
          onClick={() => router.push('/')}
          className="mb-8 px-4 py-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg text-gray-300 hover:text-white hover:border-gray-500 transition-all inline-flex items-center gap-2"
        >
          ← Back to Home
        </button>

        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8">
            <h1 className="text-3xl font-light mb-2">
              <span className="bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                Upload 3D Model
              </span>
            </h1>
            <p className="text-gray-400 text-sm mb-8">
              Upload your 3D model to view and annotate it
            </p>

            {/* Drop zone */}
            <div
              className={`relative rounded-xl border-2 border-dashed transition-all ${
                dragActive
                  ? 'border-gray-500 bg-gray-800/30'
                  : file
                    ? 'border-gray-600 bg-gray-800/20'
                    : 'border-gray-700 bg-gray-800/10'
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
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center mb-4">
                      <Check className="w-8 h-8 text-green-400" strokeWidth={1} />
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-light text-white mb-1">{file.name}</p>
                      <p className="text-gray-500 text-sm">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setFile(null);
                          setModelName('');
                        }}
                        className="mt-4 text-gray-400 hover:text-gray-200 transition-colors inline-flex items-center gap-2 text-sm"
                      >
                        <X className="w-4 h-4" strokeWidth={1} />
                        Remove file
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center mb-4">
                      <Upload className="w-8 h-8 text-gray-300" strokeWidth={1} />
                    </div>
                    <p className="text-xl font-light text-white mb-1">
                      Drop your 3D model here
                    </p>
                    <p className="text-gray-400 text-sm">or click to browse</p>
                    <p className="text-xs text-gray-500 mt-4">
                      Supports: GLTF, GLB, OBJ, FBX (max 100MB)
                    </p>
                  </>
                )}
              </label>
            </div>

            {file && (
              <div className="mt-8 space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-light text-gray-300 mb-2">
                    Model Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:border-gray-500 focus:outline-none transition-colors"
                    placeholder="Enter model name"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-light text-gray-300 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:border-gray-500 focus:outline-none transition-colors resize-none"
                    placeholder="Enter model description"
                  />
                </div>

                <button
                  onClick={handleUpload}
                  disabled={loading || !modelName}
                  className="w-full py-3 rounded-lg bg-white text-gray-900 font-medium hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1} />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" strokeWidth={1} />
                      Upload Model
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="mt-8 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-light text-white mb-3">Tips for best results:</h2>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                Use GLTF/GLB format for best compatibility
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                Keep file sizes under 50MB for optimal performance
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                Ensure textures are embedded or in the same directory
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                Use descriptive names for easy identification
              </li>
            </ul>
          </div>
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
  );
}