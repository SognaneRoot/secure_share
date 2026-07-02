'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Shield, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/hooks/use-toast'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      toast({ title: 'Login failed', description: error.message, variant: 'destructive' })
    } else {
      router.push(next)
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-mesh-gradient" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-500/10 rounded-full blur-3xl" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-sm">
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl space-y-6">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 border border-indigo-500/30">
              <Shield className="h-6 w-6 text-indigo-400" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-white">Welcome back</h1>
              <p className="text-sm text-white/40 mt-1">Sign in to your account</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="h-3 w-3" /> Email
              </Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" autoComplete="email"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-indigo-500" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="h-3 w-3" /> Password
              </Label>
              <div className="relative">
                <Input type={showPw ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete="current-password"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pr-10 focus-visible:ring-indigo-500" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70" aria-label="Toggle password">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loading}
              className="w-full h-11 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/25">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}
            </Button>
          </form>
          <p className="text-center text-sm text-white/40">
            No account?{' '}
            <Link href="/auth/signup" className="text-indigo-400 hover:text-indigo-300">Create one</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
