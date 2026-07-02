# 🔒 Secure Share

**End-to-end encrypted file sharing — AES-256-GCM, zero-knowledge, open-source.**

A modern clone of WeTransfer where every file is encrypted in the browser before upload. The decryption key never reaches the server — it lives exclusively in the URL fragment (`#`).

---

## ✨ Features

- **AES-256-GCM encryption** — files encrypted client-side before upload
- **Zero-knowledge** — key lives in URL `#fragment`, server never sees it
- **PBKDF2 password protection** — 100,000 iterations, SHA-256
- **gzip compression** — before encryption
- **QR code** generation for share links
- **Expiration options** — 1h, 24h, 7d, 30d, or never
- **Download limits** — 1, 5, 10, or unlimited
- **Dashboard** — manage files, stats, search, sort, delete
- **Supabase Auth** — email/password, optional account
- **Rate limiting** — per-IP upload throttling
- **Dark mode** — default, with system preference support
- **Fully responsive** — mobile-first

---

## 🏗 Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Framework   | Next.js 15 App Router             |
| Language    | TypeScript (strict)               |
| Styling     | TailwindCSS + shadcn/ui           |
| Animation   | Framer Motion                     |
| Crypto      | Web Crypto API (AES-256-GCM)      |
| Database    | Supabase PostgreSQL               |
| Storage     | Supabase Storage                  |
| Auth        | Supabase Auth                     |
| Deployment  | Vercel                            |

---

## 🚀 Quick Start

### 1. Clone & install

```bash
git clone https://github.com/your-org/secure-share.git
cd secure-share
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `supabase/migrations/001_initial_schema.sql`
3. Go to **Storage** → verify the `encrypted-files` bucket was created (private)
4. Copy your project URL and keys

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
MAX_FILE_SIZE_MB=500
RATE_LIMIT_MAX_UPLOADS=10
RATE_LIMIT_WINDOW_MS=3600000
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🌐 Deploy to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Import in Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your repository
3. Add all environment variables from `.env.example`
4. Set `NEXT_PUBLIC_APP_URL` to your Vercel domain
5. Deploy

### 3. Configure Vercel Cron (optional)

The `vercel.json` includes a cron job at `/api/cleanup` (every hour). To secure it:

```env
CRON_SECRET=your-random-secret
```

Then in Vercel dashboard → Project → Settings → Cron Jobs, add `Authorization: Bearer your-random-secret`.

---

## 🗄 Supabase Setup Details

### Tables created by migration

| Table            | Purpose                              |
|------------------|--------------------------------------|
| `file_records`   | Metadata for each uploaded file      |
| `rate_limits`    | Per-IP rate limiting store           |
| `download_events`| Audit log of download activity       |

### Storage bucket

- Name: `encrypted-files`
- Visibility: **Private** (signed URLs, 60s expiry)
- Max file size: 500 MB
- Accepted MIME: `application/octet-stream` (encrypted blobs)

### RLS Policies

- Anyone can read non-deleted records (to serve download pages)
- Only authenticated owners can update/delete their records
- Service role has full access (used by API routes with `SUPABASE_SERVICE_ROLE_KEY`)

---

## 🔐 Security Architecture

```
Browser                          Server
──────                           ──────
File selected
  → gzip compress
  → AES-256-GCM encrypt         ← encrypted blob only
  → upload blob + metadata  →   → stores in Supabase Storage
                                → stores IV, salt, metadata in DB
  ← shareId returned        ←
  
Build URL:
  https://app.com/f/{shareId}#{AES_KEY_BASE64URL}
                               ^^^^ NEVER sent to server ^^^^
```

**Key properties:**
- The `#fragment` is not sent in HTTP requests (browser spec)
- AES key is 256-bit, randomly generated per file
- IV (96-bit) is unique per encryption, stored server-side
- Password-derived keys use PBKDF2 / 100,000 iterations / SHA-256
- Salt (128-bit random) stored server-side for PBKDF2 reproduction

---

## 📁 Project Structure

```
secure-share/
├── app/
│   ├── api/
│   │   ├── upload/route.ts      # POST: encrypt metadata + store file
│   │   ├── download/route.ts    # GET: signed URL + increment counter
│   │   ├── delete/route.ts      # DELETE: soft delete + storage removal
│   │   ├── list/route.ts        # GET: paginated file list for dashboard
│   │   ├── stats/route.ts       # GET: aggregate stats
│   │   └── cleanup/route.ts     # GET/POST: expire stale files (cron)
│   ├── auth/
│   │   ├── login/               # Login page
│   │   └── signup/              # Signup page
│   ├── dashboard/               # Protected dashboard
│   ├── f/[id]/                  # Download page (server + client)
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── dashboard/               # Dashboard UI
│   ├── download/                # Download + decrypt client
│   ├── layout/                  # Navbar, theme provider
│   ├── ui/                      # shadcn/ui components
│   └── upload/                  # Dropzone, options, progress, result
├── hooks/
│   ├── use-copy.ts
│   ├── use-toast.ts
│   └── use-upload.ts            # Upload state machine
├── lib/
│   ├── crypto.ts                # AES-256-GCM, PBKDF2, gzip
│   ├── rate-limit.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── utils.ts
│   └── validations.ts
├── supabase/migrations/
│   └── 001_initial_schema.sql
├── types/index.ts
├── middleware.ts
├── .env.example
├── next.config.ts
├── tailwind.config.ts
└── vercel.json
```

---

## 🧪 Local Testing

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build

# Start production server
npm start
```

---

## 📋 Environment Variables Reference

| Variable                     | Required | Description                              |
|------------------------------|----------|------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`   | ✅       | Supabase project URL                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅    | Supabase anon public key                 |
| `SUPABASE_SERVICE_ROLE_KEY`  | ✅       | Supabase service role (server-side only) |
| `NEXT_PUBLIC_APP_URL`        | ✅       | Full URL of your app (no trailing slash) |
| `MAX_FILE_SIZE_MB`           | ❌       | Max upload size in MB (default: 500)     |
| `RATE_LIMIT_MAX_UPLOADS`     | ❌       | Max uploads per IP per window (default: 10) |
| `RATE_LIMIT_WINDOW_MS`       | ❌       | Rate limit window ms (default: 3600000)  |
| `CRON_SECRET`                | ❌       | Bearer token to protect /api/cleanup     |

---

## 📄 License

MIT — use freely, contribute back.
