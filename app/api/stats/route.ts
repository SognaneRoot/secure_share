import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServiceClient()

    const { data, error } = await supabase.rpc('get_user_stats', {
      p_user_id: user.id,
    })

    if (error) {
      console.error('Stats error:', error)
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Stats route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
