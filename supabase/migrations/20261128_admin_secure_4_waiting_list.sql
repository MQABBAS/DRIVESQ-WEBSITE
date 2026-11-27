-- SECURITY STAGE 2, STEP D: protect the leads list (waiting_list: names, phones, postcodes).
-- Visitors can still SEND a booking (insert only). They can no longer read, change or delete anyone's lead.
-- The old "confirm.html" instructor link keeps working through two small server routines that need the secret token from the link.
create or replace function dsq_confirm_get(p_token text) returns json
language sql security definer set search_path = public as $$
  select row_to_json(t) from (
    select student_name, student_phone, postcode, lesson_type, confirm_status
    from waiting_list where p_token is not null and length(p_token) >= 8 and confirm_token = p_token limit 1) t
$$;
create or replace function dsq_confirm_set(p_token text, p_status text) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if p_token is null or length(p_token) < 8 or p_status not in ('accepted','declined') then return false; end if;
  update waiting_list set confirm_status = p_status, confirm_responded_at = now()
   where confirm_token = p_token and (confirm_status is null or confirm_status = 'pending');
  get diagnostics n = row_count; return n > 0;
end $$;
grant execute on function dsq_confirm_get(text), dsq_confirm_set(text, text) to anon, authenticated;

do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='waiting_list' loop
    execute format('drop policy %I on public.waiting_list', p.policyname);
  end loop;
end $$;
alter table waiting_list enable row level security;
create policy "public_can_send_booking" on waiting_list for insert to anon, authenticated with check (true);
create policy "admin_only_rest" on waiting_list for all to authenticated using (dsq_is_admin()) with check (dsq_is_admin());

-- UNDO (reopens the table): drop policy "public_can_send_booking" on waiting_list; drop policy "admin_only_rest" on waiting_list;
--   create policy "tmp_open" on waiting_list for all using (true) with check (true);
