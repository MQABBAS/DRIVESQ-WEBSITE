-- DriveSQ admin · Find & Assign: give an "other driver" (not DriveSQ) a portal account.
-- Links the driver to the instructors row created for them, so admin knows they already have an account.
-- Optional: without this column admin links them by phone number instead. Safe to run more than once.
alter table external_drivers add column if not exists instructor_id uuid references instructors(id) on delete set null;
