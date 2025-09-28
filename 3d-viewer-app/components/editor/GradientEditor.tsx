'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Plus, Trash2, RotateCcw } from 'lucide-react';
import ColorPicker from './ColorPicker';
import * as Slider from '@radix-ui/react-slider';
import type { Gradient, Color } from '@/types';

interface GradientEditorProps {
  gradient: Gradient;
  onChange: (gradient: Gradient) => void;
}

export default function GradientEditor({ gradient, onChange }: GradientEditorProps) {
  const [selectedStop, setSelectedStop] = useState<number>(0);
  const gradientPreviewRef = useRef<HTMLDivElement>(null);

  // Ensure gradient has at least 2 stops
  useEffect(() => {
    if (!gradient.stops || gradient.stops.length < 2) {
      const defaultGradient: Gradient = {
        type: 'linear',
        angle: 90,
        stops: [
          { color: { r: 255, g: 255, b: 255, a: 1 }, position: 0 },
          { color: { r: 0, g: 0, b: 0, a: 1 }, position: 1 }
        ]
      };
      onChange(defaultGradient);
    }
  }, []);

  // Generate CSS gradient string
  const getGradientCSS = useCallback(() => {
    if (!gradient.stops || gradient.stops.length < 2) return 'linear-gradient(90deg, white, black)';

    const sortedStops = [...gradient.stops].sort((a, b) => a.position - b.position);
    const colorStops = sortedStops
      .map(stop => `rgba(${stop.color.r}, ${stop.color.g}, ${stop.color.b}, ${stop.color.a || 1}) ${stop.position * 100}%`)
      .join(', ');

    if (gradient.type === 'radial') {
      return `radial-gradient(circle, ${colorStops})`;
    } else {
      const angle = gradient.angle || 90;
      return `linear-gradient(${angle}deg, ${colorStops})`;
    }
  }, [gradient]);

  // Handle gradient type change
  const handleTypeChange = useCallback((type: 'linear' | 'radial') => {
    onChange({ ...gradient, type });
  }, [gradient, onChange]);

  // Handle angle change (for linear gradients)
  const handleAngleChange = useCallback((angle: number) => {
    onChange({ ...gradient, angle });
  }, [gradient, onChange]);

  // Add a new color stop
  const addColorStop = useCallback(() => {
    const newStops = [...gradient.stops];
    const newPosition = 0.5; // Add in the middle by default

    // Find a good color for the new stop (interpolate between neighbors)
    const sortedStops = [...newStops].sort((a, b) => a.position - b.position);
    let beforeStop = sortedStops[0];
    let afterStop = sortedStops[sortedStops.length - 1];

    for (let i = 0; i < sortedStops.length - 1; i++) {
      const currentStop = sortedStops[i];
      const nextStop = sortedStops[i + 1];
      if (currentStop && nextStop && currentStop.position <= newPosition && nextStop.position >= newPosition) {
        beforeStop = currentStop;
        afterStop = nextStop;
        break;
      }
    }

    if (!beforeStop || !afterStop) {
      // Fallback to default color
      const defaultColor: Color = { r: 128, g: 128, b: 128, a: 1 };
      const newStop = { color: defaultColor, position: newPosition };
      newStops.push(newStop);
      onChange({ ...gradient, stops: newStops });
      return;
    }

    const ratio = (newPosition - beforeStop.position) / (afterStop.position - beforeStop.position);
    const newColor: Color = {
      r: Math.round(beforeStop.color.r + (afterStop.color.r - beforeStop.color.r) * ratio),
      g: Math.round(beforeStop.color.g + (afterStop.color.g - beforeStop.color.g) * ratio),
      b: Math.round(beforeStop.color.b + (afterStop.color.b - beforeStop.color.b) * ratio),
      a: beforeStop.color.a || 1
    };

    newStops.push({ color: newColor, position: newPosition });
    onChange({ ...gradient, stops: newStops });
    setSelectedStop(newStops.length - 1);
  }, [gradient, onChange]);

  // Remove a color stop
  const removeColorStop = useCallback((index: number) => {
    if (gradient.stops.length <= 2) {
      console.warn('A gradient must have at least 2 color stops');
      return;
    }

    const newStops = gradient.stops.filter((_, i) => i !== index);
    onChange({ ...gradient, stops: newStops });
    setSelectedStop(Math.max(0, index - 1));
  }, [gradient, onChange]);

  // Update stop color
  const updateStopColor = useCallback((index: number, color: Color) => {
    const newStops = [...gradient.stops];
    const currentStop = newStops[index];
    if (currentStop) {
      newStops[index] = { ...currentStop, color };
      onChange({ ...gradient, stops: newStops });
    }
  }, [gradient, onChange]);

  // Update stop position
  const updateStopPosition = useCallback((index: number, position: number) => {
    const newStops = [...gradient.stops];
    const currentStop = newStops[index];
    if (currentStop) {
      newStops[index] = { ...currentStop, position };
      onChange({ ...gradient, stops: newStops });
    }
  }, [gradient, onChange]);

  // Preset gradients
  const applyPreset = useCallback((preset: string) => {
    const presets: Record<string, Gradient> = {
      sunrise: {
        type: 'linear',
        angle: 90,
        stops: [
          { color: { r: 255, g: 94, b: 77, a: 1 }, position: 0 },
          { color: { r: 255, g: 206, b: 84, a: 1 }, position: 0.5 },
          { color: { r: 237, g: 117, b: 99, a: 1 }, position: 1 }
        ]
      },
      ocean: {
        type: 'linear',
        angle: 180,
        stops: [
          { color: { r: 43, g: 88, b: 118, a: 1 }, position: 0 },
          { color: { r: 78, g: 205, b: 196, a: 1 }, position: 0.5 },
          { color: { r: 85, g: 98, b: 112, a: 1 }, position: 1 }
        ]
      },
      forest: {
        type: 'radial',
        stops: [
          { color: { r: 34, g: 139, b: 34, a: 1 }, position: 0 },
          { color: { r: 85, g: 107, b: 47, a: 1 }, position: 0.5 },
          { color: { r: 0, g: 100, b: 0, a: 1 }, position: 1 }
        ]
      },
      sunset: {
        type: 'linear',
        angle: 45,
        stops: [
          { color: { r: 255, g: 94, b: 77, a: 1 }, position: 0 },
          { color: { r: 255, g: 154, b: 0, a: 1 }, position: 0.3 },
          { color: { r: 237, g: 117, b: 99, a: 1 }, position: 0.6 },
          { color: { r: 95, g: 39, b: 205, a: 1 }, position: 1 }
        ]
      }
    };

    if (presets[preset]) {
      onChange(presets[preset]);
    }
  }, [onChange]);

  if (!gradient.stops || gradient.stops.length < 2) {
    return <div>Loading gradient editor...</div>;
  }

  const sortedStops = [...gradient.stops].sort((a, b) => a.position - b.position);
  const currentStop = gradient.stops[selectedStop];

  return (
    <div className="space-y-4">
      {/* Gradient Type Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => handleTypeChange('linear')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            gradient.type === 'linear'
              ? 'bg-blue-500 text-white'
              : 'bg-white/10 text-gray-400 hover:bg-white/20'
          }`}
        >
          Linear
        </button>
        <button
          onClick={() => handleTypeChange('radial')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            gradient.type === 'radial'
              ? 'bg-blue-500 text-white'
              : 'bg-white/10 text-gray-400 hover:bg-white/20'
          }`}
        >
          Radial
        </button>
      </div>

      {/* Angle Control (for linear gradients) */}
      {gradient.type === 'linear' && (
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700">Angle</label>
            <span className="text-sm font-mono text-gray-600">{gradient.angle || 90}°</span>
          </div>
          <div className="flex items-center gap-2">
            <Slider.Root
              className="relative flex items-center select-none touch-none flex-1 h-5"
              value={[gradient.angle || 90]}
              onValueChange={([v]) => handleAngleChange(v ?? 90)}
              max={360}
              min={0}
              step={1}
            >
              <Slider.Track className="bg-gray-200 relative grow rounded-full h-[3px]">
                <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb className="block w-5 h-5 bg-blue-500 shadow-md border-2 border-white/50 rounded-full hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </Slider.Root>
            <button
              onClick={() => handleAngleChange(90)}
              className="p-1 hover:bg-white/10 rounded text-gray-400"
              title="Reset to 90°"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Gradient Preview */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Preview</label>
        <div
          ref={gradientPreviewRef}
          className="h-20 rounded-lg border-2 border-white/20 shadow-inner"
          style={{ background: getGradientCSS() }}
        />
      </div>

      {/* Color Stops */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Color Stops</label>
          <button
            onClick={addColorStop}
            className="p-1 hover:bg-white/10 rounded-md transition-colors text-gray-400"
            title="Add color stop"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Stops List */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {sortedStops.map((stop, index) => {
            const actualIndex = gradient.stops.findIndex(s => s === stop);
            const isSelected = actualIndex === selectedStop;

            return (
              <div
                key={actualIndex}
                onClick={() => setSelectedStop(actualIndex)}
                className={`p-2 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-white/20 hover:border-white/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded border-2 border-white/20 shadow-sm"
                    style={{
                      backgroundColor: `rgba(${stop.color.r}, ${stop.color.g}, ${stop.color.b}, ${stop.color.a || 1})`
                    }}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      Stop {index + 1}
                    </div>
                    <div className="text-xs text-gray-500">
                      Position: {Math.round(stop.position * 100)}%
                    </div>
                  </div>
                  {gradient.stops.length > 2 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeColorStop(actualIndex);
                      }}
                      className="p-1 hover:bg-red-100 text-red-600 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Stop Editor */}
      {currentStop && (
        <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700">Edit Stop {selectedStop + 1}</h4>

          {/* Color Picker */}
          <ColorPicker
            color={currentStop.color}
            onChange={(color) => updateStopColor(selectedStop, color)}
            label="Stop Color"
          />

          {/* Position Slider */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-700">Position</label>
              <span className="text-sm font-mono text-gray-600">
                {Math.round((currentStop?.position ?? 0) * 100)}%
              </span>
            </div>
            <Slider.Root
              className="relative flex items-center select-none touch-none w-full h-5"
              value={[currentStop?.position ?? 0]}
              onValueChange={([v]) => updateStopPosition(selectedStop, v ?? 0)}
              max={1}
              min={0}
              step={0.01}
            >
              <Slider.Track className="bg-gray-200 relative grow rounded-full h-[3px]">
                <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb className="block w-5 h-5 bg-blue-500 shadow-md border-2 border-white/50 rounded-full hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </Slider.Root>
          </div>
        </div>
      )}

      {/* Preset Gradients */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Preset Gradients</label>
        <div className="grid grid-cols-2 gap-2">
          {['sunrise', 'ocean', 'forest', 'sunset'].map(preset => (
            <button
              key={preset}
              onClick={() => applyPreset(preset)}
              className="h-12 rounded-lg border-2 border-white/20 shadow-sm hover:scale-105 transition-transform capitalize font-medium text-sm text-white"
              style={{
                background: preset === 'sunrise'
                  ? 'linear-gradient(90deg, rgb(255, 94, 77), rgb(255, 206, 84), rgb(237, 117, 99))'
                  : preset === 'ocean'
                  ? 'linear-gradient(180deg, rgb(43, 88, 118), rgb(78, 205, 196), rgb(85, 98, 112))'
                  : preset === 'forest'
                  ? 'radial-gradient(circle, rgb(34, 139, 34), rgb(85, 107, 47), rgb(0, 100, 0))'
                  : 'linear-gradient(45deg, rgb(255, 94, 77), rgb(255, 154, 0), rgb(237, 117, 99), rgb(95, 39, 205))',
                color: 'white',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)'
              }}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}