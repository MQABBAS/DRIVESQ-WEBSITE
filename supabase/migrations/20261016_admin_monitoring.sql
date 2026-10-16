create table if not exists admin_activity (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  admin_email text,
  action      text not null,
  table_name  text not null,
  summary     text,
  row_filter  text,
  details     jsonb
);
create index if not exists admin_activity_created_idx on admin_activity (created_at desc);

alter table admin_activity enable row level security;
drop policy if exists "anon_select_admin_activity" on admin_activity;
drop policy if exists "anon_insert_admin_activity" on admin_activity;
create policy "anon_select_admin_activity" on admin_activity for select using (true);
create policy "anon_insert_admin_activity" on admin_activity for insert with check (true);

alter table if exists waiting_list add column if not exists alert_sent_at timestamptz;

create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function dsq_admin_push(p_title text, p_body text, p_tag text)
returns void language plpgsql security definer as $$
begin
  perform net.http_post(
    url     := 'https://vwvbfqrlumvoabzkjxoa.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dmJmcXJsdW12b2FiemtqeG9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNzQ4MzgsImV4cCI6MjA5Njc1MDgzOH0.c5UNle-sh1DYuyqaNYvG9r9ru74EMP89uhdteQu2qho'),
    body    := jsonb_build_object(
                 'instructor_id', '00000000-0000-0000-0000-000000000001',
                 'title', p_title, 'body', p_body, 'url', '/admin.html#dashboard', 'tag', p_tag)
  );
end $$;

create or replace function dsq_admin_watch()
returns void language plpgsql security definer as $$
declare
  n int; names text; uk_hour int; unpaid int; unpaid_names text;
begin
  uk_hour := extract(hour from (now() at time zone 'Europe/London'));
  if uk_hour between 8 and 21 then
    select count(*), string_agg(coalesce(student_name, 'Unnamed'), ', ' order by created_at)
      into n, names
      from waiting_list
     where status = 'waiting' and alert_sent_at is null and created_at < now() - interval '1 hour';
    if n > 0 then
      perform dsq_admin_push('⏰ ' || n || ' enquir' || case when n = 1 then 'y' else 'ies' end || ' waiting over 1 hour',
                             left(names, 140) || ' — open admin to assign', 'dsq-waiting');
      update waiting_list set alert_sent_at = now()
       where status = 'waiting' and alert_sent_at is null and created_at < now() - interval '1 hour';
    end if;
  end if;

  if uk_hour = 9 and extract(minute from now()) < 15 then
    select count(*), string_agg(coalesce(student_name, 'Unnamed'), ', ')
      into unpaid, unpaid_names
      from referrals
     where coalesce(is_paid, false) = false and coalesce(is_cancelled, false) = false
       and coalesce(amount, 0) > 0 and created_at < now() - interval '7 days';
    if unpaid > 0 then
      perform dsq_admin_push('💷 ' || unpaid || ' referral' || case when unpaid = 1 then '' else 's' end || ' not booked after 7 days',
                             left(unpaid_names, 140) || ' — chase the instructor or reassign', 'dsq-unpaid');
    end if;
  end if;
end $$;

do $$ begin
  perform cron.unschedule('dsq-admin-watch');
exception when others then null; end $$;
select cron.schedule('dsq-admin-watch', '*/15 * * * *', 'select dsq_admin_watch();');
