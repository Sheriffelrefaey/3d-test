-- ============================================
-- Enhanced 3D Editor Complete Migration
-- ============================================
-- This migration creates all tables needed for the enhanced 3D editor features
-- Including materials, environments, transforms, and additional settings

-- ============================================
-- 1. OBJECT MATERIALS TABLE
-- ============================================
-- Stores material settings for each object in a model
CREATE TABLE IF NOT EXISTS object_materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID REFERENCES models(id) ON DELETE CASCADE,
  object_name TEXT NOT NULL,
  material_type TEXT DEFAULT 'custom' CHECK (material_type IN ('custom', 'preset')),
  preset_name TEXT CHECK (preset_name IN (
    'custom', 'marble', 'glass', 'wood', 'concrete', 'metal',
    'fabric', 'plastic', 'stone', 'gold', 'silver', 'copper', 'ceramic'
  )),
  color JSONB DEFAULT '{"r": 255, "g": 255, "b": 255, "a": 1}',
  texture_url TEXT,
  texture_settings JSONB DEFAULT '{
    "scale": {"x": 1, "y": 1},
    "offset": {"x": 0, "y": 0},
    "rotation": 0,
    "repeat": {"x": 1, "y": 1},
    "wrapS": "repeat",
    "wrapT": "repeat"
  }',
  normal_map_url TEXT,
  roughness_map_url TEXT,
  metalness_map_url TEXT,
  properties JSONB DEFAULT '{
    "metalness": 0,
    "roughness": 0.5,
    "opacity": 1,
    "emissive": {"r": 0, "g": 0, "b": 0},
    "emissiveIntensity": 0,
    "clearcoat": 0,
    "clearcoatRoughness": 0,
    "ior": 1.5,
    "transmission": 0,
    "thickness": 0,
    "reflectivity": 0.5,
    "sheen": 0,
    "sheenColor": {"r": 0, "g": 0, "b": 0},
    "sheenRoughness": 0,
    "specularIntensity": 1,
    "specularColor": {"r": 255, "g": 255, "b": 255}
  }',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  UNIQUE(model_id, object_name)
);

