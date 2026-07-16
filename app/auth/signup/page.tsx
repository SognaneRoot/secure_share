'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Shield, Mail, Lock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/hooks/use-toast'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      toast({ title: 'Password too short', description: 'Minimum 8 characters.', variant: 'destructive' })
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    })
    setLoading(false)
    if (error) {
      toast({ title: 'Signup failed', description: error.message, variant: 'destructive' })
    } else {
      setDone(true)
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
              <h1 className="text-xl font-bold text-white">Create account</h1>
              <p className="text-sm text-white/40 mt-1">Track and manage your shared files</p>
            </div>
          </div>

          {done ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-3 py-4">
              <div className="text-4xl">📬</div>
              <p className="text-white font-medium">Check your email</p>
              <p className="text-sm text-white/50">We sent a confirmation link to <strong className="text-white/80">{email}</strong></p>
              <Link href="/auth/login">
                <Button variant="outline" className="mt-4 bg-white/5 border-white/10 text-white hover:bg-white/10">Back to login</Button>
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white/70 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="h-3 w-3" /> Email
                </Label>
                <Input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-indigo-500"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="h-3 w-3" /> Password
                </Label>
                <Input
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-indigo-500"
                  autoComplete="new-password" minLength={8}
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-11 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/25">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create account'}
              </Button>
            </form>
          )}

          {!done && (
            <p className="text-center text-sm text-white/40">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-indigo-400 hover:text-indigo-300">Sign in</Link>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  )
}
