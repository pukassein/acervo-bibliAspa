-- Supabase keep-alive heartbeat
-- Run this once in the Supabase SQL Editor.
-- It writes one private row per UTC day, without exposing anything to the app.

create table if not exists public.supabase_heartbeats (
    heartbeat_day date primary key,
    heartbeat_at timestamptz not null default now()
);

alter table public.supabase_heartbeats enable row level security;

-- The table intentionally has no public policies. The scheduled database
-- function below runs as its owner and is the only intended writer.
revoke all on table public.supabase_heartbeats from anon, authenticated;

create or replace function public.record_supabase_heartbeat()
returns void
language sql
security definer
set search_path = public
as $$
    insert into public.supabase_heartbeats (heartbeat_day, heartbeat_at)
    values (current_date, now())
    on conflict (heartbeat_day)
    do update set heartbeat_at = excluded.heartbeat_at;
$$;

revoke all on function public.record_supabase_heartbeat() from public, anon, authenticated;

-- pg_cron is available in Supabase projects via Database > Extensions.
create extension if not exists pg_cron with schema extensions;

-- Run at 03:00 UTC every day. The guard makes this script safe to re-run.
do $$
begin
    if not exists (
        select 1 from cron.job where jobname = 'supabase-daily-heartbeat'
    ) then
        perform cron.schedule(
            'supabase-daily-heartbeat',
            '0 3 * * *',
            'select public.record_supabase_heartbeat();'
        );
    end if;
end
$$;

comment on table public.supabase_heartbeats is
    'Internal daily Supabase activity heartbeat; not application data.';
