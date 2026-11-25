-- ADI Part 3 training enquiries (the booking form on /adi-part-3-training-booking.html).
-- PRIVATE: row level security is on and there are NO policies, so only the edge function (service role) can read or write it.
-- The public cannot read these rows even with the website's anon key. Safe to run more than once.
create table if not exists adi_enquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text not null,
  email text default '',
  stage text default '',
  part1_pass text default '',
  trainee_licence text default '',
  licence_start text default '',
  attempts int default 0,
  test_date text default '',
  test_centre text default '',
  car text default '',
  help text[] default '{}',
  availability text default '',
  urgency text default '',
  postcode text default '',
  contact_pref text default '',
  message text default '',
  source text default '',
  consent boolean not null default false,
  status text not null default 'new',
  admin_notes text default '',
  contacted_at timestamptz
);
alter table adi_enquiries enable row level security;
create index if not exists adi_enquiries_created_idx on adi_enquiries (created_at desc);
create index if not exists adi_enquiries_status_idx on adi_enquiries (status);