-- ============================================
-- 2. MODEL ENVIRONMENTS TABLE
-- ============================================
-- Stores environment settings for each model
CREATE TABLE IF NOT EXISTS model_environments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID REFERENCES models(id) ON DELETE CASCADE UNIQUE,

  -- Background settings
  background JSONB DEFAULT '{
    "type": "solid",
    "color": {"r": 245, "g": 245, "b": 245, "a": 1},
    "gradient": null,
    "imageUrl": null,
    "environmentPreset": "studio",
    "backgroundBlur": 0,
    "backgroundIntensity": 1
  }',

  -- Fog settings
  fog JSONB DEFAULT '{
    "enabled": false,
    "type": "linear",
    "color": {"r": 255, "g": 255, "b": 255, "a": 1},
    "near": 10,
    "far": 100,
    "density": 0.01,
    "height": 0,
    "heightFalloff": 1
  }',

  -- Lighting settings
  lighting JSONB DEFAULT '{
    "ambient": {
      "color": {"r": 255, "g": 255, "b": 255, "a": 1},
      "intensity": 0.8,
      "groundColor": {"r": 128, "g": 128, "b": 128, "a": 1}
    },
    "directional": [{
      "id": "main-light",
      "color": {"r": 255, "g": 255, "b": 255, "a": 1},
      "intensity": 1.5,
      "position": {"x": 10, "y": 10, "z": 5},
      "target": {"x": 0, "y": 0, "z": 0},
      "castShadow": true,
      "shadowMapSize": 2048,
      "shadowBias": -0.0005,
      "shadowNormalBias": 0.02,
      "shadowRadius": 1,
      "shadowBlur": 5
    }],
    "points": [],
    "spots": [],
    "hemisphereLight": null,
    "rectAreaLights": []
  }',

  -- Grid settings
  grid JSONB DEFAULT '{
    "show": true,
    "type": "standard",
    "color": {"r": 156, "g": 163, "b": 175, "a": 1},
    "size": 20,
    "divisions": 20,
    "opacity": 0.5,
    "fadeDistance": 30,
    "fadeStrength": 1,
    "infiniteGrid": true,
    "cellSize": 0.5,
    "sectionSize": 5,
    "cellColor": {"r": 156, "g": 163, "b": 175, "a": 0.3},
    "sectionColor": {"r": 100, "g": 100, "b": 100, "a": 0.5}
  }',

  -- Post-processing effects
  post_processing JSONB DEFAULT '{
    "bloom": {
      "enabled": false,
      "intensity": 1,
      "threshold": 0.9,
      "smoothing": 0.025,
      "radius": 0.4
    },
    "dof": {
      "enabled": false,
      "focus": 10,
      "aperture": 0.025,
      "maxBlur": 0.01,
      "focalLength": 10,
      "bokehScale": 2
    },
    "vignette": {
      "enabled": false,
      "darkness": 0.5,
      "offset": 0.5
    },
    "chromaticAberration": {
      "enabled": false,
      "offset": 0.002
    },
    "toneMapping": {
      "type": "aces",
      "exposure": 1,
      "contrast": 1,
      "saturation": 1,
      "brightness": 0
    },
    "colorGrading": {
      "enabled": false,
      "temperature": 0,
      "tint": 0,
      "hue": 0,
      "saturation": 0,
      "vibrance": 0,
      "brightness": 0,
      "contrast": 0,
      "gamma": 1,
      "gain": {"r": 1, "g": 1, "b": 1},
      "lift": {"r": 0, "g": 0, "b": 0}
    },
    "fxaa": {
      "enabled": true
    },
    "ssao": {
      "enabled": false,
      "radius": 0.3,
      "intensity": 1,
      "bias": 0.05
    },
    "outline": {
      "enabled": false,
      "edgeStrength": 3,
      "edgeGlow": 0,
      "edgeThickness": 1,
      "pulsePeriod": 0,
      "visibleEdgeColor": {"r": 255, "g": 255, "b": 255},
      "hiddenEdgeColor": {"r": 128, "g": 128, "b": 128}
    }
  }',

  -- Camera settings
  camera_settings JSONB DEFAULT '{
    "position": {"x": 10, "y": 8, "z": 10},
    "target": {"x": 0, "y": 0, "z": 0},
    "fov": 50,
    "near": 0.1,
    "far": 1000,
    "zoom": 1,
    "orthographic": false,
    "autoRotate": false,
    "autoRotateSpeed": 2,
    "enableDamping": true,
    "dampingFactor": 0.05,
    "minDistance": 0.5,
    "maxDistance": 100,
    "minPolarAngle": 0,
    "maxPolarAngle": 3.14159,
    "minAzimuthAngle": -6.28318,
    "maxAzimuthAngle": 6.28318,
    "enablePan": true,
    "enableZoom": true,
    "enableRotate": true,
    "panSpeed": 1,
    "rotateSpeed": 1,
    "zoomSpeed": 1
  }',

  -- Scene settings
  scene_settings JSONB DEFAULT '{
    "shadows": true,
    "shadowType": "PCFSoft",
    "physicallyCorrectLights": true,
    "toneMapping": 2,
    "toneMappingExposure": 1,
    "outputEncoding": "sRGB",
    "antialias": true,
    "pixelRatio": 1,
    "powerPreference": "high-performance",
    "preserveDrawingBuffer": false,
    "logarithmicDepthBuffer": false,
    "sortObjects": true
  }',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

