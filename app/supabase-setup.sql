-- Job Tracker database setup. Paste all of this into Supabase → SQL Editor → New query, then tap Run.
-- Each person who signs in only ever sees their own jobs and files.

create table if not exists public.docs (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  coll text not null,
  id text not null,
  body jsonb not null default '{}'::jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, coll, id)
);
create index if not exists docs_user_updated on public.docs (user_id, updated_at);
alter table public.docs enable row level security;
-- Let signed-in people use the table (the policies below still limit them to their own rows).
grant select, insert, update, delete on public.docs to authenticated;
revoke all on public.docs from anon;

drop policy if exists "own docs select" on public.docs;
drop policy if exists "own docs insert" on public.docs;
drop policy if exists "own docs update" on public.docs;
drop policy if exists "own docs delete" on public.docs;
create policy "own docs select" on public.docs for select using (auth.uid() = user_id);
create policy "own docs insert" on public.docs for insert with check (auth.uid() = user_id);
create policy "own docs update" on public.docs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own docs delete" on public.docs for delete using (auth.uid() = user_id);

-- The server stamps every change, so devices can ask "what changed since I last looked?"
create or replace function public.docs_touch() returns trigger language plpgsql as $$
begin new.updated_at := clock_timestamp(); return new; end $$;
drop trigger if exists docs_touch on public.docs;
create trigger docs_touch before insert or update on public.docs for each row execute function public.docs_touch();

-- Live updates between devices.
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; end $$;

-- Private storage for photos and PDFs, one folder per person.
insert into storage.buckets (id, name, public) values ('files', 'files', false) on conflict (id) do nothing;
drop policy if exists "own files read" on storage.objects;
drop policy if exists "own files add" on storage.objects;
drop policy if exists "own files change" on storage.objects;
drop policy if exists "own files delete" on storage.objects;
create policy "own files read" on storage.objects for select using (bucket_id = 'files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own files add" on storage.objects for insert with check (bucket_id = 'files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own files change" on storage.objects for update using (bucket_id = 'files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own files delete" on storage.objects for delete using (bucket_id = 'files' and (storage.foldername(name))[1] = auth.uid()::text);
