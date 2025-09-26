-- Create models table
CREATE TABLE IF NOT EXISTS models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create annotations table
CREATE TABLE IF NOT EXISTS annotations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID REFERENCES models(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  position JSONB NOT NULL, -- {x, y, z}
  normal JSONB, -- {x, y, z}
  color VARCHAR(7) DEFAULT '#FF0000',
  icon VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create annotation interactions table
CREATE TABLE IF NOT EXISTS annotation_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  annotation_id UUID REFERENCES annotations(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'click', 'hover', 'view'
  user_id UUID REFERENCES auth.users(id),
  session_id VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_models_created_at ON models(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_annotations_model_id ON annotations(model_id);
CREATE INDEX IF NOT EXISTS idx_interactions_annotation_id ON annotation_interactions(annotation_id);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON annotation_interactions(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotation_interactions ENABLE ROW LEVEL SECURITY;

-- Create policies for models table
-- Anyone can view models
CREATE POLICY "Models are viewable by everyone" ON models
  FOR SELECT USING (true);

-- Authenticated users can insert models
CREATE POLICY "Authenticated users can create models" ON models
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own models
CREATE POLICY "Users can update their own models" ON models
  FOR UPDATE USING (auth.uid() = created_by);

-- Users can delete their own models
CREATE POLICY "Users can delete their own models" ON models
  FOR DELETE USING (auth.uid() = created_by);

-- Create policies for annotations table
-- Anyone can view annotations
CREATE POLICY "Annotations are viewable by everyone" ON annotations
  FOR SELECT USING (true);

-- Authenticated users can create annotations
CREATE POLICY "Authenticated users can create annotations" ON annotations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own annotations
CREATE POLICY "Users can update their own annotations" ON annotations
  FOR UPDATE USING (auth.uid() = created_by);

-- Users can delete their own annotations
CREATE POLICY "Users can delete their own annotations" ON annotations
  FOR DELETE USING (auth.uid() = created_by);

-- Create policies for annotation_interactions table
-- Anyone can create interactions (for tracking)
CREATE POLICY "Anyone can create interactions" ON annotation_interactions
  FOR INSERT WITH CHECK (true);

-- Only authenticated users can view interactions
CREATE POLICY "Authenticated users can view interactions" ON annotation_interactions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Create storage bucket for 3D models
INSERT INTO storage.buckets (id, name, public)
VALUES ('models', 'models', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for models bucket
CREATE POLICY "Anyone can view models" ON storage.objects
  FOR SELECT USING (bucket_id = 'models');

CREATE POLICY "Authenticated users can upload models" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'models'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update their own models" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'models'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own models" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'models'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_models_updated_at BEFORE UPDATE ON models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_annotations_updated_at BEFORE UPDATE ON annotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();