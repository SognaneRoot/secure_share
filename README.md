# 🔒 Secure Share

**End-to-end encrypted file sharing — AES-256-GCM, zero-knowledge, open-source.**

Un clone moderne de WeTransfer où chaque fichier est chiffré dans le navigateur avant l'upload. La clé de déchiffrement ne touche jamais le serveur — elle vit exclusivement dans le fragment `#` de l'URL.

---

## ✨ Fonctionnalités

- **AES-256-GCM** — chiffrement client-side avant upload
- **Zero-knowledge** — la clé est dans le `#fragment`, le serveur ne la voit jamais
- **PBKDF2** — protection par mot de passe, 100 000 itérations SHA-256
- **Compression gzip** — avant chiffrement
- **QR Code** — généré pour chaque lien de partage
- **Expiration** — 1h, 24h, 7d, 30d, ou jamais
- **Limite de téléchargements** — 1, 5, 10, ou illimité
- **Cleanup automatique** — pg_cron Supabase, toutes les heures, gratuit
- **Dashboard** — historique, stats, recherche, tri, suppression
- **Auth Supabase** — email/password, compte optionnel
- **Rate limiting** — par IP
- **Dark mode** — par défaut
- **Responsive** — mobile-first

---

## 🏗 Stack

| Couche      | Technologie                        |
|-------------|------------------------------------|
| Framework   | Next.js 15 App Router              |
| Langage     | TypeScript strict                  |
| UI          | TailwindCSS + shadcn/ui            |
| Animation   | Framer Motion                      |
| Crypto      | Web Crypto API (AES-256-GCM)       |
| Base de données | Supabase PostgreSQL            |
| Stockage    | Supabase Storage                   |
| Auth        | Supabase Auth                      |
| Cron        | Supabase pg_cron (gratuit)         |
| Déploiement | Vercel (Hobby plan suffisant)      |

---

## 🚀 Installation

### 1. Cloner & installer

```bash
git clone https://github.com/your-org/secure-share.git
cd secure-share
npm install
```

### 2. Configurer Supabase

