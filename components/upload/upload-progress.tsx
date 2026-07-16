'use client'

import { motion } from 'framer-motion'
import { Loader2, Lock, Upload, CheckCircle2 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import type { UploadState } from '@/types'

const STEPS = [
  { key: 'compressing', label: 'Compressing' },
  { key: 'encrypting', label: 'Encrypting with AES-256-GCM' },
  { key: 'uploading', label: 'Uploading encrypted file' },
] as const

interface UploadProgressProps { state: UploadState }

export function UploadProgress({ state }: UploadProgressProps) {
  const statusOrder = ['compressing', 'encrypting', 'uploading', 'done']
  const currentIdx = statusOrder.indexOf(state.status)

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-white/50">
          <span>{state.status === 'done' ? 'Done' : 'Processing…'}</span>
          <span>{state.progress}%</span>
        </div>
        <Progress value={state.progress} className="h-2 bg-white/10" />
      </div>

      <div className="space-y-3">
        {STEPS.map((step, i) => {
          const stepIdx = i
          const isActive = step.key === state.status
          const isDone = currentIdx > stepIdx

          const Icon = isDone ? CheckCircle2 : isActive ? (step.key === 'encrypting' ? Lock : step.key === 'uploading' ? Upload : Loader2) : Loader2

          return (
            <motion.div key={step.key} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="flex items-center gap-3">
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all ${isDone ? 'bg-green-500/20 border-green-500/40 text-green-400' : isActive ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-white/5 border-white/10 text-white/20'}`}>
                <Icon className={`h-3.5 w-3.5 ${isActive && !isDone ? 'animate-spin' : ''}`} />
              </div>
              <span className={`text-sm transition-colors ${isDone ? 'text-green-400' : isActive ? 'text-white' : 'text-white/30'}`}>{step.label}</span>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
