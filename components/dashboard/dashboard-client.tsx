'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Trash2, ExternalLink, Copy, Check, LogOut, Download,
  FileText, HardDrive, BarChart2, Shield, SortAsc, SortDesc, RefreshCw, Plus
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/hooks/use-toast'
import { useCopy } from '@/hooks/use-copy'
import { formatBytes, formatRelativeTime, isFileExpired, isDownloadExhausted } from '@/lib/utils'
import type { FileRecord, StatsResponse } from '@/types'

type SortField = 'created_at' | 'file_name' | 'file_size' | 'download_count'
type SortOrder = 'asc' | 'desc'

interface DashboardClientProps {
  userEmail: string
  userId: string
}

export function DashboardClient({ userEmail, userId }: DashboardClientProps) {
  const router = useRouter()
  const { copied, copy } = useCopy()

  const [files, setFiles] = useState<FileRecord[]>([])
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortField>('created_at')
  const [order, setOrder] = useState<SortOrder>('desc')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const PER_PAGE = 20

  const fetchFiles = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page), limit: String(PER_PAGE),
        sort, order, ...(search ? { search } : {}),
      })
      const [filesRes, statsRes] = await Promise.all([
        fetch(`/api/list?${params}`),
        fetch('/api/stats'),
      ])

      if (filesRes.ok) {
        const data = await filesRes.json()
        setFiles(data.files ?? [])
        setTotal(data.total ?? 0)
      }
      if (statsRes.ok) setStats(await statsRes.json())
    } catch {
      toast({ title: 'Failed to load files', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [page, sort, order, search])

  useEffect(() => { fetchFiles() }, [fetchFiles])

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchFiles() }, 400)
    return () => clearTimeout(t)
  }, [search]) // eslint-disable-line

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setDeleting(id)
    try {
      const res = await fetch('/api/delete', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== id))
        setTotal((t) => t - 1)
        toast({ title: 'File deleted' })
      } else {
        const data = await res.json()
        toast({ title: 'Delete failed', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' })
    } finally {
      setDeleting(null)
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const toggleSort = (field: SortField) => {
    if (sort === field) setOrder(order === 'asc' ? 'desc' : 'asc')
    else { setSort(field); setOrder('desc') }
  }

  const getShareUrl = (id: string) => `${window.location.origin}/f/${id}`

  const getFileStatus = (file: FileRecord) => {
    if (isFileExpired(file.expires_at)) return 'expired'
    if (isDownloadExhausted(file.download_count, file.max_downloads)) return 'exhausted'
    return 'active'
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-white/40 mt-1">{userEmail}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/">
            <Button className="bg-indigo-500 hover:bg-indigo-600 text-white gap-2 rounded-xl">
              <Plus className="h-4 w-4" /> New upload
            </Button>
          </Link>
          <Button onClick={handleSignOut} variant="ghost" className="text-white/50 hover:text-white hover:bg-white/10 gap-2 rounded-xl">
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: FileText, label: 'Total files', value: stats.totalFiles },
            { icon: HardDrive, label: 'Total size', value: formatBytes(stats.totalSize) },
            { icon: Download, label: 'Total downloads', value: stats.totalDownloads },
            { icon: Shield, label: 'Active files', value: stats.activeFiles },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="h-4 w-4 text-indigo-400" />
                <span className="text-xs text-white/40 uppercase tracking-wider">{label}</span>
              </div>
              <p className="text-2xl font-bold text-white">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search + sort bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files…"
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus-visible:ring-indigo-500"
          />
        </div>
        <div className="flex gap-2">
          {(['file_name', 'file_size', 'created_at', 'download_count'] as SortField[]).map((field) => (
            <Button
              key={field}
              onClick={() => toggleSort(field)}
              variant="ghost"
              size="sm"
              className={`rounded-lg text-xs gap-1 ${sort === field ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-white/5 text-white/50 hover:text-white border border-white/10'}`}
            >
              {field === 'file_name' ? 'Name' : field === 'file_size' ? 'Size' : field === 'created_at' ? 'Date' : 'DLs'}
              {sort === field && (order === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />)}
            </Button>
          ))}
          <Button onClick={fetchFiles} variant="ghost" size="icon" className="bg-white/5 border border-white/10 text-white/50 hover:text-white rounded-lg">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Files list */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-white/30" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <div className="text-4xl">📂</div>
            <p className="text-white/50">{search ? 'No files match your search' : 'No files yet'}</p>
            {!search && (
              <Link href="/">
                <Button className="bg-indigo-500 hover:bg-indigo-600 text-white gap-2 rounded-xl mt-2">
                  <Plus className="h-4 w-4" /> Upload your first file
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div className="hidden md:grid grid-cols-[1fr_80px_100px_80px_120px] gap-4 px-6 py-3 border-b border-white/5 text-xs text-white/30 uppercase tracking-wider">
              <span>File</span><span>Size</span><span>Downloads</span><span>Status</span><span className="text-right">Actions</span>
            </div>

            <AnimatePresence>
              {files.map((file, i) => {
                const status = getFileStatus(file)
                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.03 }}
                    className="grid md:grid-cols-[1fr_80px_100px_80px_120px] gap-4 items-center px-6 py-4 border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors group"
                  >
                    {/* Name */}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{file.file_name}</p>
                      <p className="text-xs text-white/30 mt-0.5">{formatRelativeTime(file.expires_at)}</p>
                    </div>

                    {/* Size */}
                    <span className="hidden md:block text-sm text-white/50">{formatBytes(file.file_size)}</span>

                    {/* Downloads */}
                    <span className="hidden md:block text-sm text-white/50">
                      {file.download_count}{file.max_downloads ? `/${file.max_downloads}` : ''}
                    </span>

                    {/* Status */}
                    <div className="hidden md:block">
                      <Badge
                        variant={status === 'active' ? 'default' : 'secondary'}
                        className={
                          status === 'active' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                          status === 'expired' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                          'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                        }
                      >
                        {status}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        onClick={() => copy(getShareUrl(file.id))}
                        variant="ghost" size="icon"
                        className="h-8 w-8 rounded-lg text-white/40 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all"
                        title="Copy link"
                      >
                        {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                      <a href={getShareUrl(file.id)} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-white/40 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all" title="Open">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                      <Button
                        onClick={() => handleDelete(file.id, file.file_name)}
                        disabled={deleting === file.id}
                        variant="ghost" size="icon"
                        className="h-8 w-8 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > PER_PAGE && (
        <div className="flex items-center justify-between text-sm text-white/40">
          <span>{total} files total</span>
          <div className="flex gap-2">
            <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} variant="ghost" size="sm" className="bg-white/5 border border-white/10 text-white/50 hover:text-white rounded-lg">Previous</Button>
            <span className="flex items-center px-3">Page {page} of {Math.ceil(total / PER_PAGE)}</span>
            <Button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / PER_PAGE)} variant="ghost" size="sm" className="bg-white/5 border border-white/10 text-white/50 hover:text-white rounded-lg">Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}
