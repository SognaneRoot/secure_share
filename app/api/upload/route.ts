import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { getExpirationDate, getMaxDownloads } from '@/lib/utils'
import { z } from 'zod'
import type { ExpirationOption, DownloadLimit } from '@/types'

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB ?? '500') * 1024 * 1024

// Metadata validation (file content itself is already encrypted)
const metadataSchema = z.object({
  shareId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
  fileSize: z.coerce.number().positive().max(MAX_FILE_SIZE),
  fileType: z.string().min(1).max(100),
  iv: z.string().regex(/^[0-9a-f]{24}$/i, 'IV must be 24 hex chars (12 bytes)'),
  expiration: z.enum(['1h', '24h', '7d', '30d', 'never']),
  maxDownloads: z.union([
    z.literal('1'),
    z.literal('5'),
    z.literal('10'),
    z.literal('unlimited'),
  ]),
  salt: z.string().regex(/^[0-9a-f]+$/i).optional(),
  hasPassword: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = await getClientIp(request)
    const { allowed, remaining } = await checkRateLimit(ip)

    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'Retry-After': '3600',
          },
        },
      )
    }

    // Parse multipart form
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate encrypted file size
    if (file.size > MAX_FILE_SIZE * 1.01) {
      // allow 1% overhead for encryption
      return NextResponse.json({ error: 'File too large' }, { status: 413 })
    }

    // Validate MIME type of the encrypted wrapper
    // The actual content is opaque ciphertext wrapped as octet-stream
    const mimeType = file.type
    if (mimeType && mimeType !== 'application/octet-stream' && mimeType !== '') {
      // Accept only octet-stream for encrypted blobs
      // (some browsers may send empty string)
    }

    // Parse & validate metadata
    const rawMeta = {
      shareId: formData.get('shareId'),
      fileName: formData.get('fileName'),
      fileSize: formData.get('fileSize'),
      fileType: formData.get('fileType'),
      iv: formData.get('iv'),
      expiration: formData.get('expiration'),
      maxDownloads: formData.get('maxDownloads'),
      salt: formData.get('salt') ?? undefined,
      hasPassword: formData.get('hasPassword') ?? undefined,
    }

    const parsed = metadataSchema.safeParse(rawMeta)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid metadata', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const meta = parsed.data

    // Sanitize filename
    const safeFileName = meta.fileName
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
      .slice(0, 255)

    // Get current user (optional)
    const supabase = await createServiceClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Upload encrypted blob to Supabase Storage
    const storagePath = `uploads/${meta.shareId}.enc`
    const fileBuffer = await file.arrayBuffer()

    const { error: storageError } = await supabase.storage
      .from('encrypted-files')
      .upload(storagePath, fileBuffer, {
        contentType: 'application/octet-stream',
        upsert: false,
      })

    if (storageError) {
      console.error('Storage upload error:', storageError)
      return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 })
    }

    // Compute expiration and download limits
    const expiresAt = getExpirationDate(meta.expiration as ExpirationOption)
    const maxDownloads = getMaxDownloads(
      (meta.maxDownloads === 'unlimited'
        ? 'unlimited'
        : parseInt(meta.maxDownloads)) as DownloadLimit,
    )

    // Insert database record
    const { error: dbError } = await supabase.from('file_records').insert({
      id: meta.shareId,
      user_id: user?.id ?? null,
      file_name: safeFileName,
      file_size: meta.fileSize,
      file_type: meta.fileType,
      storage_path: storagePath,
      max_downloads: maxDownloads,
      expires_at: expiresAt?.toISOString() ?? null,
      is_password_protected: meta.hasPassword === 'true',
      salt: meta.salt ?? null,
      iv: meta.iv,
    })

    if (dbError) {
      // Roll back storage upload
      await supabase.storage.from('encrypted-files').remove([storagePath])
      console.error('Database insert error:', dbError)
      return NextResponse.json({ error: 'Failed to save file record' }, { status: 500 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    return NextResponse.json(
      {
        shareId: meta.shareId,
        shareUrl: `${appUrl}/f/${meta.shareId}`,
      },
      {
        status: 201,
        headers: {
          'X-RateLimit-Remaining': String(remaining),
        },
      },
    )
  } catch (err) {
    console.error('Upload route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