-- ============================================
-- 3. OBJECT TRANSFORMS TABLE
-- ============================================
-- Stores visibility and transformation data for objects
CREATE TABLE IF NOT EXISTS object_transforms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID REFERENCES models(id) ON DELETE CASCADE,
  object_name TEXT NOT NULL,
  visible BOOLEAN DEFAULT true,
  deleted BOOLEAN DEFAULT false,
  locked BOOLEAN DEFAULT false,
  selectable BOOLEAN DEFAULT true,
  cast_shadow BOOLEAN DEFAULT true,
  receive_shadow BOOLEAN DEFAULT true,

  -- Transform properties
  position JSONB DEFAULT '{"x": 0, "y": 0, "z": 0}',
  rotation JSONB DEFAULT '{"x": 0, "y": 0, "z": 0}',
  scale JSONB DEFAULT '{"x": 1, "y": 1, "z": 1}',
  pivot JSONB DEFAULT '{"x": 0, "y": 0, "z": 0}',

  -- Additional properties
  opacity DECIMAL(3,2) DEFAULT 1.0 CHECK (opacity >= 0 AND opacity <= 1),
  render_order INTEGER DEFAULT 0,
  layer_mask INTEGER DEFAULT 1,
  parent_object TEXT,
  children_objects TEXT[],

  -- Animation properties
  animation_state JSONB DEFAULT '{
    "animations": [],
    "currentAnimation": null,
    "playing": false,
    "loop": true,
    "timeScale": 1
  }',

  -- Custom user data
  user_data JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  UNIQUE(model_id, object_name)
);

-- ============================================
-- 4. MATERIAL TEXTURES TABLE
-- ============================================
-- Stores uploaded texture files and their metadata
CREATE TABLE IF NOT EXISTS material_textures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID REFERENCES models(id) ON DELETE CASCADE,
  object_name TEXT,
  texture_type TEXT CHECK (texture_type IN (
    'diffuse', 'normal', 'roughness', 'metalness', 'ao',
    'displacement', 'emissive', 'alpha', 'lightmap', 'environment'
  )),
  file_url TEXT NOT NULL,
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  format TEXT,
  mime_type TEXT,

  -- Texture settings
  settings JSONB DEFAULT '{
    "wrapS": "repeat",
    "wrapT": "repeat",
    "magFilter": "linear",
    "minFilter": "linearMipmapLinear",
    "anisotropy": 16,
    "flipY": true,
    "encoding": "sRGB",
    "premultiplyAlpha": false,
    "unpackAlignment": 4
  }',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  CONSTRAINT unique_texture_per_object UNIQUE(model_id, object_name, texture_type)
);

-- ============================================
-- 5. EDITOR PRESETS TABLE
-- ============================================
-- Stores saved presets for materials, environments, etc.
CREATE TABLE IF NOT EXISTS editor_presets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('material', 'environment', 'lighting', 'post_processing', 'complete')),
  is_public BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  thumbnail_url TEXT,

  -- Preset data based on type
  preset_data JSONB NOT NULL,

  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,

  -- Tags for searching
  tags TEXT[],

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

-- ============================================
-- 6. EDITOR SESSIONS TABLE
-- ============================================
-- Stores editor session history and undo/redo states
CREATE TABLE IF NOT EXISTS editor_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID REFERENCES models(id) ON DELETE CASCADE,
  session_name TEXT,

  -- Session state snapshot
  state_snapshot JSONB NOT NULL,

  -- Action history for undo/redo
  action_history JSONB DEFAULT '[]',
  history_index INTEGER DEFAULT 0,

  -- Session metadata
  is_autosave BOOLEAN DEFAULT false,
  is_checkpoint BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  created_by UUID
);

-- ============================================
-- 7. SCENE COMPOSITIONS TABLE
-- ============================================
-- Stores complete scene setups with multiple models
CREATE TABLE IF NOT EXISTS scene_compositions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,

  -- Scene data
  models JSONB DEFAULT '[]', -- Array of model references with positions
  environment_id UUID REFERENCES model_environments(id),
  global_settings JSONB DEFAULT '{}',

  -- Sharing settings
  is_public BOOLEAN DEFAULT false,
  share_token TEXT UNIQUE,
  view_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_object_materials_model_id ON object_materials(model_id);
