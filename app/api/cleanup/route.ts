import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Invoked by Vercel Cron or manually
export async function GET(request: NextRequest) {
  // Verify cron secret if running on Vercel
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = await createServiceClient()

    // Run cleanup function
    const { data: deletedCount, error } = await supabase.rpc('cleanup_expired_files')

    if (error) {
      console.error('Cleanup error:', error)
      return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
    }

    // Also clean up rate_limits older than 2 hours
    await supabase
      .from('rate_limits')
      .delete()
      .lt('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())

    console.log(`Cleanup completed: ${deletedCount} files marked for deletion`)

    return NextResponse.json({
      success: true,
      deletedCount,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cleanup route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
