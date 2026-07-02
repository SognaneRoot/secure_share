import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  search: z.string().optional(),
  sort: z.enum(['created_at', 'file_name', 'file_size', 'download_count']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
})

export async function GET(request: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const parsed = querySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search'),
      sort: searchParams.get('sort'),
      order: searchParams.get('order'),
    })

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
    }

    const { page, limit, search, sort, order } = parsed.data
    const offset = (page - 1) * limit
    const supabase = await createServiceClient()

    let query = supabase
      .from('file_records')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order(sort, { ascending: order === 'asc' })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.ilike('file_name', `%${search}%`)
    }

    const { data: files, error, count } = await query

    if (error) {
      console.error('List files error:', error)
      return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
    }

    return NextResponse.json({ files: files ?? [], total: count ?? 0 })
  } catch (err) {
    console.error('List route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
