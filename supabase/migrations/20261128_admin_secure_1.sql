-- SECURITY STAGE 2, STEP A — safe to run now. Adds a check the admin page uses to show "Secure session active". Nothing stops working.
create or replace function dsq_is_admin() returns boolean
language sql stable as $$ select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin' $$;
grant execute on function dsq_is_admin() to anon, authenticated;
