'use client';

import React, { useState, useCallback, useRef } from 'react';
import * as Slider from '@radix-ui/react-slider';
import * as Collapsible from '@radix-ui/react-collapsible';
import * as Select from '@radix-ui/react-select';
import {
  ChevronDown,
  ChevronRight,
  Sparkles,
  Palette,
  Settings,
  Image,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  X
} from 'lucide-react';
import ColorPicker from './ColorPicker';
import { materialPresets, presetCategories, presetIcons } from '@/lib/materials/presets';
import type { ObjectMaterial, MaterialPreset, Color } from '@/types';

interface MaterialPanelProps {
  material: ObjectMaterial | null;
  objectName: string;
  onChange: (material: ObjectMaterial) => void;
  onDelete?: () => void;
  onVisibilityToggle?: (visible: boolean) => void;
  isVisible?: boolean;
}

export default function MaterialPanel({
  material,
  objectName,
  onChange,
  onDelete,
  onVisibilityToggle,
  isVisible = true
}: MaterialPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['presets', 'color', 'properties'])
  );
  const [texturePreview, setTexturePreview] = useState<string | null>(material?.texture_url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handlePresetSelect = useCallback((preset: MaterialPreset) => {
    if (!material) return;

    const presetData = materialPresets[preset];
    const updatedMaterial: ObjectMaterial = {
      ...material,
      ...presetData,
      model_id: material.model_id,
      object_name: material.object_name,
    };

    onChange(updatedMaterial);
  }, [material, onChange]);

  const handleColorChange = useCallback((color: Color) => {
    if (!material) return;
    onChange({ ...material, color });
  }, [material, onChange]);

  const handlePropertyChange = useCallback((property: string, value: number) => {
    if (!material) return;

    const updatedMaterial = {
      ...material,
      properties: {
        ...material.properties,
        [property]: value
      }
    };

    onChange(updatedMaterial);
  }, [material, onChange]);

  const handleEmissiveColorChange = useCallback((emissive: Color) => {
    if (!material) return;

    const updatedMaterial = {
      ...material,
      properties: {
        ...material.properties,
        emissive
      }
    };

    onChange(updatedMaterial);
  }, [material, onChange]);

  // Handle texture upload
  const handleTextureUpload = useCallback(async (file: File) => {
    if (!material) return;

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    // Convert to base64 for preview and storage
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setTexturePreview(dataUrl);

      // Update material with texture
      onChange({
        ...material,
        texture_url: dataUrl,
        texture_settings: {
          scale: { x: 1, y: 1 },
          offset: { x: 0, y: 0 },
          repeat: { x: 1, y: 1 },
          rotation: 0,
          wrapS: 'repeat',
          wrapT: 'repeat'
        }
      });
    };
    reader.readAsDataURL(file);
  }, [material, onChange]);

  if (!material) {
    return (
      <div className="p-4 text-center text-gray-400">
        <p>No object selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 text-white">
      {/* Object Header */}
      <div className="glass-panel-light p-3 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-sm">{objectName}</h3>
            <p className="text-xs text-gray-500">Object Material</p>
          </div>
          <div className="flex items-center gap-1">
            {onVisibilityToggle && (
              <button
                onClick={() => onVisibilityToggle(!isVisible)}
                className="p-1.5 hover:bg-white/10 rounded transition-colors text-gray-400"
                title={isVisible ? 'Hide object' : 'Show object'}
              >
                {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                title="Delete object"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Material Presets Section */}
      <Collapsible.Root open={expandedSections.has('presets')}>
        <Collapsible.Trigger
          onClick={() => toggleSection('presets')}
          className="w-full glass-button p-3 rounded-lg hover:bg-white/10 transition-colors text-white"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-blue-500" />
              <span className="font-medium text-sm">Material Presets</span>
            </div>
            {expandedSections.has('presets') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
        </Collapsible.Trigger>
        <Collapsible.Content className="mt-1 glass-panel-light p-3 rounded-lg">
          <div className="space-y-3">
            {Object.entries(presetCategories).map(([category, presets]) => (
              <div key={category}>
                <p className="text-xs font-medium text-gray-600 mb-2">{category}</p>
                <div className="grid grid-cols-4 gap-2">
                  {presets.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handlePresetSelect(preset as MaterialPreset)}
                      className={`p-2 rounded-lg border-2 transition-all hover:scale-105 ${
                        material.preset_name === preset
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-white/20 hover:border-white/30'
                      }`}
                      title={preset}
                    >
                      <div className="text-2xl mb-1">{presetIcons[preset as MaterialPreset]}</div>
                      <div className="text-xs capitalize">{preset}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Collapsible.Content>
      </Collapsible.Root>

      {/* Color Section */}
      <Collapsible.Root open={expandedSections.has('color')}>
        <Collapsible.Trigger
          onClick={() => toggleSection('color')}
          className="w-full glass-button p-3 rounded-lg hover:bg-white/10 transition-colors text-white"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette size={16} className="text-green-500" />
              <span className="font-medium text-sm">Color & Texture</span>
            </div>
            {expandedSections.has('color') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
        </Collapsible.Trigger>
        <Collapsible.Content className="mt-1 glass-panel-light p-3 rounded-lg">
          <div className="space-y-4">
            {/* Main Color */}
            <ColorPicker
              color={material.color}
              onChange={handleColorChange}
              label="Base Color"
              showAlpha={material.properties.opacity < 1}
            />

            {/* Emissive Color */}
            <ColorPicker
              color={material.properties.emissive}
              onChange={handleEmissiveColorChange}
              label="Emissive Color"
              showAlpha={false}
            />

            {/* Texture Upload */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Texture</label>
              {texturePreview ? (
                <div className="relative group">
                  <img
                    src={texturePreview}
                    alt="Texture preview"
                    className="w-full h-32 object-cover rounded-lg border border-white/20"
                  />
                  <button
                    onClick={() => {
                      setTexturePreview(null);
                      if (material) {
                        onChange({
                          ...material,
                          texture_url: null,
                          texture_settings: null
                        });
                      }
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 rounded hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X size={16} className="text-white" />
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 p-1 bg-blue-500 rounded hover:bg-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Upload size={16} className="text-white" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('border-blue-400');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('border-blue-400');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-blue-400');
                    const file = e.dataTransfer.files[0];
                    if (file && file.type.startsWith('image/')) {
                      handleTextureUpload(file);
                    }
                  }}
                  className="border-2 border-dashed border-white/20 rounded-lg p-4 text-center hover:border-white/30 transition-colors cursor-pointer"
                >
                  <Image size={24} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-300">Click to upload or drag & drop</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleTextureUpload(file);
                  }
                }}
                className="hidden"
              />
            </div>
          </div>
        </Collapsible.Content>
      </Collapsible.Root>

      {/* Material Properties Section */}
      <Collapsible.Root open={expandedSections.has('properties')}>
        <Collapsible.Trigger
          onClick={() => toggleSection('properties')}
          className="w-full glass-button p-3 rounded-lg hover:bg-white/10 transition-colors text-white"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings size={16} className="text-purple-500" />
              <span className="font-medium text-sm">Material Properties</span>
            </div>
            {expandedSections.has('properties') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
        </Collapsible.Trigger>
        <Collapsible.Content className="mt-1 glass-panel-light p-3 rounded-lg">
          <div className="space-y-3">
            {/* Metalness */}
            <PropertySlider
              label="Metalness"
              value={material.properties.metalness}
              onChange={(value) => handlePropertyChange('metalness', value)}
              min={0}
              max={1}
              step={0.01}
              description="How metallic the surface appears"
            />

            {/* Roughness */}
            <PropertySlider
              label="Roughness"
              value={material.properties.roughness}
              onChange={(value) => handlePropertyChange('roughness', value)}
              min={0}
              max={1}
              step={0.01}
              description="Surface roughness (0 = smooth, 1 = rough)"
            />

            {/* Opacity */}
            <PropertySlider
              label="Opacity"
              value={material.properties.opacity}
              onChange={(value) => handlePropertyChange('opacity', value)}
              min={0}
              max={1}
              step={0.01}
              description="Transparency (0 = transparent, 1 = opaque)"
            />

            {/* Emissive Intensity */}
            <PropertySlider
              label="Emissive Intensity"
              value={material.properties.emissiveIntensity}
              onChange={(value) => handlePropertyChange('emissiveIntensity', value)}
              min={0}
              max={5}
              step={0.1}
              description="How much the object glows"
            />

            {/* Advanced Properties (if glass selected) */}
            {material.preset_name === 'glass' && (
              <>
                <PropertySlider
                  label="IOR (Refraction)"
                  value={material.properties.ior || 1.5}
                  onChange={(value) => handlePropertyChange('ior', value)}
                  min={1}
                  max={2.5}
                  step={0.01}
                  description="Index of refraction"
                />
                <PropertySlider
                  label="Transmission"
                  value={material.properties.transmission || 1}
                  onChange={(value) => handlePropertyChange('transmission', value)}
                  min={0}
                  max={1}
                  step={0.01}
                  description="Light transmission through material"
                />
              </>
            )}

            {/* Clearcoat (for plastic/ceramic) */}
            {(material.preset_name === 'plastic' || material.preset_name === 'ceramic') && (
              <>
                <PropertySlider
                  label="Clearcoat"
                  value={material.properties.clearcoat || 0}
                  onChange={(value) => handlePropertyChange('clearcoat', value)}
                  min={0}
                  max={1}
                  step={0.01}
                  description="Clear coating layer intensity"
                />
                <PropertySlider
                  label="Clearcoat Roughness"
                  value={material.properties.clearcoatRoughness || 0}
                  onChange={(value) => handlePropertyChange('clearcoatRoughness', value)}
                  min={0}
                  max={1}
                  step={0.01}
                  description="Roughness of the clear coating"
                />
              </>
            )}
          </div>
        </Collapsible.Content>
      </Collapsible.Root>
    </div>
  );
}

// Property Slider Component
interface PropertySliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  description?: string;
}

function PropertySlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  description
}: PropertySliderProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-300">{label}</label>
        <span className="text-sm font-mono text-gray-400">{value.toFixed(2)}</span>
      </div>
      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}
      <Slider.Root
        className="relative flex items-center select-none touch-none w-full h-5"
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        max={max}
        min={min}
        step={step}
      >
        <Slider.Track className="bg-gray-200 relative grow rounded-full h-[3px]">
          <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
        </Slider.Track>
        <Slider.Thumb className="block w-5 h-5 bg-blue-500 shadow-md border-2 border-white/50 rounded-full hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </Slider.Root>
    </div>
  );
}