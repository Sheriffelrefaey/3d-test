'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Annotation } from '@/types';

interface AnnotationPanelProps {
  annotation: Annotation;
  onUpdate: (annotation: Annotation) => void;
  onDelete: (annotation: Annotation) => void;
  onClose: () => void;
}

export default function AnnotationPanel({
  annotation,
  onUpdate,
  onDelete,
  onClose
}: AnnotationPanelProps) {
  const [title, setTitle] = useState(annotation.title || '');
  const [description, setDescription] = useState(annotation.description || '');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setTitle(annotation.title || '');
    setDescription(annotation.description || '');
    setIsDirty(false);
  }, [annotation]);

  const handleSave = () => {
    const updatedAnnotation: Annotation = {
      ...annotation,
      title,
      description,
    };
    onUpdate(updatedAnnotation);
    setIsDirty(false);
    toast.success('Annotation updated successfully', {
      position: 'bottom-left',
      duration: 3000,
    });
  };

  const handleDelete = () => {
    onDelete(annotation);
    toast.success('Annotation deleted', {
      position: 'bottom-left',
      duration: 3000,
    });
  };

  const handleChange = () => {
    setIsDirty(true);
  };

  return (
    <div className="space-y-3 text-white">
      {/* Header */}
      <div className="glass-panel-light p-3 rounded-lg">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-white">
            Edit Annotation
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title="Close"
          >
            <X size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="glass-panel-light rounded-lg p-3 space-y-3">
        {/* Object Name (read-only) */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Object Name
          </label>
          <input
            type="text"
            value={annotation.object_name}
            readOnly
            className="w-full px-2 py-1.5 bg-black/30 border border-white/10 rounded text-sm text-gray-300 cursor-not-allowed"
          />
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              handleChange();
            }}
            placeholder="Enter annotation title"
            className="w-full px-2 py-1.5 bg-black/30 border border-white/10 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              handleChange();
            }}
            placeholder="Enter annotation description"
            rows={3}
            className="w-full px-2 py-1.5 bg-black/30 border border-white/10 rounded text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>

        {/* Position (read-only) */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Position
          </label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-gray-500">X</label>
              <input
                type="text"
                value={annotation.position_x.toFixed(2)}
                readOnly
                className="w-full px-2 py-1 bg-black/30 border border-white/10 rounded text-xs text-gray-300 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Y</label>
              <input
                type="text"
                value={annotation.position_y.toFixed(2)}
                readOnly
                className="w-full px-2 py-1 bg-black/30 border border-white/10 rounded text-xs text-gray-300 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Z</label>
              <input
                type="text"
                value={annotation.position_z.toFixed(2)}
                readOnly
                className="w-full px-2 py-1 bg-black/30 border border-white/10 rounded text-xs text-gray-300 cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!isDirty || !title.trim()}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all ${
            isDirty && title.trim()
              ? 'glass-button bg-blue-500/20 hover:bg-blue-500/30 text-blue-400'
              : 'glass bg-white/5 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Save size={14} />
          Save Changes
        </button>

        <button
          onClick={handleDelete}
          className="px-3 py-2 glass-button rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all text-sm"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="text-xs text-gray-500 text-center">
        * Click on any object in the 3D view to set annotation position
      </div>
    </div>
  );
}