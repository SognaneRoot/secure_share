import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Cleanup route — optionnel.
 * Le cleanup principal est géré par pg_cron dans Supabase (toutes les heures).
 * Cette route reste disponible pour :
 *   - les appels manuels (debug, admin)
 *   - cron-job.org si vous préférez un cron HTTP externe
 *
 * Sécuriser avec CRON_SECRET dans les variables d'environnement.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = await createServiceClient()

    const { data: deletedCount, error } = await supabase.rpc('cleanup_expired_files')

    if (error) {
      console.error('Cleanup error:', error)
      return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      timestamp: new Date().toISOString(),
      note: 'Automatic cleanup is handled by pg_cron in Supabase every hour.',
    })
  } catch (err) {
    console.error('Cleanup route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
