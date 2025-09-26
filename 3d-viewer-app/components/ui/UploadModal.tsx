'use client';

import { useState, useCallback } from 'react';
import { Upload, X, Check, Loader2 } from 'lucide-react';
import Modal from './Modal';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
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
        await response.json();
        resetForm();
        onClose();
        // Don't navigate away, let the user stay on admin page
        // router.push(`/viewer/${data.id}`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.details || errorData.error || 'Upload failed';
        console.error(`Upload failed: ${errorMessage}`);
        console.error('Upload response:', errorData);
      }
    } catch (error) {
      console.error('Upload error:', error);
      console.error(`Error: ${error instanceof Error ? error.message : 'An error occurred during upload'}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setModelName('');
    setDescription('');
    setDragActive(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload 3D Model">
      <div className="space-y-6">
        <p className="text-gray-400">
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
            className="flex flex-col items-center justify-center py-12 px-4 cursor-pointer"
          >
            {file ? (
              <>
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-3">
                  <Check className="w-7 h-7 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-white mb-1">{file.name}</p>
                  <p className="text-gray-400 text-sm">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setFile(null);
                      setModelName('');
                    }}
                    className="mt-3 text-red-400 hover:text-red-300 transition-colors inline-flex items-center gap-1 text-sm"
                  >
                    <X className="w-3 h-3" />
                    Remove file
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-3">
                  <Upload className="w-7 h-7 text-white" />
                </div>
                <p className="text-lg font-semibold text-white mb-1">
                  Drop your 3D model here
                </p>
                <p className="text-gray-400 text-sm">or click to browse</p>
                <p className="text-xs text-gray-500 mt-3">
                  Supports: GLTF, GLB, OBJ, FBX (max 100MB)
                </p>
              </>
            )}
          </label>
        </div>

        {file && (
          <>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                Model Name
              </label>
              <input
                type="text"
                id="name"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg glass border border-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors"
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
                className="w-full px-4 py-2.5 rounded-lg glass border border-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors resize-none"
                placeholder="Enter model description"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 py-3 rounded-lg glass border border-gray-600 text-gray-300 font-medium hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={loading || !modelName}
                className="flex-1 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload Model
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}