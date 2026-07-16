'use client'

import { useCallback, useState } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, File, X, Shield } from 'lucide-react'
import { formatBytes, validateFile } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface DropzoneProps {
  onFileSelect: (file: File) => void
  selectedFile: File | null
  onClear: () => void
  disabled?: boolean
}

export function Dropzone({ onFileSelect, selectedFile, onClear, disabled }: DropzoneProps) {
  const [dragError, setDragError] = useState<string | null>(null)

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setDragError(null)
      if (rejectedFiles.length > 0) {
        setDragError(rejectedFiles[0].errors[0].message)
        return
      }
      const file = acceptedFiles[0]
      if (!file) return
      const validationError = validateFile(file)
      if (validationError) { setDragError(validationError); return }
      onFileSelect(file)
    },
    [onFileSelect],
  )

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop, maxFiles: 1, disabled, maxSize: 500 * 1024 * 1024,
  })

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {selectedFile ? (
          <motion.div key="selected" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
            <div className="flex items-center gap-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-5 backdrop-blur-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-500/30">
                <File className="h-6 w-6 text-indigo-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{selectedFile.name}</p>
                <p className="text-xs text-white/50 mt-0.5">{formatBytes(selectedFile.size)} · {selectedFile.type || 'Unknown type'}</p>
              </div>
              {!disabled && (
                <button onClick={(e) => { e.stopPropagation(); onClear() }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
                  aria-label="Remove file">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div key="dropzone" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
            <div
              {...getRootProps()}
              className={cn(
                'relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-200 cursor-pointer group',
                isDragActive && !isDragReject && 'border-indigo-500 bg-indigo-500/10',
                isDragReject && 'border-red-500 bg-red-500/10',
                !isDragActive && 'border-white/20 hover:border-white/40 hover:bg-white/5',
                disabled && 'pointer-events-none opacity-50',
              )}
            >
              <input {...getInputProps()} />
              <motion.div animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
                className={cn('flex h-16 w-16 items-center justify-center rounded-2xl transition-colors', isDragActive ? 'bg-indigo-500/30' : 'bg-white/10 group-hover:bg-white/15')}>
                <Upload className={cn('h-8 w-8 transition-colors', isDragActive ? 'text-indigo-400' : 'text-white/40 group-hover:text-white/60')} />
              </motion.div>
              <div>
                <p className="text-base font-medium text-white/80">{isDragActive ? 'Drop your file here' : 'Drop a file or click to browse'}</p>
                <p className="mt-1 text-sm text-white/40">Up to 500 MB · Any file type</p>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-green-500/10 border border-green-500/20 px-3 py-1">
                <Shield className="h-3 w-3 text-green-400" />
                <span className="text-xs text-green-400">Encrypted before upload</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {dragError && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="mt-2 text-sm text-red-400">
            {dragError}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
