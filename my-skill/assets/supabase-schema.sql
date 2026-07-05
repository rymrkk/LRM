-- Lead Relationship Manager Supabase schema.
-- Review before applying to an existing project.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  storage_path text not null,
  original_filename text not null,
  row_count integer not null default 0 check (row_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, storage_path)
);

create table if not exists public.saved_lists (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  filters_json jsonb not null default '{}'::jsonb,
  search_query text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id, name)
);

create table if not exists public.contact_notes (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contact_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  notes text not null default '',
  tags_json jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, contact_id, user_id)
);

create table if not exists public.column_preferences (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  visible_columns_json jsonb not null default '[]'::jsonb,
  column_order_json jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

drop trigger if exists set_workspaces_updated_at on public.workspaces;
create trigger set_workspaces_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

drop trigger if exists set_saved_lists_updated_at on public.saved_lists;
create trigger set_saved_lists_updated_at
before update on public.saved_lists
for each row execute function public.set_updated_at();

drop trigger if exists set_contact_notes_updated_at on public.contact_notes;
create trigger set_contact_notes_updated_at
before update on public.contact_notes
for each row execute function public.set_updated_at();

drop trigger if exists set_column_preferences_updated_at on public.column_preferences;
create trigger set_column_preferences_updated_at
before update on public.column_preferences
for each row execute function public.set_updated_at();

alter table public.workspaces enable row level security;
alter table public.saved_lists enable row level security;
alter table public.contact_notes enable row level security;
alter table public.column_preferences enable row level security;

drop policy if exists "Users manage own workspaces" on public.workspaces;
create policy "Users manage own workspaces"
on public.workspaces
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users manage own saved lists" on public.saved_lists;
create policy "Users manage own saved lists"
on public.saved_lists
for all
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.workspaces
    where workspaces.id = saved_lists.workspace_id
      and workspaces.user_id = auth.uid()
  )
);

drop policy if exists "Users manage own contact notes" on public.contact_notes;
create policy "Users manage own contact notes"
on public.contact_notes
for all
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.workspaces
    where workspaces.id = contact_notes.workspace_id
      and workspaces.user_id = auth.uid()
  )
);

drop policy if exists "Users manage own column preferences" on public.column_preferences;
create policy "Users manage own column preferences"
on public.column_preferences
for all
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.workspaces
    where workspaces.id = column_preferences.workspace_id
      and workspaces.user_id = auth.uid()
  )
);

insert into storage.buckets (id, name, public)
values ('lead-workspaces', 'lead-workspaces', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Users read own workspace files" on storage.objects;
create policy "Users read own workspace files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'lead-workspaces'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "Users insert own workspace files" on storage.objects;
create policy "Users insert own workspace files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'lead-workspaces'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "Users update own workspace files" on storage.objects;
create policy "Users update own workspace files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'lead-workspaces'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'lead-workspaces'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "Users delete own workspace files" on storage.objects;
create policy "Users delete own workspace files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'lead-workspaces'
  and split_part(name, '/', 1) = auth.uid()::text
);
