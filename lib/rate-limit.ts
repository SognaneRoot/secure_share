import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '3600000') // 1 hour
const MAX_UPLOADS = parseInt(process.env.RATE_LIMIT_MAX_UPLOADS ?? '10')

export async function getClientIp(req: NextRequest): Promise<string> {
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  )
}

export async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const supabase = await createServiceClient()
    const windowStart = new Date(Date.now() - WINDOW_MS).toISOString()

    const { count } = await supabase
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('created_at', windowStart)

    const used = count ?? 0
    const remaining = Math.max(0, MAX_UPLOADS - used)

    if (used >= MAX_UPLOADS) {
      return { allowed: false, remaining: 0 }
    }

    // Record this request
    await supabase.from('rate_limits').insert({ ip, created_at: new Date().toISOString() })

    return { allowed: true, remaining: remaining - 1 }
  } catch {
    // If rate limit check fails, allow the request
    return { allowed: true, remaining: MAX_UPLOADS }
  }
}
