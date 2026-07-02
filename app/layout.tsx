import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/layout/theme-provider'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: {
    default: 'Secure Share — End-to-End Encrypted File Sharing',
    template: '%s | Secure Share',
  },
  description: 'Share files securely with zero-knowledge end-to-end encryption. Your files are encrypted in your browser before upload — we never see your data.',
  keywords: ['secure file sharing', 'encrypted transfer', 'end-to-end encryption', 'private file sharing'],
  authors: [{ name: 'Secure Share' }],
  openGraph: {
    type: 'website',
    title: 'Secure Share — End-to-End Encrypted File Sharing',
    description: 'Share files securely with AES-256-GCM encryption. Zero-knowledge — your key never leaves your browser.',
    siteName: 'Secure Share',
  },
  twitter: { card: 'summary_large_image', title: 'Secure Share', description: 'End-to-end encrypted file sharing' },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