#### A. Créer le projet
1. Aller sur [supabase.com](https://supabase.com) → **New project**
2. Choisir un nom, une région, un mot de passe de base de données

#### B. Récupérer les clés
1. **Settings → API**
2. Copier :
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (commence par `eyJ...`)
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (commence par `eyJ...`)

> ⚠️ Les clés Supabase sont des JWT et commencent toujours par `eyJ`. Si ce n'est pas le cas, vous êtes sur la mauvaise page.

#### C. Exécuter la migration SQL
1. **SQL Editor → New query**
2. Copier-coller le contenu de `supabase/migrations/001_initial_schema.sql`
3. Cliquer **Run**

Ceci crée automatiquement :
- Les tables (`file_records`, `rate_limits`, `download_events`)
- Les indexes
- Les policies RLS
- Le bucket Storage `encrypted-files`
- Le job pg_cron (cleanup toutes les heures)

#### D. Vérifier le bucket Storage
1. **Storage** → vérifier que `encrypted-files` existe
2. Il doit être **privé** (non public)

#### E. Vérifier pg_cron
Dans SQL Editor :
```sql
select * from cron.job;
```
Vous devez voir `secure-share-cleanup` dans la liste.

---

### 3. Variables d'environnement

```bash
cp .env.example .env.local
```

Éditer `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_APP_URL=http://localhost:3000
MAX_FILE_SIZE_MB=500
RATE_LIMIT_MAX_UPLOADS=10
RATE_LIMIT_WINDOW_MS=3600000
```

### 4. Lancer en local

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

---

## 🌐 Déploiement Vercel (Hobby = gratuit)

### 1. Pousser sur GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Importer dans Vercel

1. Aller sur [vercel.com/new](https://vercel.com/new)
2. Importer le repo GitHub
3. Ajouter les variables d'environnement (toutes celles du `.env.example`)
4. Changer `NEXT_PUBLIC_APP_URL` vers votre domaine Vercel : `https://votre-projet.vercel.app`
5. **Deploy**

> ✅ **Pas besoin de Vercel Pro.** Le cleanup automatique est géré par **pg_cron** dans Supabase, pas par Vercel Cron.

### 3. Après déploiement

Mettre à jour `NEXT_PUBLIC_APP_URL` avec l'URL Vercel finale et redéployer (1 clic).

---

## ⏰ Cleanup automatique — pg_cron (Supabase)

Le cleanup s'exécute **toutes les heures** directement dans Supabase via `pg_cron`, sans aucun coût supplémentaire ni dépendance externe.

```sql
-- Vérifier que le job tourne
select jobname, schedule, command, active from cron.job;

-- Voir l'historique des exécutions
select * from cron.job_run_details order by start_time desc limit 10;

-- Désactiver si besoin
select cron.unschedule('secure-share-cleanup');

-- Réactiver
select cron.schedule(
  'secure-share-cleanup',
  '0 * * * *',
  $$ select public.cleanup_expired_files(); $$
);
```

La route `/api/cleanup` reste disponible pour les appels manuels ou un cron externe (cron-job.org), mais elle n'est plus nécessaire pour le fonctionnement normal.

---

## 🔐 Architecture de sécurité

```
Navigateur                        Serveur (Supabase + Vercel)
──────────                        ───────────────────────────
Fichier sélectionné
  → compression gzip
  → chiffrement AES-256-GCM   →  reçoit uniquement le blob chiffré
  → upload blob + métadonnées →  stocke dans Supabase Storage
                               →  stocke IV, salt, métadonnées en base
  ← shareId retourné          ←

URL générée côté client :
  https://app.com/f/{shareId}#{CLE_AES_BASE64URL}
                              ^^^^^^^^^^^^^^^^^^^
                              JAMAIS envoyée au serveur
                              (le fragment # n'est pas inclus dans les requêtes HTTP)
```

**Propriétés clés :**
- Le fragment `#` n'est jamais transmis dans les requêtes HTTP (spec navigateur)
- Clé AES : 256 bits, générée aléatoirement par fichier
- IV : 96 bits, unique par chiffrement, stocké en base
- Mot de passe : PBKDF2 / 100 000 itérations / SHA-256
- Salt : 128 bits aléatoire, stocké en base pour la dérivation PBKDF2

---

## 📁 Structure du projet

```
secure-share/
├── app/
│   ├── api/
│   │   ├── upload/route.ts       # POST — chiffrement metadata + stockage
│   │   ├── download/route.ts     # GET  — URL signée + compteur
│   │   ├── delete/route.ts       # DELETE — soft delete + storage
│   │   ├── list/route.ts         # GET  — liste paginée dashboard
│   │   ├── stats/route.ts        # GET  — stats agrégées
│   │   └── cleanup/route.ts      # GET  — nettoyage manuel (pg_cron fait le reste)
│   ├── auth/
│   │   ├── login/                # Page de connexion
│   │   └── signup/               # Page d'inscription
│   ├── dashboard/                # Dashboard protégé
│   ├── f/[id]/                   # Page de téléchargement
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── dashboard/                # UI dashboard
│   ├── download/                 # Client déchiffrement
│   ├── layout/                   # Navbar, ThemeProvider
│   ├── ui/                       # Composants shadcn/ui
│   └── upload/                   # Dropzone, options, progress, résultat
├── hooks/
│   ├── use-copy.ts
│   ├── use-toast.ts
│   └── use-upload.ts             # State machine upload
├── lib/
│   ├── crypto.ts                 # AES-256-GCM, PBKDF2, gzip
│   ├── rate-limit.ts
│   ├── supabase/
│   │   ├── client.ts             # Client navigateur
│   │   └── server.ts             # Client serveur + service role
│   ├── utils.ts
│   └── validations.ts
├── supabase/migrations/
│   └── 001_initial_schema.sql    # Schéma complet + pg_cron
├── types/index.ts
├── middleware.ts                 # Auth guard + session refresh
├── .env.example
├── next.config.ts
├── tailwind.config.ts
└── vercel.json                   # Pas de cron Vercel — pg_cron utilisé
```

---

## 📋 Variables d'environnement

| Variable | Obligatoire | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Clé anon publique (commence par `eyJ`) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Clé service role — **ne jamais exposer côté client** |
| `NEXT_PUBLIC_APP_URL` | ✅ | URL complète de l'app (sans slash final) |
| `MAX_FILE_SIZE_MB` | ❌ | Taille max en MB (défaut : 500) |
| `RATE_LIMIT_MAX_UPLOADS` | ❌ | Max uploads par IP par fenêtre (défaut : 10) |
| `RATE_LIMIT_WINDOW_MS` | ❌ | Fenêtre rate limit en ms (défaut : 3600000) |
| `CRON_SECRET` | ❌ | Token pour sécuriser `/api/cleanup` si appelé en HTTP |

---

## 🧪 Commandes

```bash
npm run dev          # Développement local
npm run build        # Build de production
npm run start        # Démarrer en production
npm run lint         # Vérification ESLint
npm run type-check   # Vérification TypeScript
```

---

## 📄 Licence

MIT — libre d'utilisation et de contribution.
