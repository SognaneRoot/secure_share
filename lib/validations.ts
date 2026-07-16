import { z } from 'zod'

export const uploadOptionsSchema = z.object({
  expiration: z.enum(['1h', '24h', '7d', '30d', 'never']),
  maxDownloads: z.union([z.literal(1), z.literal(5), z.literal(10), z.literal('unlimited')]),
  password: z.string().min(1).max(128).optional(),
  fileName: z.string().min(1).max(255),
  fileSize: z.number().positive().max(500 * 1024 * 1024),
  fileType: z.string().min(1).max(100),
  iv: z.string().regex(/^[0-9a-f]+$/i),
  salt: z.string().regex(/^[0-9a-f]+$/i).nullable().optional(),
  shareId: z.string().uuid(),
})

export const downloadRequestSchema = z.object({
  id: z.string().uuid(),
})

export const deleteRequestSchema = z.object({
  id: z.string().uuid(),
})

export type UploadOptionsInput = z.infer<typeof uploadOptionsSchema>