CREATE INDEX IF NOT EXISTS idx_object_materials_object_name ON object_materials(object_name);
CREATE INDEX IF NOT EXISTS idx_object_materials_preset ON object_materials(preset_name) WHERE preset_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_object_transforms_model_id ON object_transforms(model_id);
CREATE INDEX IF NOT EXISTS idx_object_transforms_object_name ON object_transforms(object_name);
CREATE INDEX IF NOT EXISTS idx_object_transforms_visible ON object_transforms(visible) WHERE visible = true;

CREATE INDEX IF NOT EXISTS idx_material_textures_model_id ON material_textures(model_id);
CREATE INDEX IF NOT EXISTS idx_material_textures_type ON material_textures(texture_type);

CREATE INDEX IF NOT EXISTS idx_editor_presets_type ON editor_presets(type);
CREATE INDEX IF NOT EXISTS idx_editor_presets_public ON editor_presets(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_editor_presets_tags ON editor_presets USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_editor_sessions_model_id ON editor_sessions(model_id);
CREATE INDEX IF NOT EXISTS idx_editor_sessions_created_at ON editor_sessions(created_at);

CREATE INDEX IF NOT EXISTS idx_scene_compositions_public ON scene_compositions(is_public) WHERE is_public = true;

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for tables with updated_at columns
CREATE TRIGGER update_object_materials_updated_at
  BEFORE UPDATE ON object_materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_model_environments_updated_at
  BEFORE UPDATE ON model_environments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_object_transforms_updated_at
  BEFORE UPDATE ON object_transforms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_editor_presets_updated_at
  BEFORE UPDATE ON editor_presets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scene_compositions_updated_at
  BEFORE UPDATE ON scene_compositions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (DISABLED FOR DEVELOPMENT)
-- ============================================
-- Disable RLS for all enhanced editor tables during development
-- In production, enable RLS and create proper policies

ALTER TABLE object_materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE model_environments DISABLE ROW LEVEL SECURITY;
ALTER TABLE object_transforms DISABLE ROW LEVEL SECURITY;
ALTER TABLE material_textures DISABLE ROW LEVEL SECURITY;
ALTER TABLE editor_presets DISABLE ROW LEVEL SECURITY;
ALTER TABLE editor_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE scene_compositions DISABLE ROW LEVEL SECURITY;

-- ============================================
-- DEFAULT DATA - SYSTEM PRESETS
-- ============================================
-- Insert default material presets that come with the system
INSERT INTO editor_presets (name, description, type, is_public, is_system, preset_data, tags)
VALUES
  ('Glass', 'Transparent glass material', 'material', true, true,
   '{"preset_name": "glass", "properties": {"metalness": 0, "roughness": 0, "opacity": 0.1, "transmission": 1, "ior": 1.5}}',
   ARRAY['glass', 'transparent', 'architectural']),

  ('Polished Gold', 'Shiny gold metal', 'material', true, true,
   '{"preset_name": "gold", "properties": {"metalness": 1, "roughness": 0.1, "color": {"r": 255, "g": 215, "b": 0}}}',
   ARRAY['metal', 'gold', 'jewelry']),

  ('Rough Concrete', 'Textured concrete surface', 'material', true, true,
   '{"preset_name": "concrete", "properties": {"metalness": 0, "roughness": 0.95, "color": {"r": 156, "g": 156, "b": 156}}}',
   ARRAY['concrete', 'architectural', 'rough']),

  ('Studio Lighting', 'Professional studio lighting setup', 'lighting', true, true,
   '{"ambient": {"intensity": 0.5}, "directional": [{"intensity": 2, "position": {"x": 10, "y": 10, "z": 5}}]}',
   ARRAY['studio', 'professional', 'product'])
ON CONFLICT DO NOTHING;

-- ============================================
-- MIGRATION COMPLETE MESSAGE
-- ============================================
-- This migration creates all tables needed for the enhanced 3D editor
-- All Row Level Security is DISABLED for development
-- Remember to enable RLS and create policies for production use