import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ExpirationOption, DownloadLimit } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export function getExpirationDate(option: ExpirationOption): Date | null {
  const now = new Date()
  switch (option) {
    case '1h':
      return new Date(now.getTime() + 60 * 60 * 1000)
    case '24h':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000)
    case '7d':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    case '30d':
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    case 'never':
      return null
  }
}

export function getMaxDownloads(option: DownloadLimit): number | null {
  if (option === 'unlimited') return null
  return option
}

export function isFileExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

export function isDownloadExhausted(
  downloadCount: number,
  maxDownloads: number | null,
): boolean {
  if (maxDownloads === null) return false
  return downloadCount >= maxDownloads
}

export function formatRelativeTime(date: string | null): string {
  if (!date) return 'Never'
  const d = new Date(date)
  const now = new Date()
  const diff = d.getTime() - now.getTime()

  if (diff < 0) return 'Expired'

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 60) return `Expires in ${minutes}m`
  if (hours < 24) return `Expires in ${hours}h`
  return `Expires in ${days}d`
}

export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'music'
  if (mimeType.includes('pdf')) return 'file-text'
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return 'archive'
  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) return 'sheet'
  if (mimeType.includes('doc') || mimeType.includes('word')) return 'file-text'
  if (mimeType.includes('text/')) return 'file-text'
  return 'file'
}

export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
  'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/flac',
  'application/pdf',
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
  'application/x-tar', 'application/gzip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv', 'text/html', 'text/css', 'text/javascript',
  'application/json', 'application/xml',
])

export const MAX_FILE_SIZE = (parseInt(process.env.MAX_FILE_SIZE_MB ?? '500')) * 1024 * 1024

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `File exceeds maximum size of ${formatBytes(MAX_FILE_SIZE)}`
  }
  // MIME validation is a hint; real validation happens server-side
  return null
}
