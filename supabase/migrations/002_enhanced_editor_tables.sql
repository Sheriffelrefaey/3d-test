-- Create object materials table for storing material settings per object
CREATE TABLE IF NOT EXISTS object_materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID REFERENCES models(id) ON DELETE CASCADE,
  object_name TEXT NOT NULL,
  material_type TEXT DEFAULT 'custom', -- 'custom', 'preset'
  preset_name TEXT, -- 'marble', 'glass', 'wood', 'concrete', 'metal', 'fabric', 'plastic', 'stone'
  color JSONB DEFAULT '{"r": 255, "g": 255, "b": 255, "a": 1}', -- RGBA color
  texture_url TEXT,
  texture_settings JSONB DEFAULT '{"scale": {"x": 1, "y": 1}, "offset": {"x": 0, "y": 0}, "rotation": 0}',
  properties JSONB DEFAULT '{"metalness": 0, "roughness": 0.5, "opacity": 1, "emissive": {"r": 0, "g": 0, "b": 0}, "emissiveIntensity": 0}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(model_id, object_name)
);

-- Create model environment settings table
CREATE TABLE IF NOT EXISTS model_environments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID REFERENCES models(id) ON DELETE CASCADE UNIQUE,
  background JSONB DEFAULT '{"type": "solid", "color": {"r": 245, "g": 245, "b": 245}, "gradient": null}',
  fog JSONB DEFAULT '{"enabled": false, "color": {"r": 255, "g": 255, "b": 255}, "near": 10, "far": 100, "density": 0.01}',
  lighting JSONB DEFAULT '{"ambient": {"color": {"r": 255, "g": 255, "b": 255}, "intensity": 0.8}, "directional": [{"color": {"r": 255, "g": 255, "b": 255}, "intensity": 1.5, "position": {"x": 10, "y": 10, "z": 5}, "castShadow": true}], "points": []}',
  grid JSONB DEFAULT '{"show": true, "color": {"r": 156, "g": 163, "b": 175}, "size": 20, "divisions": 20, "opacity": 0.5}',
  post_processing JSONB DEFAULT '{"bloom": {"enabled": false, "intensity": 1}, "dof": {"enabled": false, "focus": 10, "aperture": 0.025}, "vignette": {"enabled": false, "darkness": 0.5}}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create object transforms table for visibility and transformations
CREATE TABLE IF NOT EXISTS object_transforms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID REFERENCES models(id) ON DELETE CASCADE,
  object_name TEXT NOT NULL,
  visible BOOLEAN DEFAULT true,
  deleted BOOLEAN DEFAULT false,
  position JSONB DEFAULT '{"x": 0, "y": 0, "z": 0}',
  rotation JSONB DEFAULT '{"x": 0, "y": 0, "z": 0}',
  scale JSONB DEFAULT '{"x": 1, "y": 1, "z": 1}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(model_id, object_name)
);

-- Create indexes for better performance
CREATE INDEX idx_object_materials_model_id ON object_materials(model_id);
CREATE INDEX idx_object_transforms_model_id ON object_transforms(model_id);
CREATE INDEX idx_object_materials_object_name ON object_materials(object_name);
CREATE INDEX idx_object_transforms_object_name ON object_transforms(object_name);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_object_materials_updated_at
  BEFORE UPDATE ON object_materials
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_model_environments_updated_at
  BEFORE UPDATE ON model_environments
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_object_transforms_updated_at
  BEFORE UPDATE ON object_transforms
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- Disable RLS for development (enable in production with proper policies)
ALTER TABLE object_materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE model_environments DISABLE ROW LEVEL SECURITY;
ALTER TABLE object_transforms DISABLE ROW LEVEL SECURITY;