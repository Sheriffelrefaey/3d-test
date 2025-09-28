'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { HexColorPicker, HslaColorPicker, RgbaColorPicker } from 'react-colorful';
import { Pipette, Copy, Check, Palette } from 'lucide-react';
import type { Color } from '@/types';

interface ColorPickerProps {
  color: Color;
  onChange: (color: Color) => void;
  showAlpha?: boolean;
  presets?: Color[];
  label?: string;
}

type ColorMode = 'hex' | 'hsl' | 'rgb';

export default function ColorPicker({
  color,
  onChange,
  showAlpha = true,
  presets = [],
  label = 'Color'
}: ColorPickerProps) {
  const [mode, setMode] = useState<ColorMode>('hex');
  const [copied, setCopied] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [localColor, setLocalColor] = useState(color);

  // Default color presets if none provided
  const defaultPresets: Color[] = [
    { r: 255, g: 255, b: 255, a: 1 }, // White
    { r: 0, g: 0, b: 0, a: 1 },       // Black
    { r: 255, g: 0, b: 0, a: 1 },     // Red
    { r: 0, g: 255, b: 0, a: 1 },     // Green
    { r: 0, g: 0, b: 255, a: 1 },     // Blue
    { r: 255, g: 255, b: 0, a: 1 },   // Yellow
    { r: 255, g: 0, b: 255, a: 1 },   // Magenta
    { r: 0, g: 255, b: 255, a: 1 },   // Cyan
    { r: 128, g: 128, b: 128, a: 1 }, // Gray
    { r: 255, g: 165, b: 0, a: 1 },   // Orange
    { r: 128, g: 0, b: 128, a: 1 },   // Purple
    { r: 165, g: 42, b: 42, a: 1 },   // Brown
  ];

  const colorPresets = presets.length > 0 ? presets : defaultPresets;

  // Convert Color to hex string
  const colorToHex = (c: Color): string => {
    const toHex = (n: number) => {
      const hex = Math.round(n).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}`;
  };

  // Convert hex to Color
  const hexToColor = (hex: string): Color => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1] || '0', 16),
      g: parseInt(result[2] || '0', 16),
      b: parseInt(result[3] || '0', 16),
      a: localColor.a || 1
    } : localColor;
  };

  // Convert Color to HSL
  const colorToHsl = (c: Color) => {
    const r = c.r / 255;
    const g = c.g / 255;
    const b = c.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s;
    const l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
        default: h = 0;
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
      a: c.a || 1
    };
  };

  // Convert HSL to Color
  const hslToColor = (hsl: { h: number; s: number; l: number; a: number }): Color => {
    const h = hsl.h / 360;
    const s = hsl.s / 100;
    const l = hsl.l / 100;

    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
      a: hsl.a
    };
  };

  // Handle color change from picker
  const handleColorChange = useCallback((newColor: any) => {
    let finalColor: Color;

    if (mode === 'hex') {
      finalColor = hexToColor(newColor);
    } else if (mode === 'hsl') {
      finalColor = hslToColor(newColor);
    } else {
      finalColor = {
        r: Math.round(newColor.r),
        g: Math.round(newColor.g),
        b: Math.round(newColor.b),
        a: newColor.a || 1
      };
    }

    setLocalColor(finalColor);
    onChange(finalColor);
  }, [mode, onChange]);

  // Copy color to clipboard
  const copyToClipboard = () => {
    const text = mode === 'hex'
      ? colorToHex(localColor)
      : mode === 'hsl'
      ? `hsl(${colorToHsl(localColor).h}, ${colorToHsl(localColor).s}%, ${colorToHsl(localColor).l}%)`
      : `rgb(${localColor.r}, ${localColor.g}, ${localColor.b})`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle preset selection
  const handlePresetSelect = (preset: Color) => {
    setLocalColor(preset);
    onChange(preset);
  };

  // Eyedropper API (Chrome only)
  const useEyedropper = async () => {
    if (!('EyeDropper' in window)) {
      console.warn('Eyedropper is not supported in your browser');
      return;
    }

    try {
      // @ts-expect-error - EyeDropper API is not in TypeScript yet
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      const color = hexToColor(result.sRGBHex);
      setLocalColor(color);
      onChange(color);
    } catch (e) {
      console.error('Eyedropper failed:', e);
    }
  };

  // Get display value based on mode
  const getDisplayValue = () => {
    if (mode === 'hex') return colorToHex(localColor);
    if (mode === 'hsl') {
      const hsl = colorToHsl(localColor);
      return `${hsl.h}°, ${hsl.s}%, ${hsl.l}%`;
    }
    return `${localColor.r}, ${localColor.g}, ${localColor.b}`;
  };

  useEffect(() => {
    setLocalColor(color);
  }, [color]);

  return (
    <div className="space-y-2">
      {/* Label and Controls */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <div className="flex items-center gap-1">
          {/* Mode selector */}
          <div className="flex rounded-md border border-white/20 overflow-hidden">
            {(['hex', 'hsl', 'rgb'] as ColorMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-2 py-1 text-xs uppercase transition-colors ${
                  mode === m
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Color Display */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="flex-1 h-10 rounded-md border-2 border-white/20 shadow-inner relative overflow-hidden"
          style={{ backgroundColor: `rgb(${localColor.r}, ${localColor.g}, ${localColor.b})` }}
        >
          {showAlpha && localColor.a && localColor.a < 1 && (
            <div className="absolute inset-0 bg-checkered" />
          )}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: `rgba(${localColor.r}, ${localColor.g}, ${localColor.b}, ${localColor.a || 1})`
            }}
          />
        </button>

        <input
          type="text"
          value={getDisplayValue()}
          onChange={(e) => {
            if (mode === 'hex') {
              const color = hexToColor(e.target.value);
              if (color) {
                setLocalColor(color);
                onChange(color);
              }
            }
          }}
          className="flex-1 px-2 py-1 text-sm bg-black/30 border border-white/20 rounded-md text-white"
        />

        <button
          onClick={copyToClipboard}
          className="p-2 hover:bg-white/10 rounded-md transition-colors text-gray-400"
          title="Copy to clipboard"
        >
          {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
        </button>

        <button
          onClick={useEyedropper}
          className="p-2 hover:bg-white/10 rounded-md transition-colors text-gray-400"
          title="Pick color from screen"
        >
          <Pipette size={16} />
        </button>
      </div>

      {/* Color Picker */}
      {showPicker && (
        <div className="space-y-3 p-3 border border-white/20 rounded-lg bg-black/30">
          {mode === 'hex' ? (
            <HexColorPicker
              color={colorToHex(localColor)}
              onChange={handleColorChange}
            />
          ) : mode === 'hsl' ? (
            <HslaColorPicker
              color={colorToHsl(localColor)}
              onChange={handleColorChange}
            />
          ) : (
            <RgbaColorPicker
              color={{...localColor, a: localColor.a ?? 1}}
              onChange={handleColorChange}
            />
          )}

          {/* Alpha Slider */}
          {showAlpha && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Opacity</span>
                <span>{Math.round((localColor.a || 1) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={(localColor.a || 1) * 100}
                onChange={(e) => {
                  const newColor = { ...localColor, a: parseInt(e.target.value) / 100 };
                  setLocalColor(newColor);
                  onChange(newColor);
                }}
                className="w-full"
              />
            </div>
          )}

          {/* Presets */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <Palette size={12} />
              <span>Presets</span>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {colorPresets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePresetSelect(preset)}
                  className="w-8 h-8 rounded border-2 border-white/20 shadow-sm hover:scale-110 transition-transform"
                  style={{ backgroundColor: `rgb(${preset.r}, ${preset.g}, ${preset.b})` }}
                  title={`RGB(${preset.r}, ${preset.g}, ${preset.b})`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add checkered background style only once
if (typeof window !== 'undefined' && !document.getElementById('color-picker-styles')) {
  const style = document.createElement('style');
  style.id = 'color-picker-styles';
  style.textContent = `
    .bg-checkered {
      background-image:
        linear-gradient(45deg, #ddd 25%, transparent 25%),
        linear-gradient(-45deg, #ddd 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #ddd 75%),
        linear-gradient(-45deg, transparent 75%, #ddd 75%);
      background-size: 10px 10px;
      background-position: 0 0, 0 5px, 5px -5px, -5px 0px;
    }
  `;
  document.head.appendChild(style);
}