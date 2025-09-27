import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Annotation } from '@/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const modelId = searchParams.get('model_id');

  const supabase = await createClient();

  try {
    let query = supabase.from('annotations').select('*');

    if (modelId) {
      query = query.eq('model_id', modelId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching annotations:', error);
    return NextResponse.json({ error: 'Failed to fetch annotations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    const { model_id, annotations } = body;

    if (!model_id || !annotations) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Delete existing annotations for this model
    const { error: deleteError } = await supabase
      .from('annotations')
      .delete()
      .eq('model_id', model_id);

    if (deleteError) throw deleteError;

    // Insert new annotations if any
    if (annotations.length > 0) {
      const annotationsToInsert = annotations.map((ann: Omit<Annotation, 'id' | 'created_at' | 'updated_at'>) => ({
        model_id,
        object_name: ann.object_name,
        title: ann.title,
        description: ann.description,
        position_x: ann.position_x,
        position_y: ann.position_y,
        position_z: ann.position_z,
      }));

      const { data, error: insertError } = await supabase
        .from('annotations')
        .insert(annotationsToInsert)
        .select();

      if (insertError) throw insertError;

      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: true, data: [] });
  } catch (error) {
    console.error('Error saving annotations:', error);
    return NextResponse.json(
      { error: 'Failed to save annotations' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Annotation ID is required' },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('annotations')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting annotation:', error);
    return NextResponse.json(
      { error: 'Failed to delete annotation' },
      { status: 500 }
    );
  }
}