-- SECURITY STAGE 2, STEP C (batch 2). Run only after batch 1 has been working fine for you.
-- More tables that ONLY the admin screen uses (I searched every page and script: no public page, instructor page or student page touches them).
-- After this, only a signed-in admin (and the server functions) can read or change them.
do $$
declare t text; p record;
begin
  foreach t in array array[
    'admin_activity','admin_sessions','autopilot_log','draw_entries','draw_results','draw_settings',
    'external_drivers','app_settings','notifications','students'
  ] loop
    if to_regclass('public.' || t) is null then continue; end if;
    for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "admin_only" on public.%I for all to authenticated using (dsq_is_admin()) with check (dsq_is_admin())', t);
  end loop;
end $$;

-- UNDO (reopens these tables) if something breaks:
-- do $$ declare t text; begin foreach t in array array['admin_activity','admin_sessions','autopilot_log','draw_entries','draw_results','draw_settings','external_drivers','app_settings','notifications','students'] loop
--   if to_regclass('public.'||t) is null then continue; end if;
--   execute format('drop policy if exists "admin_only" on public.%I', t);
--   execute format('create policy "tmp_open" on public.%I for all using (true) with check (true)', t);
-- end loop; end $$;
