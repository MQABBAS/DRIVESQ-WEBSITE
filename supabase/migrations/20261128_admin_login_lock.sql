-- Step 2 of 2: run ONLY after you have signed in once with the new login (that upgrades your password) and the admin screen works.
-- Removes public access to the admin accounts table.
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='admins' loop
    execute format('drop policy %I on admins', p.policyname);
  end loop;
end $$;
alter table admins enable row level security;
-- To undo (only if something breaks):  create policy "tmp_open_admins" on admins for all using (true) with check (true);
