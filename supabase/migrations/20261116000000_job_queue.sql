-- M0: background job queue.
--
-- Infrastructure table, not tenant data. It is reached only by the worker over
-- a direct Postgres connection (table owner). RLS is enabled with no policies
-- and all API-role privileges are revoked, so it is invisible to anon and
-- authenticated clients through the Supabase API.
--
-- Plain Postgres only (no pg_cron, no vendor extensions), so the queue moves
-- with the database to any host.

create table public.job (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null,
  payload       jsonb not null default '{}'::jsonb,
  status        text not null default 'queued'
                check (status in ('queued', 'running', 'succeeded', 'dead')),
  run_at        timestamptz not null default now(),
  attempts      integer not null default 0 check (attempts >= 0),
  max_attempts  integer not null default 5 check (max_attempts > 0),
  dedupe_key    text,
  locked_at     timestamptz,
  locked_by     text,
  last_error    text,
  created_at    timestamptz not null default now(),
  finished_at   timestamptz
);

comment on table public.job is
  'Background job queue. status: queued -> running -> succeeded | queued (retry) | dead.';

-- A dedupe key makes enqueueing idempotent (e.g. one heartbeat per time slot).
create unique index job_dedupe_key_uq on public.job (dedupe_key) where dedupe_key is not null;
create index job_due_idx on public.job (run_at) where status = 'queued';
create index job_running_idx on public.job (locked_at) where status = 'running';

alter table public.job enable row level security;
revoke all on table public.job from public, anon, authenticated;

-- Enqueue a job. With a dedupe key, a second call returns the existing job id.
create function public.enqueue_job(
  p_kind text,
  p_payload jsonb default '{}'::jsonb,
  p_run_at timestamptz default now(),
  p_dedupe_key text default null,
  p_max_attempts integer default 5
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.job (kind, payload, run_at, dedupe_key, max_attempts)
  values (p_kind, coalesce(p_payload, '{}'::jsonb), coalesce(p_run_at, now()), p_dedupe_key,
          coalesce(p_max_attempts, 5))
  on conflict (dedupe_key) where dedupe_key is not null do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.job where dedupe_key = p_dedupe_key;
  end if;

  return v_id;
end;
$$;

-- Claim up to p_limit due jobs for one worker. SKIP LOCKED lets several
-- workers run side by side without claiming the same job. Jobs left "running"
-- longer than p_stale_after (a crashed worker) are claimed again.
create function public.claim_jobs(
  p_worker text,
  p_limit integer default 10,
  p_stale_after interval default interval '10 minutes'
) returns setof public.job
language sql
set search_path = ''
as $$
  update public.job j
     set status = 'running',
         attempts = j.attempts + 1,
         locked_at = now(),
         locked_by = p_worker
   where j.id in (
           select c.id
             from public.job c
            where (c.status = 'queued' and c.run_at <= now())
               or (c.status = 'running' and c.locked_at < now() - p_stale_after)
            order by c.run_at
            limit greatest(p_limit, 0)
              for update skip locked
         )
  returning j.*;
$$;

create function public.complete_job(p_id uuid) returns void
language sql
set search_path = ''
as $$
  update public.job
     set status = 'succeeded', finished_at = now(), locked_at = null, locked_by = null,
         last_error = null
   where id = p_id and status = 'running';
$$;

-- Record a failure. Retries after p_retry_in until max_attempts, then "dead".
create function public.fail_job(
  p_id uuid,
  p_error text,
  p_retry_in interval default interval '1 minute'
) returns text
language sql
set search_path = ''
as $$
  update public.job
     set status = case when attempts >= max_attempts then 'dead' else 'queued' end,
         run_at = case when attempts >= max_attempts then run_at else now() + p_retry_in end,
         finished_at = case when attempts >= max_attempts then now() else null end,
         locked_at = null,
         locked_by = null,
         last_error = left(p_error, 2000)
   where id = p_id and status = 'running'
  returning status;
$$;

revoke all on function public.enqueue_job(text, jsonb, timestamptz, text, integer)
  from public, anon, authenticated;
revoke all on function public.claim_jobs(text, integer, interval)
  from public, anon, authenticated;
revoke all on function public.complete_job(uuid) from public, anon, authenticated;
revoke all on function public.fail_job(uuid, text, interval) from public, anon, authenticated;
