'use client';

import React, { useState, useEffect } from 'react';
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
  };

  const handleDelete = () => {
    // eslint-disable-next-line no-alert
    if (window.confirm('Are you sure you want to delete this annotation?')) {
      onDelete(annotation);
    }
  };

  const handleChange = () => {
    setIsDirty(true);
  };

  return (
    <div className="absolute top-1/2 right-4 transform -translate-y-1/2 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 rounded-t-lg">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Edit Annotation
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Object Name (read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Object Name
          </label>
          <input
            type="text"
            value={annotation.object_name}
            readOnly
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600 cursor-not-allowed"
          />
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              handleChange();
            }}
            placeholder="Enter annotation title..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              handleChange();
            }}
            placeholder="Enter detailed description..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
        </div>

        {/* Position Info */}
        <div className="bg-gray-50 p-3 rounded-md">
          <p className="text-xs font-medium text-gray-600 mb-1">Position (X, Y, Z)</p>
          <p className="text-sm font-mono text-gray-800">
            {annotation.position_x.toFixed(2)}, {annotation.position_y.toFixed(2)}, {annotation.position_z.toFixed(2)}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-2">
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            Delete
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim() || !isDirty}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}