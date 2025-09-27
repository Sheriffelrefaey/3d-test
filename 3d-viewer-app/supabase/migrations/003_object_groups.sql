-- Create object_groups table to store grouped objects
CREATE TABLE IF NOT EXISTS object_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID REFERENCES models(id) ON DELETE CASCADE,
  group_name VARCHAR(255) NOT NULL,
  member_objects JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(model_id, group_name)
);

-- Add RLS policies for object_groups
ALTER TABLE object_groups ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read groups
CREATE POLICY "object_groups_read" ON object_groups
  FOR SELECT USING (true);

-- Allow authenticated users to create groups
CREATE POLICY "object_groups_create" ON object_groups
  FOR INSERT WITH CHECK (true);

-- Allow authenticated users to update groups
CREATE POLICY "object_groups_update" ON object_groups
  FOR UPDATE USING (true);

-- Allow authenticated users to delete groups
CREATE POLICY "object_groups_delete" ON object_groups
  FOR DELETE USING (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_object_groups_updated_at BEFORE UPDATE
    ON object_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();