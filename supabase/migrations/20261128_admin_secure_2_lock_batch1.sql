-- SECURITY STAGE 2, STEP B — run ONLY when the admin page shows the green "🔒 Secure admin session" badge after you sign in.
-- Batch 1: tables only the admin uses. After this, the public website key can no longer read or change them; only a signed-in admin can
-- (and the server functions, which use their own key). Nothing else on the site touches these tables.
do $$
declare t text; p record;
begin
  foreach t in array array[
    'wa_log','auto_assign_jobs','admin_attention','ad_spend','expenses','income_entries','follow_up_students',
    'student_followups','sms_log','school_settings','email_campaigns','email_contacts','email_sends','email_templates',
    'admin_notes','admin_followups'
  ] loop
    if to_regclass('public.' || t) is null then continue; end if;
    for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "admin_only" on public.%I for all to authenticated using (dsq_is_admin()) with check (dsq_is_admin())', t);
  end loop;
end $$;

-- UNDO for everything above, if something breaks (reopens the batch-1 tables):
-- do $$ declare t text; begin foreach t in array array['wa_log','auto_assign_jobs','admin_attention','ad_spend','expenses','income_entries','follow_up_students','student_followups','sms_log','school_settings','email_campaigns','email_contacts','email_sends','email_templates','admin_notes','admin_followups'] loop
--   if to_regclass('public.'||t) is null then continue; end if;
--   execute format('drop policy if exists "admin_only" on public.%I', t);
--   execute format('create policy "tmp_open" on public.%I for all using (true) with check (true)', t);
-- end loop; end $$;
