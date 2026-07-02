import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const bodySchema = z.object({
  id: z.string().uuid(),
})

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = bodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { id } = parsed.data

    // Get current user
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServiceClient()

    // Fetch record to verify ownership & get storage path
    const { data: record, error: fetchError } = await supabase
      .from('file_records')
      .select('id, user_id, storage_path')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !record) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    if (record.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Soft-delete the DB record
    const { error: deleteError } = await supabase
      .from('file_records')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 })
    }

    // Remove from storage
    const { error: storageError } = await supabase.storage
      .from('encrypted-files')
      .remove([record.storage_path])

    if (storageError) {
      // Log but don't fail — record is already soft-deleted
      console.error('Storage removal error:', storageError)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
