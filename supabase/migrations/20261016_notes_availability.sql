alter table if exists student_profiles add column if not exists notes text;
alter table if exists student_profiles add column if not exists availability text;
alter table if exists student_profiles add column if not exists address text;

alter table if exists waiting_list add column if not exists area text;
alter table if exists waiting_list add column if not exists postcode text;

alter table if exists referrals add column if not exists notes text;
alter table if exists referrals add column if not exists admin_notes text;
