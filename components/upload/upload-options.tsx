'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, Download, Lock, Eye, EyeOff } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ExpirationOption, DownloadLimit, UploadOptions } from '@/types'

interface UploadOptionsProps {
  options: UploadOptions
  onChange: (options: UploadOptions) => void
  disabled?: boolean
}

export function UploadOptionsPanel({ options, onChange, disabled }: UploadOptionsProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [passwordEnabled, setPasswordEnabled] = useState(false)

  const handlePasswordToggle = (enabled: boolean) => {
    setPasswordEnabled(enabled)
    if (!enabled) {
      onChange({ ...options, password: undefined })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Expiration */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-white/70 text-xs font-medium uppercase tracking-wider">
          <Clock className="h-3.5 w-3.5" />
          Expiration
        </Label>
        <Select
          value={options.expiration}
          onValueChange={(v) => onChange({ ...options, expiration: v as ExpirationOption })}
          disabled={disabled}
        >
          <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-indigo-500">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-white/10 text-white">
            <SelectItem value="1h">1 hour</SelectItem>
            <SelectItem value="24h">24 hours</SelectItem>
            <SelectItem value="7d">7 days</SelectItem>
            <SelectItem value="30d">30 days</SelectItem>
            <SelectItem value="never">Never</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Download limit */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-white/70 text-xs font-medium uppercase tracking-wider">
          <Download className="h-3.5 w-3.5" />
          Max Downloads
        </Label>
        <Select
          value={String(options.maxDownloads)}
          onValueChange={(v) =>
            onChange({
              ...options,
              maxDownloads: (v === 'unlimited' ? 'unlimited' : parseInt(v)) as DownloadLimit,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-indigo-500">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-white/10 text-white">
            <SelectItem value="1">1 download</SelectItem>
            <SelectItem value="5">5 downloads</SelectItem>
            <SelectItem value="10">10 downloads</SelectItem>
            <SelectItem value="unlimited">Unlimited</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Password */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-white/70 text-xs font-medium uppercase tracking-wider">
            <Lock className="h-3.5 w-3.5" />
            Password Protection
          </Label>
          <Switch
            checked={passwordEnabled}
            onCheckedChange={handlePasswordToggle}
            disabled={disabled}
            aria-label="Enable password protection"
          />
        </div>

        {passwordEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="relative"
          >
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter a password…"
              value={options.password ?? ''}
              onChange={(e) => onChange({ ...options, password: e.target.value })}
              disabled={disabled}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pr-10 focus-visible:ring-indigo-500"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
