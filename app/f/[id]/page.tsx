import { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import { isFileExpired, isDownloadExhausted } from '@/lib/utils'
import { DownloadClient } from '@/components/download/download-client'
import { Navbar } from '@/components/layout/navbar'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createServiceClient()

  const { data: record } = await supabase
    .from('file_records')
    .select('file_name, file_size, created_at')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!record) {
    return { title: 'File Not Found | Secure Share' }
  }

  return {
    title: `${record.file_name} | Secure Share`,
    description: 'Encrypted file shared securely via Secure Share.',
    robots: { index: false, follow: false },
  }
}

export default async function DownloadPage({ params }: PageProps) {
  const { id } = await params

  // Basic UUID validation
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(id)) {
    return <FileNotFound reason="invalid" />
  }

  const supabase = await createServiceClient()
  const { data: record } = await supabase
    .from('file_records')
    .select('id, file_name, file_size, file_type, download_count, max_downloads, expires_at, is_password_protected, iv, salt, created_at')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!record) {
    return <FileNotFound reason="not_found" />
  }

  if (isFileExpired(record.expires_at)) {
    return <FileNotFound reason="expired" />
  }

  if (isDownloadExhausted(record.download_count, record.max_downloads)) {
    return <FileNotFound reason="exhausted" />
  }

  return (
    <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-mesh-gradient" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <Navbar />
      <main className="relative z-10 flex items-center justify-center min-h-screen px-4 pt-16">
        <DownloadClient
          id={record.id}
          fileName={record.file_name}
          fileSize={record.file_size}
          fileType={record.file_type}
          downloadCount={record.download_count}
          maxDownloads={record.max_downloads}
          expiresAt={record.expires_at}
          isPasswordProtected={record.is_password_protected}
          iv={record.iv}
          salt={record.salt}
          createdAt={record.created_at}
        />
      </main>
    </div>
  )
}

function FileNotFound({ reason }: { reason: 'invalid' | 'not_found' | 'expired' | 'exhausted' }) {
  const messages = {
    invalid: { title: 'Invalid link', description: 'This link is malformed or invalid.' },
    not_found: { title: 'File not found', description: 'This file no longer exists or has been deleted.' },
    expired: { title: 'Link expired', description: 'This file has passed its expiration date and has been deleted.' },
    exhausted: { title: 'Download limit reached', description: 'This file has reached its maximum number of downloads.' },
  }

  const { title, description } = messages[reason]

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <Navbar />
      <div className="text-center space-y-4 pt-16">
        <div className="text-6xl">🔒</div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="text-white/50 max-w-sm">{description}</p>
        <a href="/" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm mt-4">
          ← Share a file
        </a>
      </div>
    </div>
  )
}
