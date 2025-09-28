import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL'] || '',
  process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || ''
);

export interface ObjectGroup {
  id?: string;
  model_id: string;
  group_name: string;
  member_objects: string[];
  created_at?: string;
  updated_at?: string;
}

// Save groups to database
export async function saveGroups(modelId: string, groups: Map<string, string[]>) {
  try {
    // Delete existing groups for this model
    await supabase
      .from('object_groups')
      .delete()
      .eq('model_id', modelId);

    // Insert new groups
    const groupsToInsert = Array.from(groups.entries()).map(([groupName, members]) => ({
      model_id: modelId,
      group_name: groupName,
      member_objects: members
    }));

    if (groupsToInsert.length > 0) {
      const { error } = await supabase
        .from('object_groups')
        .insert(groupsToInsert);

      if (error) {
        console.error('Failed to save groups:', error);
        throw error;
      }
    }

    console.warn('Groups saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving groups:', error);
    throw error;
  }
}

// Load groups from database
export async function loadGroups(modelId: string): Promise<Map<string, string[]>> {
  try {
    const { data, error } = await supabase
      .from('object_groups')
      .select('*')
      .eq('model_id', modelId);

    if (error) {
      console.error('Failed to load groups:', error);
      throw error;
    }

    const groupsMap = new Map<string, string[]>();
    if (data) {
      data.forEach((group: ObjectGroup) => {
        groupsMap.set(group.group_name, group.member_objects || []);
      });
    }

    console.warn('Groups loaded successfully:', groupsMap.size);
    return groupsMap;
  } catch (error) {
    console.error('Error loading groups:', error);
    return new Map();
  }
}

// Update a single group
export async function updateGroup(modelId: string, groupName: string, members: string[]) {
  try {
    const { error } = await supabase
      .from('object_groups')
      .upsert({
        model_id: modelId,
        group_name: groupName,
        member_objects: members
      }, {
        onConflict: 'model_id,group_name'
      });

    if (error) {
      console.error('Failed to update group:', error);
      throw error;
    }

    console.warn('Group updated successfully:', groupName);
    return true;
  } catch (error) {
    console.error('Error updating group:', error);
    throw error;
  }
}

// Delete a group
export async function deleteGroup(modelId: string, groupName: string) {
  try {
    const { error } = await supabase
      .from('object_groups')
      .delete()
      .eq('model_id', modelId)
      .eq('group_name', groupName);

    if (error) {
      console.error('Failed to delete group:', error);
      throw error;
    }

    console.warn('Group deleted successfully:', groupName);
    return true;
  } catch (error) {
    console.error('Error deleting group:', error);
    throw error;
  }
}