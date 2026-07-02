/**
 * Cryptographic utilities — AES-256-GCM, PBKDF2, gzip.
 * Encryption/decryption happens exclusively in the browser.
 * The server NEVER receives the AES key — it only travels in the URL fragment (#).
 */

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 12
const SALT_LENGTH = 16
const PBKDF2_ITERATIONS = 100_000

// ─── Key Generation ───────────────────────────────────────────

export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: ALGORITHM, length: KEY_LENGTH }, true, ['encrypt', 'decrypt'])
}

export async function deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt'],
  )
}

// ─── Serialization ────────────────────────────────────────────

export async function exportKeyToBase64(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key)
  return arrayBufferToBase64url(raw)
}

export async function importKeyFromBase64(b64: string): Promise<CryptoKey> {
  const raw = base64urlToArrayBuffer(b64)
  return crypto.subtle.importKey('raw', raw, { name: ALGORITHM, length: KEY_LENGTH }, true, ['encrypt', 'decrypt'])
}

// ─── Encryption / Decryption ──────────────────────────────────

export async function encryptData(data: ArrayBuffer, key: CryptoKey): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const encrypted = await crypto.subtle.encrypt({ name: ALGORITHM, iv: iv.buffer as ArrayBuffer }, key, data)
  return { encrypted, iv }
}

export async function decryptData(encryptedData: ArrayBuffer, key: CryptoKey, iv: Uint8Array): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt({ name: ALGORITHM, iv: iv.buffer as ArrayBuffer }, key, encryptedData)
}

// ─── Compression ──────────────────────────────────────────────

export async function compressData(data: ArrayBuffer): Promise<ArrayBuffer> {
  if (typeof CompressionStream === 'undefined') return data
  const stream = new CompressionStream('gzip')
  const writer = stream.writable.getWriter()
  writer.write(new Uint8Array(data))
  writer.close()
  return collectStream(stream.readable)
}

export async function decompressData(data: ArrayBuffer): Promise<ArrayBuffer> {
  if (typeof DecompressionStream === 'undefined') return data
  const stream = new DecompressionStream('gzip')
  const writer = stream.writable.getWriter()
  writer.write(new Uint8Array(data))
  writer.close()
  return collectStream(stream.readable)
}

async function collectStream(readable: ReadableStream<Uint8Array>): Promise<ArrayBuffer> {
  const chunks: Uint8Array[] = []
  const reader = readable.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  const total = chunks.reduce((s, c) => s + c.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length }
  return out.buffer as ArrayBuffer
}

// ─── Full Pipelines ───────────────────────────────────────────

export interface EncryptionOutput {
  encryptedBlob: Blob
  iv: string
  salt: string | null
  keyBase64: string
}

export async function encryptFile(file: File, password?: string, onProgress?: (pct: number) => void): Promise<EncryptionOutput> {
  onProgress?.(5)
  const fileBuffer = await file.arrayBuffer()
  onProgress?.(20)
  const compressed = await compressData(fileBuffer)
  onProgress?.(35)

  let key: CryptoKey
  let salt: Uint8Array | null = null

  if (password) {
    salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
    key = await deriveKeyFromPassword(password, salt)
  } else {
    key = await generateKey()
  }

  onProgress?.(50)
  const { encrypted, iv } = await encryptData(compressed, key)
  onProgress?.(70)
  const keyBase64 = await exportKeyToBase64(key)

  return {
    encryptedBlob: new Blob([encrypted], { type: 'application/octet-stream' }),
    iv: uint8ArrayToHex(iv),
    salt: salt ? uint8ArrayToHex(salt) : null,
    keyBase64,
  }
}

export async function decryptAndDownload(
  encryptedData: ArrayBuffer,
  keyBase64: string,
  iv: string,
  fileName: string,
  mimeType: string,
  password?: string,
  salt?: string | null,
): Promise<void> {
  let key: CryptoKey
  if (password && salt) {
    key = await deriveKeyFromPassword(password, hexToUint8Array(salt))
  } else {
    key = await importKeyFromBase64(keyBase64)
  }

  const ivBytes = hexToUint8Array(iv)
  const decrypted = await decryptData(encryptedData, key, ivBytes)
  const decompressed = await decompressData(decrypted)

  const blob = new Blob([decompressed], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Helpers ──────────────────────────────────────────────────

export function arrayBufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export function base64urlToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer as ArrayBuffer
}

export function uint8ArrayToHex(arr: Uint8Array): string {
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function hexToUint8Array(hex: string): Uint8Array {
  const result = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) result[i / 2] = parseInt(hex.substring(i, 2), 16)
  return result
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
