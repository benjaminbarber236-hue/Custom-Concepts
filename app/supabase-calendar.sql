-- Job Tracker: calendar feed for Apple Calendar (and Google/Outlook).
-- Paste all of this into Supabase → SQL Editor → New query, then Run.

-- One private link per person. The long random token in the link is what keeps it private.
create table if not exists public.calendar_feeds (
  token text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.calendar_feeds enable row level security;
grant select, insert, delete on public.calendar_feeds to authenticated;
revoke all on public.calendar_feeds from anon;

drop policy if exists "own feeds select" on public.calendar_feeds;
drop policy if exists "own feeds insert" on public.calendar_feeds;
drop policy if exists "own feeds delete" on public.calendar_feeds;
create policy "own feeds select" on public.calendar_feeds for select using (auth.uid() = user_id);
create policy "own feeds insert" on public.calendar_feeds for insert with check (auth.uid() = user_id);
create policy "own feeds delete" on public.calendar_feeds for delete using (auth.uid() = user_id);

-- Hands back the jobs, appointments and reminders that belong to a calendar link, and nothing else.
create or replace function public.calendar_feed(p_token text)
returns table (coll text, id text, body jsonb)
language sql stable security definer set search_path = public as $$
  select d.coll, d.id, d.body
  from public.docs d
  join public.calendar_feeds f on f.user_id = d.user_id
  where f.token = p_token
    and length(p_token) >= 32
    and not d.deleted
    and d.coll in ('jobs', 'events', 'tasks');
$$;
revoke all on function public.calendar_feed(text) from public;
grant execute on function public.calendar_feed(text) to anon, authenticated;
