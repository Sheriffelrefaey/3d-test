'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Eye, EyeOff, Edit2, Check, X } from 'lucide-react';
import { Annotation } from '@/types';

interface SortableAnnotationItemProps {
  annotation: Annotation;
  toggleVisibility: (id: string) => void;
  handleClick: (annotation: Annotation) => void;
  onRename: (id: string, newName: string) => void;
}

const SortableAnnotationItem: React.FC<SortableAnnotationItemProps> = ({
  annotation,
  toggleVisibility,
  handleClick,
  onRename,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(annotation.menu_name || annotation.title || '');
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: annotation.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editValue.trim()) {
      onRename(annotation.id, editValue.trim());
    } else {
      setEditValue(annotation.menu_name || annotation.title || '');
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(annotation.menu_name || annotation.title || '');
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-2 py-2 border-b border-white/5 last:border-0 ${
        annotation.menu_visible === false ? 'opacity-50' : ''
      } ${isDragging ? 'z-50' : ''}`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-move p-1 text-gray-500 hover:text-white touch-none"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>

      {/* Visibility Toggle */}
      <button
        onClick={() => toggleVisibility(annotation.id)}
        className="p-1 text-gray-500 hover:text-white transition-colors"
        title={annotation.menu_visible === false ? "Show in viewer menu" : "Hide from viewer menu"}
      >
        {annotation.menu_visible === false ? (
          <EyeOff size={16} />
        ) : (
          <Eye size={16} />
        )}
      </button>

      {/* Rename Button */}
      {!isEditing && (
        <button
          onClick={() => setIsEditing(true)}
          className="p-1 text-gray-500 hover:text-white transition-colors"
          title="Rename menu item"
        >
          <Edit2 size={16} />
        </button>
      )}

      {/* Annotation Item or Edit Input */}
      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') handleCancel();
            }}
            className="flex-1 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
            style={{
              fontFamily: "'MocFont', Arial, sans-serif",
              direction: 'rtl'
            }}
          />
          <button
            onClick={handleSave}
            className="p-1 text-green-400 hover:text-green-300"
          >
            <Check size={16} />
          </button>
          <button
            onClick={handleCancel}
            className="p-1 text-red-400 hover:text-red-300"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => handleClick(annotation)}
          className="flex-1 text-right px-2 py-1 hover:bg-white/10 rounded transition-colors"
          style={{ direction: 'rtl' }}
        >
          <div className="text-white font-semibold text-sm"
            style={{
              fontFamily: "'MocFont', Arial, sans-serif",
              textShadow: '0 0 10px rgba(255, 255, 255, 0.2)',
            }}
          >
            {annotation.menu_name || annotation.title}
          </div>
          {annotation.description && (
            <div className="text-gray-400 text-xs mt-0.5"
              style={{
                fontFamily: "'MocFont', Arial, sans-serif",
              }}
            >
              {annotation.description}
            </div>
          )}
        </button>
      )}
    </div>
  );
};

interface DraggableAnnotationsListProps {
  annotations: Annotation[];
  onReorder: (annotations: Annotation[]) => void;
  onToggleVisibility: (id: string) => void;
  onAnnotationClick: (annotation: Annotation) => void;
  onRename: (id: string, newName: string) => void;
}

export const DraggableAnnotationsList: React.FC<DraggableAnnotationsListProps> = ({
  annotations,
  onReorder,
  onToggleVisibility,
  onAnnotationClick,
  onRename,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = annotations.findIndex((item) => item.id === active.id);
      const newIndex = annotations.findIndex((item) => item.id === over.id);

      const reorderedAnnotations = arrayMove(annotations, oldIndex, newIndex);
      onReorder(reorderedAnnotations);
    }
  };

  const sortedAnnotations = [...annotations]
    .filter(ann => ann.title || ann.description)
    .sort((a, b) => (a.menu_order || 0) - (b.menu_order || 0));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sortedAnnotations.map(a => a.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="max-h-96 overflow-y-auto">
          {sortedAnnotations.map((annotation) => (
            <SortableAnnotationItem
              key={annotation.id}
              annotation={annotation}
              toggleVisibility={onToggleVisibility}
              handleClick={onAnnotationClick}
              onRename={onRename}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};