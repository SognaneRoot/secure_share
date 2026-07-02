'use client'

import { useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { encryptFile } from '@/lib/crypto'
import { getExpirationDate, getMaxDownloads } from '@/lib/utils'
import type { UploadState, UploadOptions, UploadResult } from '@/types'

export function useUpload() {
  const [state, setState] = useState<UploadState>({ status: 'idle', progress: 0 })

  const upload = useCallback(async (file: File, options: UploadOptions): Promise<UploadResult | null> => {
    try {
      // Step 1: Compress + Encrypt in browser
      setState({ status: 'compressing', progress: 10 })

      const { encryptedBlob, iv, salt, keyBase64 } = await encryptFile(
        file,
        options.password || undefined,
        (pct) => setState({ status: pct < 50 ? 'compressing' : 'encrypting', progress: pct }),
      )

      setState({ status: 'uploading', progress: 72 })

      // Step 2: Generate share ID client-side
      const shareId = uuidv4()

      // Step 3: Upload encrypted blob to /api/upload
      const formData = new FormData()
      formData.append('file', encryptedBlob, `${shareId}.enc`)
      formData.append('shareId', shareId)
      formData.append('fileName', file.name)
      formData.append('fileSize', String(file.size))
      formData.append('fileType', file.type || 'application/octet-stream')
      formData.append('iv', iv)
      formData.append('expiration', options.expiration)
      formData.append('maxDownloads', String(options.maxDownloads))
      if (salt) formData.append('salt', salt)
      if (options.password) formData.append('hasPassword', 'true')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(err.error ?? 'Upload failed')
      }

      const data = await response.json() as { shareId: string; shareUrl: string }

      setState({ status: 'uploading', progress: 95 })

      // Step 4: Build share URL — key goes in fragment, never sent to server
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
      const shareUrl = `${appUrl}/f/${shareId}#${keyBase64}`

      const result: UploadResult = {
        shareId: data.shareId,
        shareUrl,
        key: keyBase64,
      }

      setState({ status: 'done', progress: 100, result })
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setState({ status: 'error', progress: 0, error: message })
      return null
    }
  }, [])

  const reset = useCallback(() => {
    setState({ status: 'idle', progress: 0 })
  }, [])

  return { state, upload, reset }
}
