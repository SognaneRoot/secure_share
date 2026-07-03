-- ============================================================
-- Secure Share — Complete Supabase Schema
-- Run this in the Supabase SQL editor
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron"; -- for cleanup (optional, requires pg_cron)

-- ─── Tables ──────────────────────────────────────────────────

-- File records table
create table if not exists public.file_records (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references auth.users(id) on delete set null,
  file_name       text not null check (char_length(file_name) between 1 and 255),
  file_size       bigint not null check (file_size > 0),
  file_type       text not null check (char_length(file_type) between 1 and 100),
  storage_path    text not null,
  download_count  integer not null default 0 check (download_count >= 0),
  max_downloads   integer check (max_downloads > 0),
  expires_at      timestamptz,
  is_password_protected boolean not null default false,
  salt            text,       -- hex-encoded PBKDF2 salt (null if no password)
  iv              text not null, -- hex-encoded AES-GCM IV
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Rate limiting table
create table if not exists public.rate_limits (
  id         bigserial primary key,
  ip         text not null,
  created_at timestamptz not null default now()
);

-- Download events (for stats / audit)
create table if not exists public.download_events (
  id         bigserial primary key,
  file_id    uuid references public.file_records(id) on delete cascade,
  ip         text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- ─── Indexes ─────────────────────────────────────────────────

create index if not exists idx_file_records_user_id     on public.file_records(user_id);
create index if not exists idx_file_records_expires_at  on public.file_records(expires_at) where deleted_at is null;
create index if not exists idx_file_records_created_at  on public.file_records(created_at desc);
create index if not exists idx_file_records_deleted_at  on public.file_records(deleted_at) where deleted_at is not null;
create index if not exists idx_rate_limits_ip_created   on public.rate_limits(ip, created_at desc);
create index if not exists idx_download_events_file_id  on public.download_events(file_id, created_at desc);

-- ─── updated_at trigger ──────────────────────────────────────

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger file_records_updated_at
  before update on public.file_records
  for each row execute function public.handle_updated_at();

-- ─── Download counter function ────────────────────────────────

create or replace function public.increment_download_count(record_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.file_records
  set download_count = download_count + 1
  where id = record_id
    and deleted_at is null;
end;
$$;

-- ─── Cleanup function (expired + exhausted files) ─────────────

create or replace function public.cleanup_expired_files()
returns integer language plpgsql security definer as $$
declare
  deleted_count integer;
begin
  -- Soft-delete expired files
  update public.file_records
  set deleted_at = now()
  where deleted_at is null
    and (
      (expires_at is not null and expires_at < now())
      or
      (max_downloads is not null and download_count >= max_downloads)
    );

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- ─── Statistics function ──────────────────────────────────────

create or replace function public.get_user_stats(p_user_id uuid)
returns json language plpgsql security definer as $$
declare
  result json;
begin
  select json_build_object(
    'totalFiles',     count(*),
    'totalSize',      coalesce(sum(file_size), 0),
    'totalDownloads', coalesce(sum(download_count), 0),
    'activeFiles',    count(*) filter (
                        where deleted_at is null
                          and (expires_at is null or expires_at > now())
                          and (max_downloads is null or download_count < max_downloads)
                      )
  )
  into result
  from public.file_records
  where user_id = p_user_id;

  return result;
end;
$$;

-- ─── Row Level Security ───────────────────────────────────────

alter table public.file_records enable row level security;
alter table public.download_events enable row level security;
alter table public.rate_limits enable row level security;

-- file_records policies
create policy "Anyone can read non-deleted records"
  on public.file_records for select
  using (deleted_at is null);

create policy "Authenticated users can insert their own records"
  on public.file_records for insert
  with check (auth.uid() = user_id or user_id is null);

create policy "Owners can update their own records"
  on public.file_records for update
  using (auth.uid() = user_id);

create policy "Owners can delete their own records"
  on public.file_records for delete
  using (auth.uid() = user_id);

-- Service role can do anything (for API routes using service key)
create policy "Service role full access on file_records"
  on public.file_records for all
  using (true)
  with check (true);

-- download_events policies
create policy "Service role full access on download_events"
  on public.download_events for all
  using (true)
  with check (true);

-- rate_limits policies
create policy "Service role full access on rate_limits"
  on public.rate_limits for all
  using (true)
  with check (true);

-- ─── Storage Bucket ──────────────────────────────────────────

-- Run in Supabase dashboard → Storage → Create bucket "encrypted-files"
-- Or via SQL with the storage API:

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'encrypted-files',
  'encrypted-files',
  false, -- private bucket
  524288000, -- 500 MB
  array['application/octet-stream']
)
on conflict (id) do nothing;

-- Storage policies
create policy "Service role can manage storage"
  on storage.objects for all
  using (bucket_id = 'encrypted-files')
  with check (bucket_id = 'encrypted-files');

-- ─── pg_cron : cleanup automatique toutes les heures ─────────
select cron.schedule(
  'secure-share-cleanup',
  '0 * * * *',
  $$ select public.cleanup_expired_files(); $$
);