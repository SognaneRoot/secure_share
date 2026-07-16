'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check, QrCode, ExternalLink, RotateCcw, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCopy } from '@/hooks/use-copy'
import type { UploadResult } from '@/types'
import QRCode from 'qrcode'

interface ShareResultProps {
  result: UploadResult
  onReset: () => void
}

export function ShareResult({ result, onReset }: ShareResultProps) {
  const { copied, copy } = useCopy()
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [showQr, setShowQr] = useState(false)

  useEffect(() => {
    QRCode.toDataURL(result.shareUrl, {
      width: 200,
      margin: 2,
      color: { dark: '#ffffff', light: '#00000000' },
    })
      .then(setQrDataUrl)
      .catch(console.error)
  }, [result.shareUrl])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      {/* Success header */}
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/20 border border-green-500/30 mx-auto"
        >
          <Check className="h-8 w-8 text-green-400" />
        </motion.div>
        <h3 className="text-xl font-semibold text-white">File encrypted & ready</h3>
        <p className="text-sm text-white/50">
          The decryption key is embedded in the link — we never see it.
        </p>
      </div>

      {/* Share link */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
          Share link
        </label>
        <div className="flex gap-2">
          <div className="flex-1 min-w-0 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
            <p className="truncate text-sm text-white/80 font-mono">{result.shareUrl}</p>
          </div>
          <Button
            onClick={() => copy(result.shareUrl)}
            size="icon"
            className="shrink-0 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-400 hover:text-indigo-300"
            aria-label="Copy link"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Security note */}
      <div className="flex items-start gap-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-4">
        <Shield className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs font-medium text-indigo-300">Zero-knowledge encryption</p>
          <p className="text-xs text-indigo-300/60">
            The key after <span className="font-mono">#</span> never reaches our servers. Share the
            full URL including the fragment.
          </p>
        </div>
      </div>

      {/* QR Code */}
      <div>
        <button
          onClick={() => setShowQr(!showQr)}
          className="flex w-full items-center justify-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors py-2"
        >
          <QrCode className="h-4 w-4" />
          {showQr ? 'Hide' : 'Show'} QR code
        </button>

        {showQr && qrDataUrl && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex justify-center pt-2"
          >
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR code for share link" width={200} height={200} />
            </div>
          </motion.div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={onReset}
          variant="outline"
          className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Share another
        </Button>
        <a href={result.shareUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
          <Button className="w-full bg-indigo-500 hover:bg-indigo-600 text-white gap-2">
            <ExternalLink className="h-4 w-4" />
            Open link
          </Button>
        </a>
      </div>
    </motion.div>
  )
}
