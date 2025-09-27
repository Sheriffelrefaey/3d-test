# Setup Instructions for Enhanced 3D Editor

## Overview
The enhanced 3D editor adds advanced material editing, lighting controls, and environment customization to your 3D model viewer. Follow these steps to enable all features.

## 1. Run Database Migrations

The enhanced editor requires new database tables for materials, environments, and transforms. Run this SQL in your Supabase SQL editor:

### Step 1: Go to Supabase Dashboard
1. Open your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"

### Step 2: Run Migration Script
Copy and paste this entire SQL script:

```sql
-- Create object materials table for storing material settings per object
CREATE TABLE IF NOT EXISTS object_materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID REFERENCES models(id) ON DELETE CASCADE,
  object_name TEXT NOT NULL,
  material_type TEXT DEFAULT 'custom',
  preset_name TEXT,
  color JSONB DEFAULT '{"r": 255, "g": 255, "b": 255, "a": 1}',
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

-- Create object transforms table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_object_materials_model_id ON object_materials(model_id);
CREATE INDEX IF NOT EXISTS idx_object_transforms_model_id ON object_transforms(model_id);

-- Disable RLS for development (enable with proper policies in production)
ALTER TABLE object_materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE model_environments DISABLE ROW LEVEL SECURITY;
ALTER TABLE object_transforms DISABLE ROW LEVEL SECURITY;
```

### Step 3: Click "Run"
The migration should execute successfully. You'll see "Success. No rows returned" if everything worked.

## 2. Using the Enhanced Editor

### Access the Enhanced Editor
1. Go to the Admin panel at http://localhost:3000/admin
2. Click "Edit" on any model
3. The page will default to the Enhanced Editor

### Toggle Between Editors
- Click the "Basic Editor" / "Enhanced Editor" button in the top bar to switch between modes
- Enhanced Editor: Full material, lighting, and environment controls
- Basic Editor: Simple annotation-only mode

## 3. Enhanced Editor Features

### Material Panel
- **Material Presets**: Choose from 13 pre-configured materials
  - Glass (transparent with refraction)
  - Marble (realistic stone texture)
  - Wood (natural grain patterns)
  - Concrete (rough surface)
  - Metals (gold, silver, copper)
  - And more...
- **Color Picker**: Advanced color selection with HSL/RGB/HEX modes
- **Material Properties**:
  - Metalness (0-1): How metallic the surface appears
  - Roughness (0-1): Surface roughness
  - Opacity (0-1): Transparency level
  - Emissive: Make objects glow
  - Special properties for glass and plastic materials

### Environment Panel
- **Background Options**:
  - Solid color
  - Gradient (linear or radial with custom color stops)
  - Environment presets (studio, city, sunset, etc.)
- **Lighting Controls**:
  - Ambient light color and intensity
  - Multiple directional lights with position control
  - Shadow settings
- **Fog Settings**:
  - Enable/disable fog
  - Fog color, near/far distance, and density
- **Grid Customization**:
  - Show/hide grid
  - Grid color, size, and divisions
  - Opacity control

### Object Controls
- **Delete Object**: Remove objects from the scene
- **Toggle Visibility**: Show/hide objects
- **Transform Controls**: Position, rotation, scale (coming soon)

### Keyboard Shortcuts
- `Ctrl/Cmd + S`: Save all changes
- `Ctrl/Cmd + Z`: Undo last action
- `Ctrl/Cmd + Y`: Redo action
- `Delete`: Delete selected object
- `Escape`: Deselect current object

## 4. Saving and Loading

### Auto-save Indicator
The editor shows "Unsaved changes" when modifications are pending.

### Manual Save
Click the "Save" button or press `Ctrl/Cmd + S` to save:
- Material settings
- Environment configuration
- Object visibility/deletions
- Annotations

### Data Persistence
All settings are saved to the database and will be restored when:
- Reopening the editor
- Viewing the model (materials and environment applied)

## 5. Troubleshooting

### Materials Not Applying
1. Make sure you've run the database migrations
2. Click on an object first to select it
3. Check that the object has a name (visible in Material Panel header)

### Environment Changes Not Visible
1. Some settings require a moment to apply
2. Try toggling the setting off and on
3. Check browser console for errors

### Performance Issues
1. Complex models may slow down with many material changes
2. Try reducing the number of directional lights
3. Disable fog if not needed
4. Use simpler material presets (avoid glass for many objects)

### Database Errors
If you see "Failed to save" errors:
1. Check that all three tables were created successfully
2. Ensure RLS is disabled (or proper policies are set)
3. Check Supabase logs for detailed error messages

## 6. Feature Roadmap

### Coming Soon
- Texture upload and management
- Transform gizmos for object positioning
- Undo/redo functionality
- Export/import settings
- Real-time collaboration

### Future Enhancements
- Animation timeline
- Physics simulation
- Advanced post-processing effects
- Custom shader editor
- VR/AR preview modes

## 7. Tips for Best Results

### Material Selection
- **Glass**: Best for windows, bottles, transparent objects
- **Marble/Stone**: Great for architectural elements
- **Metal**: Use for mechanical parts, jewelry
- **Wood**: Ideal for furniture, floors
- **Plastic**: Good for product visualization

### Lighting Setup
- Start with one main directional light
- Add fill lights to reduce harsh shadows
- Use ambient light to control overall brightness
- Enable shadows for realism (impacts performance)

### Environment Design
- Gradients work well for studio-style backgrounds
- Use fog for atmospheric depth
- Grid helps with scale reference
- Environment presets provide realistic reflections

## Need Help?

If you encounter issues:
1. Check the browser console for errors
2. Verify database tables are created
3. Ensure all npm packages are installed
4. Try refreshing the page
5. Switch to Basic Editor as a fallback

The Enhanced Editor is a powerful tool that transforms your 3D viewer into a professional-grade visualization platform!