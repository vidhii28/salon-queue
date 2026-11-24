-- Salon Queue: shared queue schema for Supabase.
-- The public queue table contains no customer name or phone number.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create sequence if not exists public.queue_token_seq start with 1;
revoke all on sequence public.queue_token_seq from public, anon, authenticated;

create table if not exists public.queue_spots (
  id uuid primary key default gen_random_uuid(),
  token bigint not null unique default nextval('public.queue_token_seq'),
  service_ids text[] not null check (
    cardinality(service_ids) between 1 and 3
    and service_ids <@ array['haircut', 'beard', 'spa']::text[]
  ),
  preferred_barber text not null default 'any'
    check (preferred_barber in ('any', 'Ravi', 'Amit', 'Imran')),
  status text not null default 'waiting'
    check (status in ('waiting', 'called', 'in_chair', 'done', 'cancelled', 'no_show')),
  called_barber text check (called_barber in ('Ravi', 'Amit', 'Imran')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists queue_spots_status_token_idx
  on public.queue_spots (status, token);

alter table public.queue_spots add column if not exists called_at timestamptz;
alter table public.queue_spots add column if not exists started_at timestamptz;

create table if not exists public.salon_settings (
  id boolean primary key default true check (id),
  queue_open boolean not null default true,
  services jsonb not null default '[{"id":"haircut","name_en":"Haircut","minutes":30,"price":150,"enabled":true},{"id":"beard","name_en":"Beard trim","minutes":15,"price":80,"enabled":true},{"id":"spa","name_en":"Hair spa","minutes":45,"price":400,"enabled":true}]'::jsonb,
  barbers jsonb not null default '{"Ravi":true,"Amit":true,"Imran":true}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.salon_settings (id) values (true) on conflict (id) do nothing;
alter table public.salon_settings enable row level security;
revoke all on table public.salon_settings from public, anon, authenticated;
grant select on table public.salon_settings to anon, authenticated;
drop policy if exists "Salon settings are readable" on public.salon_settings;
create policy "Salon settings are readable" on public.salon_settings
  for select to anon, authenticated using (true);

create or replace function public.admin_save_settings(
  p_pin text, p_queue_open boolean, p_services jsonb, p_barbers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_settings public.salon_settings%rowtype;
begin
  if p_pin is distinct from '1234' then raise exception 'Access denied.' using errcode = '42501'; end if;
  if p_services is null or pg_catalog.jsonb_typeof(p_services) <> 'array' or pg_catalog.jsonb_array_length(p_services) <> 3 then
    raise exception 'All three service settings are required.' using errcode = '22023';
  end if;
  if exists (
    select 1 from pg_catalog.jsonb_array_elements(p_services) as item(value)
    where value->>'id' not in ('haircut','beard','spa')
      or coalesce(value->>'name_en','') = '' or coalesce(value->>'name_hi','') = ''
      or coalesce(value->>'minutes','') !~ '^[1-9][0-9]*$'
      or coalesce(value->>'price','') !~ '^[0-9]+$'
      or pg_catalog.jsonb_typeof(value->'enabled') <> 'boolean'
  ) or (select pg_catalog.count(distinct value->>'id') from pg_catalog.jsonb_array_elements(p_services) as item(value)) <> 3 then
    raise exception 'Service settings are invalid.' using errcode = '22023';
  end if;
  if pg_catalog.jsonb_typeof(p_barbers) <> 'object'
    or pg_catalog.jsonb_typeof(p_barbers->'Ravi') <> 'boolean'
    or pg_catalog.jsonb_typeof(p_barbers->'Amit') <> 'boolean'
    or pg_catalog.jsonb_typeof(p_barbers->'Imran') <> 'boolean' then
    raise exception 'Barber settings are invalid.' using errcode = '22023';
  end if;
  update public.salon_settings set queue_open = p_queue_open, services = p_services,
    barbers = p_barbers, updated_at = pg_catalog.now()
  where id = true returning * into v_settings;
  return pg_catalog.jsonb_build_object('queue_open', v_settings.queue_open,
    'services', v_settings.services, 'barbers', v_settings.barbers);
end;
$$;
revoke all on function public.admin_save_settings(text, boolean, jsonb, jsonb) from public;
grant execute on function public.admin_save_settings(text, boolean, jsonb, jsonb) to anon, authenticated;

create or replace function public.admin_today_stats(p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_result jsonb;
begin
  if p_pin is distinct from '1234' then raise exception 'Access denied.' using errcode = '42501'; end if;
  select pg_catalog.jsonb_build_object(
    'customers_served', pg_catalog.count(*) filter (where status = 'done' and updated_at::date = current_date),
    'average_wait_minutes', coalesce(pg_catalog.round((pg_catalog.avg(pg_catalog.date_part('epoch', (called_at - created_at)) / 60)
      filter (where called_at is not null and status in ('called','in_chair','done') and called_at::date = current_date))::numeric, 0), 0),
    'no_shows', pg_catalog.count(*) filter (where status = 'no_show' and updated_at::date = current_date)
  ) into v_result from public.queue_spots;
  return v_result;
end;
$$;
revoke all on function public.admin_today_stats(text) from public;
grant execute on function public.admin_today_stats(text) to anon, authenticated;

create table if not exists public.barber_presence (
  barber_name text primary key check (barber_name in ('Ravi', 'Amit', 'Imran')),
  on_break boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.barber_presence (barber_name, on_break) values
  ('Ravi', false), ('Amit', false), ('Imran', true)
on conflict (barber_name) do nothing;
alter table public.barber_presence enable row level security;
revoke all on table public.barber_presence from public, anon, authenticated;
grant select on table public.barber_presence to anon, authenticated;
drop policy if exists "Barber availability is public" on public.barber_presence;
create policy "Barber availability is public" on public.barber_presence
  for select to anon, authenticated using (true);

create table if not exists private.queue_contacts (
  spot_id uuid primary key references public.queue_spots(id) on delete cascade,
  customer_name text not null,
  phone text not null unique check (phone ~ '^[0-9]{10}$'),
  cancel_key uuid not null unique default gen_random_uuid()
);
alter table private.queue_contacts add column if not exists cancel_key uuid not null default gen_random_uuid();
alter table private.queue_contacts enable row level security;
revoke all on table private.queue_contacts from public, anon, authenticated;

create or replace function public.staff_queue(p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_pin is distinct from '1234' then raise exception 'Access denied.' using errcode = '42501'; end if;
  return coalesce((
    select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'id', spot.id, 'token', spot.token, 'service_ids', spot.service_ids,
      'preferred_barber', spot.preferred_barber, 'status', spot.status,
      'called_barber', spot.called_barber, 'created_at', spot.created_at,
      'called_at', spot.called_at, 'started_at', spot.started_at,
      'customer_name', contact.customer_name
    ) order by spot.token)
    from public.queue_spots spot
    left join private.queue_contacts contact on contact.spot_id = spot.id
    where spot.status in ('waiting', 'called', 'in_chair')
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.staff_queue(text) from public;
grant execute on function public.staff_queue(text) to anon, authenticated;

create or replace function public.staff_call_next(p_pin text, p_barber text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_spot_id uuid;
begin
  if p_pin is distinct from '1234' then raise exception 'Access denied.' using errcode = '42501'; end if;
  if p_barber not in ('Ravi', 'Amit', 'Imran') then raise exception 'Unknown barber.' using errcode = '22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_barber, 42));
  if not coalesce((select barbers->>p_barber = 'true' from public.salon_settings where id = true), true) then return null; end if;
  if exists (select 1 from public.barber_presence where barber_name = p_barber and on_break) then return null; end if;
  if exists (select 1 from public.queue_spots where called_barber = p_barber and status in ('called','in_chair')) then return null; end if;
  select id into v_spot_id from public.queue_spots
  where status = 'waiting' and (preferred_barber = p_barber or preferred_barber = 'any')
  order by token limit 1 for update skip locked;
  if v_spot_id is null then return null; end if;
  update public.queue_spots set status = 'called', called_barber = p_barber, called_at = pg_catalog.now()
    where id = v_spot_id and status = 'waiting';
  return v_spot_id;
end;
$$;
revoke all on function public.staff_call_next(text, text) from public;
grant execute on function public.staff_call_next(text, text) to anon, authenticated;

create or replace function public.staff_start(p_pin text, p_barber text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_spot_id uuid;
begin
  if p_pin is distinct from '1234' then raise exception 'Access denied.' using errcode = '42501'; end if;
  update public.queue_spots set status = 'in_chair', started_at = pg_catalog.now()
  where called_barber = p_barber and status = 'called' returning id into v_spot_id;
  return v_spot_id;
end;
$$;
revoke all on function public.staff_start(text, text) from public;
grant execute on function public.staff_start(text, text) to anon, authenticated;

create or replace function public.staff_done(p_pin text, p_barber text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_spot_id uuid;
begin
  if p_pin is distinct from '1234' then raise exception 'Access denied.' using errcode = '42501'; end if;
  update public.queue_spots set status = 'done'
  where called_barber = p_barber and status = 'in_chair' returning id into v_spot_id;
  return v_spot_id;
end;
$$;
revoke all on function public.staff_done(text, text) from public;
grant execute on function public.staff_done(text, text) to anon, authenticated;

create or replace function public.staff_set_break(p_pin text, p_barber text, p_on_break boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_pin is distinct from '1234' then raise exception 'Access denied.' using errcode = '42501'; end if;
  if p_barber not in ('Ravi', 'Amit', 'Imran') then raise exception 'Unknown barber.' using errcode = '22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_barber, 42));
  insert into public.barber_presence (barber_name, on_break, updated_at)
    values (p_barber, p_on_break, pg_catalog.now())
    on conflict (barber_name) do update set on_break = excluded.on_break, updated_at = excluded.updated_at;
  return true;
end;
$$;
revoke all on function public.staff_set_break(text, text, boolean) from public;
grant execute on function public.staff_set_break(text, text, boolean) to anon, authenticated;

create or replace function public.staff_update_spot(p_pin text, p_spot_id uuid, p_action text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_count integer;
begin
  if p_pin is distinct from '1234' then raise exception 'Access denied.' using errcode = '42501'; end if;
  if p_action = 'cancel' then
    update public.queue_spots set status = 'cancelled'
      where id = p_spot_id and status in ('waiting','called');
  elsif p_action = 'no_show' then
    update public.queue_spots set status = 'no_show'
      where id = p_spot_id and status = 'called'
        and called_at <= pg_catalog.now() - interval '10 minutes';
  else
    raise exception 'Unknown staff action.' using errcode = '22023';
  end if;
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;
revoke all on function public.staff_update_spot(text, uuid, text) from public;
grant execute on function public.staff_update_spot(text, uuid, text) to anon, authenticated;

alter table public.queue_spots enable row level security;
revoke all on table public.queue_spots from public, anon, authenticated;
grant select on table public.queue_spots to anon, authenticated;
drop policy if exists "Queue status is public" on public.queue_spots;
create policy "Queue status is public"
  on public.queue_spots for select to anon, authenticated using (true);

create or replace function public.queue_spots_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;
revoke all on function public.queue_spots_touch_updated_at() from public, anon, authenticated;
drop trigger if exists queue_spots_touch_updated_at on public.queue_spots;
create trigger queue_spots_touch_updated_at
  before update on public.queue_spots
  for each row execute function public.queue_spots_touch_updated_at();

create or replace function public.queue_spots_cleanup_contact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('done', 'cancelled', 'no_show') then
    delete from private.queue_contacts where spot_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function public.queue_spots_cleanup_contact() from public, anon, authenticated;
drop trigger if exists queue_spots_cleanup_contact on public.queue_spots;
create trigger queue_spots_cleanup_contact
  after update of status on public.queue_spots
  for each row execute function public.queue_spots_cleanup_contact();

drop function if exists public.join_queue(text, text, text[], text);
create or replace function public.join_queue(
  p_customer_name text,
  p_phone text,
  p_service_ids text[],
  p_preferred_barber text default 'any',
  p_source text default 'online'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_spot public.queue_spots%rowtype;
  v_token bigint;
  v_cancel_key uuid;
  v_settings public.salon_settings%rowtype;
begin
  if p_customer_name is null or pg_catalog.length(pg_catalog.btrim(p_customer_name)) = 0
     or pg_catalog.length(pg_catalog.btrim(p_customer_name)) > 80 then
    raise exception 'Enter a valid name.' using errcode = '22023';
  end if;
  if p_phone is null or p_phone !~ '^[0-9]{10}$' then
    raise exception 'Phone number must contain 10 digits.' using errcode = '22023';
  end if;
  if p_service_ids is null or pg_catalog.cardinality(p_service_ids) not between 1 and 3 then
    raise exception 'Choose between 1 and 3 services.' using errcode = '22023';
  end if;
  if exists (
    select 1 from pg_catalog.unnest(p_service_ids) as selected(service_id)
    where selected.service_id not in ('haircut', 'beard', 'spa')
  ) or (select pg_catalog.count(*) from pg_catalog.unnest(p_service_ids))
       <> (select pg_catalog.count(distinct service_id) from pg_catalog.unnest(p_service_ids) as selected(service_id)) then
    raise exception 'Service selection is invalid.' using errcode = '22023';
  end if;
  if p_preferred_barber is null or p_preferred_barber not in ('any', 'Ravi', 'Amit', 'Imran') then
    raise exception 'Barber selection is invalid.' using errcode = '22023';
  end if;
  if p_source is null or p_source not in ('online', 'walk_in') then raise exception 'Join source is invalid.' using errcode = '22023'; end if;
  select * into v_settings from public.salon_settings where id = true;
  if p_source = 'online' and not v_settings.queue_open then
    raise exception 'Online joining is closed.' using errcode = '55000';
  end if;
  if p_source = 'online' and exists (
    select 1 from pg_catalog.unnest(p_service_ids) selected(service_id)
    where not exists (
      select 1 from pg_catalog.jsonb_array_elements(v_settings.services) as item(value)
      where value->>'id' = selected.service_id and value->>'enabled' = 'true'
    )
  ) then raise exception 'A selected service is unavailable.' using errcode = '55000'; end if;
  if p_source = 'online' and p_preferred_barber <> 'any'
    and not coalesce((v_settings.barbers->>p_preferred_barber)::boolean, false) then
    raise exception 'That barber is not on duty today.' using errcode = '55000';
  end if;

  -- Serialize joins from the same phone so concurrent windows cannot create duplicates.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_phone, 0));
  select spot.* into v_spot
  from private.queue_contacts contact
  join public.queue_spots spot on spot.id = contact.spot_id
  where contact.phone = p_phone and spot.status in ('waiting', 'called', 'in_chair')
  limit 1;
  if found then
    return pg_catalog.jsonb_build_object('existing', true, 'spot', pg_catalog.jsonb_build_object(
      'id', v_spot.id,
      'token', v_spot.token,
      'service_ids', v_spot.service_ids,
      'preferred_barber', v_spot.preferred_barber,
      'status', v_spot.status,
      'called_barber', v_spot.called_barber,
      'created_at', v_spot.created_at
    ));
  end if;

  v_token := pg_catalog.nextval('public.queue_token_seq'::pg_catalog.regclass);
  v_cancel_key := pg_catalog.gen_random_uuid();
  insert into public.queue_spots (token, service_ids, preferred_barber)
  values (v_token, p_service_ids, p_preferred_barber)
  returning * into v_spot;

  insert into private.queue_contacts (spot_id, customer_name, phone, cancel_key)
  values (v_spot.id, pg_catalog.btrim(p_customer_name), p_phone, v_cancel_key);

  return pg_catalog.jsonb_build_object('existing', false, 'cancel_key', v_cancel_key, 'spot', pg_catalog.jsonb_build_object(
    'id', v_spot.id,
    'token', v_spot.token,
    'service_ids', v_spot.service_ids,
    'preferred_barber', v_spot.preferred_barber,
    'status', v_spot.status,
    'called_barber', v_spot.called_barber,
    'created_at', v_spot.created_at
  ));
end;
$$;
revoke all on function public.join_queue(text, text, text[], text, text) from public;
grant execute on function public.join_queue(text, text, text[], text, text) to anon, authenticated;

create or replace function public.cancel_queue_spot(p_spot_id uuid, p_cancel_key uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  update public.queue_spots
  set status = 'cancelled'
  where id = p_spot_id
    and status in ('waiting', 'called')
    and exists (
      select 1 from private.queue_contacts contact
      where contact.spot_id = p_spot_id and contact.cancel_key = p_cancel_key
    );
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;
revoke all on function public.cancel_queue_spot(uuid, uuid) from public;
grant execute on function public.cancel_queue_spot(uuid, uuid) to anon, authenticated;

-- Enable Postgres Changes for the browser subscription.
do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'queue_spots'
  ) then
    alter publication supabase_realtime add table public.queue_spots;
  end if;
  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'barber_presence'
  ) then
    alter publication supabase_realtime add table public.barber_presence;
  end if;
  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'salon_settings'
  ) then
    alter publication supabase_realtime add table public.salon_settings;
  end if;
end;
$$;
