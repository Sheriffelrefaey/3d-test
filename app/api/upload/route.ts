import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    if (!file || !name) {
      return NextResponse.json(
        { error: 'File and name are required' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['.gltf', '.glb', '.obj', '.fbx'];
    const fileName = file.name.toLowerCase();
    const isValid = validTypes.some(type => fileName.endsWith(type));

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid file type. Supported: GLTF, GLB, OBJ, FBX' },
        { status: 400 }
      );
    }

    // Check file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 100MB' },
        { status: 400 }
      );
    }

    // Use service key for uploads to bypass RLS temporarily
    // This is a workaround until RLS policies are fixed in Supabase Dashboard
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabase = createSupabaseClient(
      process.env['NEXT_PUBLIC_SUPABASE_URL'] || '',
      process.env['SUPABASE_SERVICE_KEY'] || process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Generate unique file name
    const timestamp = Date.now();
    const fileExt = fileName.split('.').pop();
    const safeName = name.replace(/[^a-zA-Z0-9-_]/g, '_');
    const uniqueFileName = `${timestamp}_${safeName}.${fileExt}`;

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload file to Supabase Storage
    const { data: _uploadData, error: uploadError } = await supabase.storage
      .from('models')
      .upload(uniqueFileName, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error details:', uploadError);
      return NextResponse.json(
        {
          error: 'Failed to upload file to storage',
          details: uploadError.message
        },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('models')
      .getPublicUrl(uniqueFileName);

    // Save model metadata to database
    const { data: model, error: dbError } = await supabase
      .from('models')
      .insert({
        name,
        description: description || null,
        file_url: publicUrl,
        file_size: file.size, // Track file size in bytes
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error details:', dbError);

      // Try to delete the uploaded file since DB insert failed
      const { error: deleteError } = await supabase.storage
        .from('models')
        .remove([uniqueFileName]);

      if (deleteError) {
        console.error('Failed to cleanup file after DB error:', deleteError);
      }

      // Check if it's a missing column error
      if (dbError.message?.includes('file_size')) {
        // Try again without file_size
        const { data: modelRetry, error: retryError } = await supabase
          .from('models')
          .insert({
            name,
            description: description || null,
            file_url: publicUrl,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (!retryError && modelRetry) {
          return NextResponse.json({
            id: modelRetry.id,
            name: modelRetry.name,
            file_url: modelRetry.file_url,
            message: 'Model uploaded successfully (without file size tracking)',
          });
        }
      }

      return NextResponse.json(
        {
          error: 'Failed to save model to database',
          details: dbError.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: model.id,
      name: model.name,
      file_url: model.file_url,
      message: 'Model uploaded successfully',
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}