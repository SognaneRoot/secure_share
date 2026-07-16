import { Navbar } from '@/components/layout/navbar'
import { UploadCard } from '@/components/upload/upload-card'
import { Shield, Zap, Lock, Globe } from 'lucide-react'

const FEATURES = [
  {
    icon: Lock,
    title: 'AES-256-GCM',
    description: 'Military-grade encryption. Files are encrypted in your browser before upload.',
  },
  {
    icon: Shield,
    title: 'Zero Knowledge',
    description: 'The decryption key lives in the URL fragment — our servers never see it.',
  },
  {
    icon: Zap,
    title: 'Instant sharing',
    description: 'Generate a secure link in seconds. No account required.',
  },
  {
    icon: Globe,
    title: 'Self-destructs',
    description: 'Set expiration times and download limits to protect your data.',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-mesh-gradient" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <Navbar />

      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 pt-16">
        {/* Hero */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs text-indigo-300 mb-4">
            <Shield className="h-3 w-3" />
            End-to-end encrypted file sharing
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight">
            Share files with{' '}
            <span className="gradient-text">zero compromise</span>
          </h1>

          <p className="text-lg text-white/50 max-w-xl mx-auto leading-relaxed">
            Your files are encrypted using AES-256-GCM in your browser before upload.
            We never see your content or your keys.
          </p>
        </div>

        {/* Upload card */}
        <div className="w-full max-w-lg">
          <UploadCard />
        </div>

        {/* Feature grid */}
        <div className="mt-20 w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-4">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="rounded-2xl border border-white/5 bg-white/3 backdrop-blur-sm p-5 space-y-3 hover:border-white/10 transition-colors"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 border border-indigo-500/20">
                  <Icon className="h-4 w-4 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{feature.title}</p>
                  <p className="text-xs text-white/40 mt-1 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <footer className="mt-20 pb-8 text-center">
          <p className="text-xs text-white/20">
            © {new Date().getFullYear()} Secure Share · Open source · Zero knowledge
          </p>
        </footer>
      </main>
    </div>
  )
}
