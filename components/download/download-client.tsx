'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Lock, Shield, File, AlertCircle, Loader2, Clock, BarChart2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { decryptAndDownload } from '@/lib/crypto'
import { formatBytes, formatRelativeTime } from '@/lib/utils'
import type { DownloadApiResponse } from '@/types'

interface DownloadClientProps {
  id: string
  fileName: string
  fileSize: number
  fileType: string
  downloadCount: number
  maxDownloads: number | null
  expiresAt: string | null
  isPasswordProtected: boolean
  iv: string
  salt: string | null
  createdAt: string
}

type Status = 'idle' | 'loading' | 'decrypting' | 'done' | 'error' | 'needs_password'

export function DownloadClient(props: DownloadClientProps) {
  const {
    id, fileName, fileSize, fileType, downloadCount, maxDownloads,
    expiresAt, isPasswordProtected, iv, salt, createdAt,
  } = props

  const [status, setStatus] = useState<Status>(isPasswordProtected ? 'needs_password' : 'idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [keyFragment, setKeyFragment] = useState<string>('')
  const [autoStarted, setAutoStarted] = useState(false)

  // Extract AES key from URL fragment (never sent to server)
  useEffect(() => {
    const fragment = window.location.hash.slice(1) // remove leading #
    if (fragment) setKeyFragment(fragment)
  }, [])

  // Auto-start download for non-password files once key is available
  useEffect(() => {
    if (!isPasswordProtected && keyFragment && status === 'idle' && !autoStarted) {
      setAutoStarted(true)
      handleDownload()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyFragment])

  const handleDownload = async (pwd?: string) => {
    if (!keyFragment) {
      setError('Decryption key missing from URL. Make sure you copied the full link including everything after #')
      setStatus('error')
      return
    }

    try {
      setStatus('loading')
      setProgress(10)
      setError(null)

      // Fetch encrypted file metadata + signed download URL from server
      const res = await fetch(`/api/download?id=${id}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Download failed' }))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }

      const info: DownloadApiResponse = await res.json()
      setProgress(30)
      setStatus('decrypting')

      // Download encrypted blob
      const blobRes = await fetch(info.downloadUrl)
      if (!blobRes.ok) throw new Error('Failed to fetch encrypted file')
      const encryptedData = await blobRes.arrayBuffer()
      setProgress(60)

      // Decrypt in browser using the key from the URL fragment
      await decryptAndDownload(
        encryptedData,
        keyFragment,
        info.iv,
        info.fileName,
        info.fileType || fileType,
        pwd,
        info.salt,
      )

      setProgress(100)
      setStatus('done')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Decryption failed'
      if (msg.includes('decrypt') || msg.includes('OperationError') || msg.toLowerCase().includes('wrong') || msg.toLowerCase().includes('password')) {
        setError('Wrong password or corrupted key. Check the link and try again.')
      } else {
        setError(msg)
      }
      setStatus('error')
    }
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return
    handleDownload(password)
  }

  return (
    <div className="w-full max-w-md">
      <div className="relative rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 pointer-events-none" />

        <AnimatePresence mode="wait">
          {/* File info header — always shown */}
          <div className="space-y-6" key="content">
            {/* File card */}
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 rounded-2xl bg-white/5 border border-white/10 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-500/30">
                <File className="h-6 w-6 text-indigo-400" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{fileName}</p>
                <p className="text-xs text-white/40 mt-0.5">{formatBytes(fileSize)}</p>
              </div>
            </motion.div>

            {/* Metadata pills */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1">
                <Clock className="h-3 w-3 text-white/40" />
                <span className="text-xs text-white/50">{formatRelativeTime(expiresAt)}</span>
              </div>
              {maxDownloads !== null && (
                <div className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1">
                  <BarChart2 className="h-3 w-3 text-white/40" />
                  <span className="text-xs text-white/50">
                    {downloadCount}/{maxDownloads} downloads
                  </span>
                </div>
              )}
              {isPasswordProtected && (
                <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1">
                  <Lock className="h-3 w-3 text-amber-400" />
                  <span className="text-xs text-amber-300">Password protected</span>
                </div>
              )}
            </div>

            {/* Status area */}
            {status === 'needs_password' && (
              <motion.form
                key="password"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onSubmit={handlePasswordSubmit}
                className="space-y-3"
              >
                <Label className="text-xs text-white/60 uppercase tracking-wider">Enter password to decrypt</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password…"
                  autoFocus
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
                <Button type="submit" className="w-full bg-indigo-500 hover:bg-indigo-600 text-white gap-2">
                  <Lock className="h-4 w-4" />
                  Decrypt & Download
                </Button>
              </motion.form>
            )}

            {(status === 'loading' || status === 'decrypting') && (
              <motion.div key="progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-white/60">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                  {status === 'loading' ? 'Fetching encrypted file…' : 'Decrypting in your browser…'}
                </div>
                <Progress value={progress} className="h-2 bg-white/10" />
              </motion.div>
            )}

            {status === 'done' && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl bg-green-500/10 border border-green-500/20 p-4">
                  <Shield className="h-5 w-5 text-green-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-300">Download started</p>
                    <p className="text-xs text-green-300/60 mt-0.5">File decrypted successfully in your browser</p>
                  </div>
                </div>
                <Button
                  onClick={() => handleDownload(isPasswordProtected ? password : undefined)}
                  variant="outline"
                  className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10 gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download again
                </Button>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4">
                  <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-300">Download failed</p>
                    <p className="text-xs text-red-300/60 mt-0.5">{error}</p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setStatus(isPasswordProtected ? 'needs_password' : 'idle')
                    setError(null)
                    setProgress(0)
                  }}
                  variant="outline"
                  className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10"
                >
                  Try again
                </Button>
              </motion.div>
            )}

            {status === 'idle' && !isPasswordProtected && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Button
                  onClick={() => handleDownload()}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white gap-2 h-12"
                >
                  <Download className="h-4 w-4" />
                  Download file
                </Button>
              </motion.div>
            )}

            {/* Zero knowledge note */}
            <div className="flex items-center gap-2 pt-2">
              <Shield className="h-3.5 w-3.5 text-white/20 shrink-0" />
              <p className="text-xs text-white/30">
                Decryption happens entirely in your browser. The key never leaves this device.
              </p>
            </div>
          </div>
        </AnimatePresence>
      </div>
    </div>
  )
}
