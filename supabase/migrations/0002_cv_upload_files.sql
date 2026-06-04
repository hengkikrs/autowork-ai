create table if not exists public.cv_upload_files (
  id uuid primary key default gen_random_uuid(),
  owner_auth_user_id uuid not null references public.auth_users(id) on delete cascade,
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null,
  data bytea not null,
  created_at timestamptz not null default now()
);

alter table public.cv_upload_files enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cv_upload_files'
      and policyname = 'deny_public_access'
  ) then
    create policy deny_public_access
    on public.cv_upload_files
    for all
    using (false)
    with check (false);
  end if;
end $$;
