create extension if not exists pgcrypto;

create table if not exists public.auth_users (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text unique not null,
  "emailVerified" timestamptz,
  image text
);

create table if not exists public.auth_accounts (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references public.auth_users(id) on delete cascade,
  provider text not null,
  type text not null,
  "providerAccountId" text not null,
  access_token text,
  expires_at integer,
  refresh_token text,
  id_token text,
  scope text,
  session_state text,
  token_type text,
  password text,
  unique (provider, "providerAccountId")
);

create table if not exists public.auth_sessions (
  id uuid primary key default gen_random_uuid(),
  "sessionToken" text unique not null,
  "userId" uuid not null references public.auth_users(id) on delete cascade,
  expires timestamptz not null
);

create table if not exists public.auth_verification_token (
  identifier text not null,
  expires timestamptz not null,
  token text not null,
  primary key (identifier, token)
);

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  created_at timestamptz not null default now()
);

create table if not exists public.cvs (
  id bigserial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  file_url text not null,
  raw_text text,
  parsed_json jsonb not null default '{}'::jsonb,
  audit_result jsonb not null default '{}'::jsonb,
  is_master boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id bigserial primary key,
  title text not null,
  company text not null,
  location text,
  salary text,
  job_type text,
  source text,
  job_url text unique not null,
  description text,
  requirements jsonb not null default '[]'::jsonb,
  responsibilities jsonb not null default '[]'::jsonb,
  hard_skills jsonb not null default '[]'::jsonb,
  soft_skills jsonb not null default '[]'::jsonb,
  tools jsonb not null default '[]'::jsonb,
  education_requirement text,
  experience_requirement text,
  deadline text,
  created_at timestamptz not null default now()
);

create table if not exists public.job_preferences (
  id bigserial primary key,
  user_id uuid not null unique references public.users(id) on delete cascade,
  target_roles jsonb not null default '[]'::jsonb,
  locations jsonb not null default '[]'::jsonb,
  job_type jsonb not null default '[]'::jsonb,
  min_salary numeric,
  remote_preference text,
  preferred_industries jsonb not null default '[]'::jsonb,
  blacklisted_companies jsonb not null default '[]'::jsonb,
  daily_apply_limit integer not null default 5,
  updated_at timestamptz not null default now()
);

create table if not exists public.match_results (
  id bigserial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  cv_id bigint not null references public.cvs(id) on delete cascade,
  job_id bigint not null references public.jobs(id) on delete cascade,
  match_score integer not null default 0,
  decision text not null default 'REVIEW',
  reason text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, cv_id, job_id)
);

create table if not exists public.applications (
  id bigserial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  job_id bigint not null references public.jobs(id) on delete cascade,
  cv_id bigint not null references public.cvs(id) on delete cascade,
  status text not null default 'MATCHED',
  match_score integer not null default 0,
  match_details jsonb not null default '{}'::jsonb,
  notes text,
  tailored_cv_url text,
  cover_letter_url text,
  created_at timestamptz not null default now(),
  unique (user_id, job_id, cv_id)
);

create table if not exists public.cv_versions (
  id bigserial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  cv_id bigint not null references public.cvs(id) on delete cascade,
  job_id bigint references public.jobs(id) on delete set null,
  version_type text not null,
  title text not null,
  content_json jsonb not null default '{}'::jsonb,
  file_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.cover_letters (
  id bigserial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  cv_id bigint not null references public.cvs(id) on delete cascade,
  job_id bigint not null references public.jobs(id) on delete cascade,
  content text not null,
  file_url text,
  created_at timestamptz not null default now(),
  unique (user_id, cv_id, job_id)
);

create table if not exists public.activity_logs (
  id bigserial primary key,
  user_id uuid references public.users(id) on delete cascade,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.auth_users enable row level security;
alter table public.auth_accounts enable row level security;
alter table public.auth_sessions enable row level security;
alter table public.auth_verification_token enable row level security;
alter table public.users enable row level security;
alter table public.cvs enable row level security;
alter table public.jobs enable row level security;
alter table public.job_preferences enable row level security;
alter table public.match_results enable row level security;
alter table public.applications enable row level security;
alter table public.cv_versions enable row level security;
alter table public.cover_letters enable row level security;
alter table public.activity_logs enable row level security;

create index if not exists idx_cvs_user_id on public.cvs(user_id);
create index if not exists idx_jobs_created_at on public.jobs(created_at desc);
create index if not exists idx_match_results_user_id on public.match_results(user_id);
create index if not exists idx_applications_user_id on public.applications(user_id);
create index if not exists idx_activity_logs_user_id on public.activity_logs(user_id);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'auth_users',
    'auth_accounts',
    'auth_sessions',
    'auth_verification_token',
    'users',
    'cvs',
    'jobs',
    'job_preferences',
    'match_results',
    'applications',
    'cv_versions',
    'cover_letters',
    'activity_logs'
  ]
  loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = table_name
        and policyname = 'deny_public_access'
    ) then
      execute format(
        'create policy deny_public_access on public.%I for all using (false) with check (false)',
        table_name
      );
    end if;
  end loop;
end $$;
