'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dropzone } from './dropzone'
import { UploadOptionsPanel } from './upload-options'
import { UploadProgress } from './upload-progress'
import { ShareResult } from './share-result'
import { Button } from '@/components/ui/button'
import { useUpload } from '@/hooks/use-upload'
import { toast } from '@/hooks/use-toast'
import { ArrowRight, AlertCircle } from 'lucide-react'
import type { UploadOptions } from '@/types'

const DEFAULT_OPTIONS: UploadOptions = {
  expiration: '7d',
  maxDownloads: 'unlimited',
  password: undefined,
}

export function UploadCard() {
  const [file, setFile] = useState<File | null>(null)
  const [options, setOptions] = useState<UploadOptions>(DEFAULT_OPTIONS)
  const { state, upload, reset } = useUpload()

  const isProcessing = state.status !== 'idle' && state.status !== 'done' && state.status !== 'error'

  const handleUpload = async () => {
    if (!file) return
    if (options.password !== undefined && options.password.trim() === '') {
      toast({ title: 'Password required', description: 'Enter a password or disable password protection.', variant: 'destructive' })
      return
    }
    await upload(file, options)
  }

  const handleReset = () => {
    reset()
    setFile(null)
    setOptions(DEFAULT_OPTIONS)
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="relative rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">
        {/* Glow */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 pointer-events-none" />

        <AnimatePresence mode="wait">
          {state.status === 'done' && state.result ? (
            <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ShareResult result={state.result} onReset={handleReset} />
            </motion.div>
          ) : state.status === 'error' ? (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4">
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-300">Upload failed</p>
                  <p className="text-xs text-red-300/60 mt-0.5">{state.error}</p>
                </div>
              </div>
              <Button onClick={handleReset} variant="outline" className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10">
                Try again
              </Button>
            </motion.div>
          ) : isProcessing ? (
            <motion.div key="progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <UploadProgress state={state} />
            </motion.div>
          ) : (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              {/* Header */}
              <div>
                <h2 className="text-xl font-semibold text-white">Share a file</h2>
                <p className="text-sm text-white/40 mt-1">Encrypted in your browser before it leaves your device</p>
              </div>

              {/* Dropzone */}
              <Dropzone
                onFileSelect={setFile}
                selectedFile={file}
                onClear={() => setFile(null)}
                disabled={isProcessing}
              />

              {/* Options */}
              {file && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <UploadOptionsPanel options={options} onChange={setOptions} disabled={isProcessing} />
                </motion.div>
              )}

              {/* Upload button */}
              {file && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <Button
                    onClick={handleUpload}
                    disabled={!file || isProcessing}
                    className="w-full h-12 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium gap-2 text-base shadow-lg shadow-indigo-500/25"
                  >
                    Encrypt & Share
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
