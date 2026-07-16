import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { DashboardClient } from '@/components/dashboard/dashboard-client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard | Secure Share',
  robots: { index: false },
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login?next=/dashboard')

  return (
    <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-mesh-gradient" />
      <Navbar />
      <main className="relative z-10 pt-24 pb-16 px-4 max-w-6xl mx-auto">
        <DashboardClient userEmail={user.email ?? ''} userId={user.id} />
      </main>
    </div>
  )
}
