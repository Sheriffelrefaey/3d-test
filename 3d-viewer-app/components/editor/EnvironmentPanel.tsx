'use client';

import React, { useState } from 'react';
import * as Collapsible from '@radix-ui/react-collapsible';
import * as Slider from '@radix-ui/react-slider';
import * as Select from '@radix-ui/react-select';
import {
  ChevronDown,
  ChevronRight,
  Cloud,
  Sun,
  Grid3x3,
  Palette,
  Eye,
  EyeOff,
  Settings,
  Image,
  Sparkles
} from 'lucide-react';
import ColorPicker from './ColorPicker';
import GradientEditor from './GradientEditor';
import type { ModelEnvironment, Color, Fog, Grid as GridType, Background, Lighting } from '@/types';

interface EnvironmentPanelProps {
  environment: ModelEnvironment;
  onChange: (environment: ModelEnvironment) => void;
}

export default function EnvironmentPanel({ environment, onChange }: EnvironmentPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['background', 'lighting', 'fog', 'grid'])
  );

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Background handlers
  const handleBackgroundTypeChange = (type: Background['type']) => {
    onChange({
      ...environment,
      background: {
        ...environment.background,
        type,
        gradient: type === 'gradient' ? {
          type: 'linear',
          angle: 90,
          stops: [
            { color: { r: 245, g: 245, b: 245, a: 1 }, position: 0 },
            { color: { r: 200, g: 200, b: 200, a: 1 }, position: 1 }
          ]
        } : undefined
      }
    });
  };

  const handleBackgroundColorChange = (color: Color) => {
    onChange({
      ...environment,
      background: { ...environment.background, color }
    });
  };

  const handleGradientChange = (gradient: any) => {
    onChange({
      ...environment,
      background: { ...environment.background, gradient }
    });
  };

  // Fog handlers
  const handleFogToggle = (enabled: boolean) => {
    onChange({
      ...environment,
      fog: { ...environment.fog, enabled }
    });
  };

  const handleFogColorChange = (color: Color) => {
    onChange({
      ...environment,
      fog: { ...environment.fog, color }
    });
  };

  const handleFogPropertyChange = (property: keyof Fog, value: number) => {
    onChange({
      ...environment,
      fog: { ...environment.fog, [property]: value }
    });
  };

  // Grid handlers
  const handleGridToggle = (show: boolean) => {
    onChange({
      ...environment,
      grid: { ...environment.grid, show }
    });
  };

  const handleGridColorChange = (color: Color) => {
    onChange({
      ...environment,
      grid: { ...environment.grid, color }
    });
  };

  const handleGridPropertyChange = (property: keyof GridType, value: number) => {
    onChange({
      ...environment,
      grid: { ...environment.grid, [property]: value }
    });
  };

  // Lighting handlers
  const handleAmbientLightChange = (property: 'color' | 'intensity', value: Color | number) => {
    onChange({
      ...environment,
      lighting: {
        ...environment.lighting,
        ambient: {
          ...environment.lighting.ambient,
          [property]: value
        }
      }
    });
  };

  const handleDirectionalLightChange = (index: number, property: string, value: any) => {
    const newDirectional = [...environment.lighting.directional];
    newDirectional[index] = {
      ...newDirectional[index],
      [property]: value
    };
    onChange({
      ...environment,
      lighting: {
        ...environment.lighting,
        directional: newDirectional
      }
    });
  };

  return (
    <div className="space-y-1 text-white">
      {/* Background Section */}
      <Collapsible.Root open={expandedSections.has('background')}>
        <Collapsible.Trigger
          onClick={() => toggleSection('background')}
          className="w-full glass-button p-3 rounded-lg  hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image size={16} className="text-blue-500" />
              <span className="font-medium text-sm">Background</span>
            </div>
            {expandedSections.has('background') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
        </Collapsible.Trigger>
        <Collapsible.Content className="mt-1 glass-panel-light p-3 rounded-lg space-y-3">
          {/* Background Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(['solid', 'gradient', 'environment'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => handleBackgroundTypeChange(type)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    environment.background.type === type
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/10 text-gray-400 hover:bg-white/20'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Solid Color */}
          {environment.background.type === 'solid' && environment.background.color && (
            <ColorPicker
              color={environment.background.color}
              onChange={handleBackgroundColorChange}
              label="Background Color"
              showAlpha={false}
            />
          )}

          {/* Gradient */}
          {environment.background.type === 'gradient' && environment.background.gradient && (
            <GradientEditor
              gradient={environment.background.gradient}
              onChange={handleGradientChange}
            />
          )}

          {/* Environment Presets */}
          {environment.background.type === 'environment' && (
            <div className="grid grid-cols-2 gap-2">
              {['studio', 'city', 'sunset', 'dawn', 'night', 'forest', 'apartment', 'park'].map(preset => (
                <button
                  key={preset}
                  onClick={() => onChange({
                    ...environment,
                    background: {
                      ...environment.background,
                      environmentPreset: preset
                    }
                  })}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    environment.background.environmentPreset === preset
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/10 text-gray-400 hover:bg-white/20'
                  }`}
                >
                  {preset.charAt(0).toUpperCase() + preset.slice(1)}
                </button>
              ))}
            </div>
          )}
        </Collapsible.Content>
      </Collapsible.Root>

      {/* Lighting Section */}
      <Collapsible.Root open={expandedSections.has('lighting')}>
        <Collapsible.Trigger
          onClick={() => toggleSection('lighting')}
          className="w-full glass-button p-3 rounded-lg  hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sun size={16} className="text-yellow-500" />
              <span className="font-medium text-sm">Lighting</span>
            </div>
            {expandedSections.has('lighting') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
        </Collapsible.Trigger>
        <Collapsible.Content className="mt-1 glass-panel-light p-3 rounded-lg space-y-3">
          {/* Ambient Light */}
          <div className="space-y-2 p-2 bg-black/30 rounded">
            <h4 className="text-xs font-medium text-gray-300">Ambient Light</h4>
            <ColorPicker
              color={environment.lighting.ambient.color}
              onChange={(color) => handleAmbientLightChange('color', color)}
              label="Color"
              showAlpha={false}
            />
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-300">Intensity</label>
                <span className="text-sm font-mono text-gray-300">
                  {environment.lighting.ambient.intensity.toFixed(1)}
                </span>
              </div>
              <Slider.Root
                className="relative flex items-center select-none touch-none w-full h-5"
                value={[environment.lighting.ambient.intensity]}
                onValueChange={([v]) => handleAmbientLightChange('intensity', v)}
                max={5}
                min={0}
                step={0.1}
              >
                <Slider.Track className="bg-gray-200 relative grow rounded-full h-[3px]">
                  <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb className="block w-5 h-5 glass-button shadow-md border-2 border-blue-500 rounded-full hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" />
              </Slider.Root>
            </div>
          </div>

          {/* Directional Lights */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-300">Directional Lights</h4>
            {environment.lighting.directional.map((light, index) => (
              <div key={index} className="space-y-2 p-2 bg-black/30 rounded">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-white">Light {index + 1}</span>
                  <label className="flex items-center gap-1 text-xs text-gray-400">
                    <input
                      type="checkbox"
                      checked={light.castShadow}
                      onChange={(e) => handleDirectionalLightChange(index, 'castShadow', e.target.checked)}
                    />
                    Shadows
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <ColorPicker
                    color={light.color}
                    onChange={(color) => handleDirectionalLightChange(index, 'color', color)}
                    label="Color"
                    showAlpha={false}
                  />
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-300">Intensity</label>
                      <span className="text-sm font-mono text-gray-300">{light.intensity.toFixed(1)}</span>
                    </div>
                    <Slider.Root
                      className="relative flex items-center select-none touch-none w-full h-5"
                      value={[light.intensity]}
                      onValueChange={([v]) => handleDirectionalLightChange(index, 'intensity', v)}
                      max={10}
                      min={0}
                      step={0.1}
                    >
                      <Slider.Track className="bg-gray-200 relative grow rounded-full h-[3px]">
                        <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
                      </Slider.Track>
                      <Slider.Thumb className="block w-5 h-5 glass-button shadow-md border-2 border-blue-500 rounded-full hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" />
                    </Slider.Root>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Collapsible.Content>
      </Collapsible.Root>

      {/* Fog Section */}
      <Collapsible.Root open={expandedSections.has('fog')}>
        <Collapsible.Trigger
          onClick={() => toggleSection('fog')}
          className="w-full glass-button p-3 rounded-lg  hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud size={16} className="text-gray-400" />
              <span className="font-medium text-sm">Fog</span>
            </div>
            {expandedSections.has('fog') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
        </Collapsible.Trigger>
        <Collapsible.Content className="mt-1 glass-panel-light p-3 rounded-lg space-y-3">
          {/* Fog Toggle */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={environment.fog.enabled}
              onChange={(e) => handleFogToggle(e.target.checked)}
              className="w-4 h-4 text-blue-400 bg-black/30 border-white/20 rounded"
            />
            <span className="text-sm font-medium text-gray-300">Enable Fog</span>
          </label>

          {environment.fog.enabled && (
            <>
              {/* Fog Color */}
              <ColorPicker
                color={environment.fog.color}
                onChange={handleFogColorChange}
                label="Fog Color"
                showAlpha={false}
              />

              {/* Fog Properties */}
              <div className="space-y-3">
                {/* Near */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-300">Near</label>
                    <span className="text-sm font-mono text-gray-300">{environment.fog.near}</span>
                  </div>
                  <Slider.Root
                    className="relative flex items-center select-none touch-none w-full h-5"
                    value={[environment.fog.near]}
                    onValueChange={([v]) => handleFogPropertyChange('near', v)}
                    max={100}
                    min={0}
                    step={1}
                  >
                    <Slider.Track className="bg-gray-200 relative grow rounded-full h-[3px]">
                      <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
                    </Slider.Track>
                    <Slider.Thumb className="block w-5 h-5 glass-button shadow-md border-2 border-blue-500 rounded-full hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" />
                  </Slider.Root>
                </div>

                {/* Far */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-300">Far</label>
                    <span className="text-sm font-mono text-gray-300">{environment.fog.far}</span>
                  </div>
                  <Slider.Root
                    className="relative flex items-center select-none touch-none w-full h-5"
                    value={[environment.fog.far]}
                    onValueChange={([v]) => handleFogPropertyChange('far', v)}
                    max={200}
                    min={1}
                    step={1}
                  >
                    <Slider.Track className="bg-gray-200 relative grow rounded-full h-[3px]">
                      <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
                    </Slider.Track>
                    <Slider.Thumb className="block w-5 h-5 glass-button shadow-md border-2 border-blue-500 rounded-full hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" />
                  </Slider.Root>
                </div>

                {/* Density */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-300">Density</label>
                    <span className="text-sm font-mono text-gray-300">{environment.fog.density.toFixed(3)}</span>
                  </div>
                  <Slider.Root
                    className="relative flex items-center select-none touch-none w-full h-5"
                    value={[environment.fog.density]}
                    onValueChange={([v]) => handleFogPropertyChange('density', v)}
                    max={0.1}
                    min={0}
                    step={0.001}
                  >
                    <Slider.Track className="bg-gray-200 relative grow rounded-full h-[3px]">
                      <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
                    </Slider.Track>
                    <Slider.Thumb className="block w-5 h-5 glass-button shadow-md border-2 border-blue-500 rounded-full hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" />
                  </Slider.Root>
                </div>
              </div>
            </>
          )}
        </Collapsible.Content>
      </Collapsible.Root>

      {/* Grid Section */}
      <Collapsible.Root open={expandedSections.has('grid')}>
        <Collapsible.Trigger
          onClick={() => toggleSection('grid')}
          className="w-full glass-button p-3 rounded-lg  hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Grid3x3 size={16} className="text-green-500" />
              <span className="font-medium text-sm">Grid</span>
            </div>
            {expandedSections.has('grid') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
        </Collapsible.Trigger>
        <Collapsible.Content className="mt-1 glass-panel-light p-3 rounded-lg space-y-3">
          {/* Grid Toggle */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={environment.grid.show}
              onChange={(e) => handleGridToggle(e.target.checked)}
              className="w-4 h-4 text-blue-400 bg-black/30 border-white/20 rounded"
            />
            <span className="text-sm font-medium text-gray-300">Show Grid</span>
          </label>

          {environment.grid.show && (
            <>
              {/* Grid Color */}
              <ColorPicker
                color={environment.grid.color}
                onChange={handleGridColorChange}
                label="Grid Color"
                showAlpha={false}
              />

              {/* Grid Properties */}
              <div className="space-y-3">
                {/* Size */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-300">Size</label>
                    <span className="text-sm font-mono text-gray-300">{environment.grid.size}</span>
                  </div>
                  <Slider.Root
                    className="relative flex items-center select-none touch-none w-full h-5"
                    value={[environment.grid.size]}
                    onValueChange={([v]) => handleGridPropertyChange('size', v)}
                    max={100}
                    min={10}
                    step={5}
                  >
                    <Slider.Track className="bg-gray-200 relative grow rounded-full h-[3px]">
                      <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
                    </Slider.Track>
                    <Slider.Thumb className="block w-5 h-5 glass-button shadow-md border-2 border-blue-500 rounded-full hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" />
                  </Slider.Root>
                </div>

                {/* Divisions */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-300">Divisions</label>
                    <span className="text-sm font-mono text-gray-300">{environment.grid.divisions}</span>
                  </div>
                  <Slider.Root
                    className="relative flex items-center select-none touch-none w-full h-5"
                    value={[environment.grid.divisions]}
                    onValueChange={([v]) => handleGridPropertyChange('divisions', v)}
                    max={50}
                    min={5}
                    step={5}
                  >
                    <Slider.Track className="bg-gray-200 relative grow rounded-full h-[3px]">
                      <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
                    </Slider.Track>
                    <Slider.Thumb className="block w-5 h-5 glass-button shadow-md border-2 border-blue-500 rounded-full hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" />
                  </Slider.Root>
                </div>

                {/* Opacity */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-300">Opacity</label>
                    <span className="text-sm font-mono text-gray-300">
                      {Math.round(environment.grid.opacity * 100)}%
                    </span>
                  </div>
                  <Slider.Root
                    className="relative flex items-center select-none touch-none w-full h-5"
                    value={[environment.grid.opacity]}
                    onValueChange={([v]) => handleGridPropertyChange('opacity', v)}
                    max={1}
                    min={0}
                    step={0.05}
                  >
                    <Slider.Track className="bg-gray-200 relative grow rounded-full h-[3px]">
                      <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
                    </Slider.Track>
                    <Slider.Thumb className="block w-5 h-5 glass-button shadow-md border-2 border-blue-500 rounded-full hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" />
                  </Slider.Root>
                </div>
              </div>
            </>
          )}
        </Collapsible.Content>
      </Collapsible.Root>
    </div>
  );
}