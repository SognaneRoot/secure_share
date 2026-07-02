import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isFileExpired, isDownloadExhausted } from '@/lib/utils'
import { getClientIp } from '@/lib/rate-limit'
import { z } from 'zod'

const querySchema = z.object({
  id: z.string().uuid(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = querySchema.safeParse({ id: searchParams.get('id') })

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 })
    }

    const { id } = parsed.data
    const supabase = await createServiceClient()

    // Fetch file record
    const { data: record, error: fetchError } = await supabase
      .from('file_records')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !record) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Check expiration
    if (isFileExpired(record.expires_at)) {
      return NextResponse.json({ error: 'File has expired' }, { status: 410 })
    }

    // Check download limit
    if (isDownloadExhausted(record.download_count, record.max_downloads)) {
      return NextResponse.json({ error: 'Download limit reached' }, { status: 410 })
    }

    // Generate signed URL (valid for 60 seconds — client downloads immediately)
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('encrypted-files')
      .createSignedUrl(record.storage_path, 60)

    if (urlError || !signedUrl?.signedUrl) {
      console.error('Signed URL error:', urlError)
      return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 })
    }

    // Increment download counter + record event
    const ip = await getClientIp(request)
    const ua = request.headers.get('user-agent') ?? ''

    await Promise.all([
      supabase.rpc('increment_download_count', { record_id: id }),
      supabase.from('download_events').insert({ file_id: id, ip, user_agent: ua }),
    ])

    // Return metadata — NOT the key (key stays in browser fragment)
    return NextResponse.json({
      downloadUrl: signedUrl.signedUrl,
      fileName: record.file_name,
      fileSize: record.file_size,
      fileType: record.file_type,
      isPasswordProtected: record.is_password_protected,
      iv: record.iv,
      salt: record.salt,
    })
  } catch (err) {
    console.error('Download route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
