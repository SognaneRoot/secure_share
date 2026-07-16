// ============================================================
// Core domain types for Secure Share
// ============================================================

export type ExpirationOption = '1h' | '24h' | '7d' | '30d' | 'never'
export type DownloadLimit = 1 | 5 | 10 | 'unlimited'

export interface FileRecord {
  id: string
  user_id: string | null
  file_name: string
  file_size: number
  file_type: string
  storage_path: string
  download_count: number
  max_downloads: number | null
  expires_at: string | null
  created_at: string
  updated_at: string
  is_password_protected: boolean
  salt: string | null
  iv: string
  deleted_at: string | null
}

export interface FileRecordInsert {
  id: string
  user_id?: string | null
  file_name: string
  file_size: number
  file_type: string
  storage_path: string
  max_downloads?: number | null
  expires_at?: string | null
  is_password_protected: boolean
  salt?: string | null
  iv: string
}

export interface UploadOptions {
  expiration: ExpirationOption
  maxDownloads: DownloadLimit
  password?: string
}

export interface UploadResult {
  shareId: string
  shareUrl: string
  key: string
}

export interface DownloadInfo {
  id: string
  fileName: string
  fileSize: number
  fileType: string
  downloadCount: number
  maxDownloads: number | null
  expiresAt: string | null
  isPasswordProtected: boolean
  createdAt: string
}

export interface EncryptionResult {
  encryptedData: ArrayBuffer
  iv: Uint8Array
  key: CryptoKey
  salt?: Uint8Array
}

export interface DecryptionInput {
  encryptedData: ArrayBuffer
  iv: Uint8Array
  key: CryptoKey
}

export interface UploadState {
  status: 'idle' | 'compressing' | 'encrypting' | 'uploading' | 'done' | 'error'
  progress: number
  error?: string
  result?: UploadResult
}

export interface FileWithPreview extends File {
  preview?: string
}

// API Response types
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
}

export interface UploadApiResponse {
  shareId: string
  shareUrl: string
  key: string
}

export interface DownloadApiResponse {
  downloadUrl: string
  fileName: string
  fileSize: number
  fileType: string
  isPasswordProtected: boolean
  iv: string
  salt: string | null
}

export interface StatsResponse {
  totalFiles: number
  totalSize: number
  totalDownloads: number
  activeFiles: number
}

export interface ListResponse {
  files: FileRecord[]
  total: number
}

// Dashboard
export interface DashboardFile extends FileRecord {
  isExpired: boolean
  isExhausted: boolean
}
