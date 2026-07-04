import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '3600000')
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

    const { data, error } = await supabase
      .from('rate_limits')
      .select('id')
      .eq('ip', ip)
      .gte('created_at', windowStart)

    if (error) return { allowed: true, remaining: MAX_UPLOADS }

    const used = data?.length ?? 0
    if (used >= MAX_UPLOADS) return { allowed: false, remaining: 0 }

    await supabase.from('rate_limits').insert({ ip })

    return { allowed: true, remaining: MAX_UPLOADS - used - 1 }
  } catch {
    return { allowed: true, remaining: MAX_UPLOADS }
  }
}