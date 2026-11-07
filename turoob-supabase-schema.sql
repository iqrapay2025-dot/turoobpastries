-- =====================================================================
-- Turoob Pastries: Supabase schema
-- Run in: Supabase Dashboard > SQL Editor > New query > Run
-- Money is stored in whole naira (integers). Multiply by 100 for Paystack.
-- All times use Africa/Lagos.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- ENUMS ----------
create type fulfilment_type as enum ('pickup', 'delivery');
create type delivery_zone    as enum ('on_campus', 'off_campus');
create type fee_status       as enum ('not_applicable', 'pending_review', 'confirmed', 'accepted', 'declined');
create type payment_status   as enum ('unpaid', 'paid', 'failed', 'refunded');
create type order_status     as enum ('received', 'preparing', 'out_for_delivery', 'ready_for_pickup', 'completed', 'cancelled');

-- ---------- HELPERS ----------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- ADMINS ----------
-- Add a row here for each team member who should access the dashboard.
create table admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- ---------- APP SETTINGS (single row) ----------
create table app_settings (
  id int primary key default 1 check (id = 1),
  business_name text not null default 'Turoob Pastries',
  pickup_location text not null default 'Central Mosque, University of Ilorin',
  on_campus_fee int not null default 100,
  off_campus_fee int not null default 200,
  whatsapp_number text,
  instagram_url text,
  contact_email text,
  updated_at timestamptz not null default now()
);
create trigger trg_app_settings_updated before update on app_settings
  for each row execute function set_updated_at();

-- ---------- BATCH DAYS ----------
-- One row per weekday the business sells. Fully editable from the admin
-- panel, so the schedule/cutoff can change without code changes.
create table batch_days (
  id serial primary key,
  label text not null,                       -- 'Friday', 'Saturday'
  day_of_week int not null unique check (day_of_week between 0 and 6), -- 0=Sun ... 6=Sat
  is_open boolean not null default false,    -- master switch for ordering
  serving_time_label text,                   -- 'After Jumah (~2:30pm)', '6-7am'
  opens_day_offset int not null default 0,   -- 0 = same day, 1 = evening before
  opens_time time not null default '00:00',
  cutoff_time time not null,                 -- order cutoff on the batch day
  max_portions int,                          -- null = unlimited
  note text,
  updated_at timestamptz not null default now()
);
create trigger trg_batch_days_updated before update on batch_days
  for each row execute function set_updated_at();

-- ---------- DELIVERY TIME SLOTS ----------
create table delivery_slots (
  id serial primary key,
  batch_day_id int not null references batch_days(id) on delete cascade,
  label text not null,                       -- '3:15pm'
  sort_order int not null default 0,
  is_active boolean not null default true
);

-- ---------- PRODUCTS ----------
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price int not null check (price >= 0),
  image_url text,
  category text not null default 'puff-puff',   -- 'puff-puff' | 'drink'
  counts_toward_limit boolean not null default false, -- true for puff-puff
  partner_name text,                             -- 'Bliss Blend'
  is_available boolean not null default true,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);
create trigger trg_products_updated before update on products
  for each row execute function set_updated_at();

-- ---------- ORDERS ----------
create sequence order_number_seq start 1001;

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('TRB-' || nextval('order_number_seq')),
  public_token uuid not null unique default gen_random_uuid(), -- used in emailed links

  customer_name text not null,
  customer_phone text not null,
  customer_email text not null,

  batch_day_id int references batch_days(id),
  batch_date date not null,

  fulfilment fulfilment_type not null,
  zone delivery_zone,
  delivery_address text,
  landmark text,
  delivery_slot text,
  notes text,

  subtotal int not null check (subtotal >= 0),
  delivery_fee int not null default 0 check (delivery_fee >= 0),
  total int not null check (total >= 0),

  fee_status fee_status not null default 'not_applicable',
  payment_status payment_status not null default 'unpaid',
  order_status order_status not null default 'received',

  paystack_reference text unique,
  paid_at timestamptz,
  paid_manually boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint delivery_needs_address check (
    fulfilment = 'pickup' or (delivery_address is not null and zone is not null)
  )
);
create index idx_orders_batch_date on orders (batch_date);
create index idx_orders_status on orders (order_status, payment_status);
create index idx_orders_phone on orders (customer_phone);
create trigger trg_orders_updated before update on orders
  for each row execute function set_updated_at();

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id),
  product_name text not null,        -- snapshot, survives later edits
  unit_price int not null,
  quantity int not null check (quantity > 0),
  line_total int generated always as (unit_price * quantity) stored
);
create index idx_order_items_order on order_items (order_id);

-- Paystack webhook log (idempotency + audit). Written by Edge Functions only.
create table payment_events (
  id uuid primary key default gen_random_uuid(),
  reference text not null,
  event_type text not null,
  payload jsonb,
  created_at timestamptz not null default now(),
  unique (reference, event_type)
);

-- ---------- REVIEWS & TEAM ----------
create table reviews (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  comment text not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  photo_url text,
  sort_order int not null default 0,
  is_active boolean not null default true
);

-- =====================================================================
-- HELPER FUNCTIONS
-- =====================================================================

-- Next calendar date for a batch day (today counts if cutoff has not passed).
create or replace function next_batch_date(p_batch_day_id int)
returns date language plpgsql stable as $$
declare
  bd batch_days%rowtype;
  today date := (now() at time zone 'Africa/Lagos')::date;
  d date;
begin
  select * into bd from batch_days where id = p_batch_day_id;
  if not found then return null; end if;
  d := today + ((bd.day_of_week - extract(dow from today)::int + 7) % 7);
  if d = today and (now() at time zone 'Africa/Lagos')::time >= bd.cutoff_time then
    d := d + 7;
  end if;
  return d;
end $$;

-- Is a given batch currently accepting orders?
create or replace function batch_is_open(p_batch_day_id int)
returns boolean language plpgsql stable as $$
declare
  bd batch_days%rowtype;
  d date;
  opens_ts timestamptz;
  cutoff_ts timestamptz;
begin
  select * into bd from batch_days where id = p_batch_day_id;
  if not found or not bd.is_open then return false; end if;
  d := next_batch_date(p_batch_day_id);
  opens_ts  := ((d - bd.opens_day_offset) + bd.opens_time) at time zone 'Africa/Lagos';
  cutoff_ts := (d + bd.cutoff_time) at time zone 'Africa/Lagos';
  return now() >= opens_ts and now() < cutoff_ts;
end $$;

-- Portions already ordered for a batch date (non-cancelled, limit-counting items).
create or replace function portions_ordered(p_batch_date date)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(oi.quantity), 0)::int
  from order_items oi
  join orders o on o.id = oi.order_id
  join products p on p.id = oi.product_id
  where o.batch_date = p_batch_date
    and o.order_status <> 'cancelled'
    and p.counts_toward_limit;
$$;

-- Public view of batch status (for the countdown / "Orders closed" / "Sold out").
create or replace function get_batch_status()
returns table (
  batch_day_id int, label text, serving_time_label text, batch_date date,
  cutoff_at timestamptz, is_open boolean, is_sold_out boolean,
  max_portions int, portions_left int, note text
) language sql stable security definer set search_path = public as $$
  select
    bd.id, bd.label, bd.serving_time_label,
    next_batch_date(bd.id),
    ((next_batch_date(bd.id) + bd.cutoff_time) at time zone 'Africa/Lagos'),
    batch_is_open(bd.id),
    (bd.max_portions is not null
       and portions_ordered(next_batch_date(bd.id)) >= bd.max_portions),
    bd.max_portions,
    case when bd.max_portions is null then null
         else greatest(bd.max_portions - portions_ordered(next_batch_date(bd.id)), 0) end,
    bd.note
  from batch_days bd
  order by bd.day_of_week;
$$;

-- =====================================================================
-- CUSTOMER RPCs (prices are always computed server-side)
-- =====================================================================

-- p_order example:
-- {
--   "customer_name":"Ade", "customer_phone":"0801...", "customer_email":"a@b.com",
--   "batch_day_id":1, "fulfilment":"delivery", "zone":"on_campus",
--   "delivery_address":"Hall B", "landmark":"near gate", "delivery_slot":"3:15pm",
--   "notes":"", "items":[{"product_id":"<uuid>","quantity":10}]
-- }
create or replace function place_order(p_order jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_batch_day_id int := (p_order->>'batch_day_id')::int;
  v_date date;
  v_fulfilment fulfilment_type := (p_order->>'fulfilment')::fulfilment_type;
  v_zone delivery_zone;
  v_settings app_settings%rowtype;
  v_bd batch_days%rowtype;
  v_item jsonb;
  v_product products%rowtype;
  v_qty int;
  v_subtotal int := 0;
  v_limit_qty int := 0;
  v_fee int := 0;
  v_fee_status fee_status := 'not_applicable';
  v_order orders%rowtype;
begin
  select * into v_settings from app_settings where id = 1;
  select * into v_bd from batch_days where id = v_batch_day_id;
  if not found then raise exception 'Unknown batch day'; end if;
  if not batch_is_open(v_batch_day_id) then
    raise exception 'Ordering is closed for this batch';
  end if;
  v_date := next_batch_date(v_batch_day_id);

  if coalesce(trim(p_order->>'customer_name'), '') = ''
     or coalesce(trim(p_order->>'customer_phone'), '') = ''
     or coalesce(trim(p_order->>'customer_email'), '') = '' then
    raise exception 'Name, phone and email are required';
  end if;

  if jsonb_array_length(coalesce(p_order->'items', '[]'::jsonb)) = 0 then
    raise exception 'Your cart is empty';
  end if;

  -- validate items and compute subtotal
  for v_item in select * from jsonb_array_elements(p_order->'items') loop
    v_qty := (v_item->>'quantity')::int;
    if v_qty is null or v_qty <= 0 or v_qty > 500 then
      raise exception 'Invalid quantity';
    end if;
    select * into v_product from products
      where id = (v_item->>'product_id')::uuid and is_available;
    if not found then raise exception 'An item in your cart is no longer available'; end if;
    v_subtotal := v_subtotal + v_product.price * v_qty;
    if v_product.counts_toward_limit then v_limit_qty := v_limit_qty + v_qty; end if;
  end loop;

  -- portion limit
  if v_bd.max_portions is not null
     and portions_ordered(v_date) + v_limit_qty > v_bd.max_portions then
    raise exception 'Sorry, not enough portions left for this batch';
  end if;

  -- delivery
  if v_fulfilment = 'delivery' then
    v_zone := (p_order->>'zone')::delivery_zone;
    if coalesce(trim(p_order->>'delivery_address'), '') = '' then
      raise exception 'Delivery address is required';
    end if;
    v_fee := case v_zone when 'on_campus' then v_settings.on_campus_fee
                         else v_settings.off_campus_fee end;
    v_fee_status := 'pending_review';
  end if;

  insert into orders (
    customer_name, customer_phone, customer_email,
    batch_day_id, batch_date, fulfilment, zone,
    delivery_address, landmark, delivery_slot, notes,
    subtotal, delivery_fee, total, fee_status
  ) values (
    trim(p_order->>'customer_name'), trim(p_order->>'customer_phone'),
    lower(trim(p_order->>'customer_email')),
    v_batch_day_id, v_date, v_fulfilment, v_zone,
    nullif(trim(p_order->>'delivery_address'), ''),
    nullif(trim(p_order->>'landmark'), ''),
    nullif(trim(p_order->>'delivery_slot'), ''),
    nullif(trim(p_order->>'notes'), ''),
    v_subtotal, v_fee, v_subtotal + v_fee, v_fee_status
  ) returning * into v_order;

  insert into order_items (order_id, product_id, product_name, unit_price, quantity)
  select v_order.id, p.id, p.name, p.price, (i->>'quantity')::int
  from jsonb_array_elements(p_order->'items') i
  join products p on p.id = (i->>'product_id')::uuid;

  return jsonb_build_object(
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'public_token', v_order.public_token,
    'requires_fee_confirmation', v_fulfilment = 'delivery',
    'total', v_order.total
  );
end $$;

-- Order lookup for the "Track my order" page.
create or replace function track_order(p_order_number text, p_phone text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'order_number', o.order_number,
    'order_status', o.order_status,
    'payment_status', o.payment_status,
    'fee_status', o.fee_status,
    'fulfilment', o.fulfilment,
    'batch_date', o.batch_date,
    'delivery_slot', o.delivery_slot,
    'total', o.total,
    'delivery_fee', o.delivery_fee,
    'items', (select jsonb_agg(jsonb_build_object(
                'name', oi.product_name, 'quantity', oi.quantity, 'line_total', oi.line_total))
              from order_items oi where oi.order_id = o.id)
  )
  from orders o
  where upper(o.order_number) = upper(trim(p_order_number))
    and regexp_replace(o.customer_phone, '\D', '', 'g')
        = regexp_replace(p_phone, '\D', '', 'g')
  limit 1;
$$;

-- Fee confirmation page (opened from the emailed link).
create or replace function get_order_by_token(p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'order_number', o.order_number,
    'customer_name', o.customer_name,
    'delivery_address', o.delivery_address,
    'subtotal', o.subtotal,
    'delivery_fee', o.delivery_fee,
    'total', o.total,
    'fee_status', o.fee_status,
    'payment_status', o.payment_status
  )
  from orders o where o.public_token = p_token;
$$;

-- Customer accepts or declines the confirmed delivery fee.
create or replace function respond_to_delivery_fee(p_token uuid, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_order orders%rowtype;
begin
  select * into v_order from orders where public_token = p_token for update;
  if not found then raise exception 'Order not found'; end if;
  if v_order.fee_status <> 'confirmed' then
    raise exception 'The delivery fee is not awaiting your response';
  end if;
  update orders
     set fee_status = case when p_accept then 'accepted'::fee_status
                           else 'declined'::fee_status end,
         order_status = case when p_accept then order_status
                             else 'cancelled'::order_status end
   where id = v_order.id;
  return jsonb_build_object('order_number', v_order.order_number, 'accepted', p_accept);
end $$;

-- =====================================================================
-- ADMIN RPCs
-- =====================================================================

-- Set the final delivery fee. The Edge Function / dashboard then emails the
-- customer the fee-confirmation link (/confirm-fee/<public_token>).
create or replace function admin_set_delivery_fee(p_order_id uuid, p_fee int)
returns orders language plpgsql security definer set search_path = public as $$
declare v_order orders%rowtype;
begin
  if not is_admin() then raise exception 'Not authorised'; end if;
  if p_fee < 0 then raise exception 'Invalid fee'; end if;
  update orders
     set delivery_fee = p_fee,
         total = subtotal + p_fee,
         fee_status = 'confirmed'
   where id = p_order_id and fulfilment = 'delivery' and payment_status = 'unpaid'
   returning * into v_order;
  if not found then raise exception 'Order not found or already paid'; end if;
  return v_order;
end $$;

-- Batch summary for the dashboard (what to fry, revenue, pickups vs deliveries).
create or replace function admin_batch_summary(p_batch_date date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not authorised'; end if;
  return jsonb_build_object(
    'batch_date', p_batch_date,
    'orders', (select count(*) from orders
               where batch_date = p_batch_date and order_status <> 'cancelled'),
    'paid_orders', (select count(*) from orders
                    where batch_date = p_batch_date and payment_status = 'paid'),
    'pickups', (select count(*) from orders
                where batch_date = p_batch_date and fulfilment = 'pickup'
                  and order_status <> 'cancelled'),
    'deliveries', (select count(*) from orders
                   where batch_date = p_batch_date and fulfilment = 'delivery'
                     and order_status <> 'cancelled'),
    'revenue_paid', (select coalesce(sum(total), 0) from orders
                     where batch_date = p_batch_date and payment_status = 'paid'),
    'items', (select coalesce(jsonb_agg(jsonb_build_object(
                'product', t.product_name, 'quantity', t.qty)), '[]'::jsonb)
              from (select oi.product_name, sum(oi.quantity) qty
                    from order_items oi join orders o on o.id = oi.order_id
                    where o.batch_date = p_batch_date and o.order_status <> 'cancelled'
                    group by oi.product_name) t)
  );
end $$;

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table admins          enable row level security;
alter table app_settings    enable row level security;
alter table batch_days      enable row level security;
alter table delivery_slots  enable row level security;
alter table products        enable row level security;
alter table orders          enable row level security;
alter table order_items     enable row level security;
alter table payment_events  enable row level security;
alter table reviews         enable row level security;
alter table team_members    enable row level security;

-- Admins table: admins can see themselves; managed manually in SQL.
create policy "admins read self" on admins for select using (user_id = auth.uid());

-- Public read, admin write
create policy "public read settings" on app_settings for select using (true);
create policy "admin write settings" on app_settings for all using (is_admin()) with check (is_admin());

create policy "public read batch days" on batch_days for select using (true);
create policy "admin write batch days" on batch_days for all using (is_admin()) with check (is_admin());

create policy "public read slots" on delivery_slots for select using (is_active);
create policy "admin write slots" on delivery_slots for all using (is_admin()) with check (is_admin());

create policy "public read products" on products for select using (true);
create policy "admin write products" on products for all using (is_admin()) with check (is_admin());

create policy "public read team" on team_members for select using (is_active);
create policy "admin write team" on team_members for all using (is_admin()) with check (is_admin());

create policy "public read published reviews" on reviews for select using (is_published);
create policy "admin all reviews" on reviews for all using (is_admin()) with check (is_admin());

-- Orders: no public access at all. Customers go through the RPCs above.
create policy "admin read orders" on orders for select using (is_admin());
create policy "admin update orders" on orders for update using (is_admin()) with check (is_admin());
create policy "admin read order items" on order_items for select using (is_admin());
-- payment_events: no policies = only the service role (Edge Functions) can touch it.

-- Function permissions
revoke all on function admin_set_delivery_fee(uuid, int) from public;
revoke all on function admin_batch_summary(date) from public;
grant execute on function admin_set_delivery_fee(uuid, int) to authenticated;
grant execute on function admin_batch_summary(date) to authenticated;

grant execute on function get_batch_status() to anon, authenticated;
grant execute on function place_order(jsonb) to anon, authenticated;
grant execute on function track_order(text, text) to anon, authenticated;
grant execute on function get_order_by_token(uuid) to anon, authenticated;
grant execute on function respond_to_delivery_fee(uuid, boolean) to anon, authenticated;

-- ---------- REALTIME (live orders on the dashboard) ----------
alter publication supabase_realtime add table orders;

-- =====================================================================
-- SEED DATA (edit freely; everything is changeable from the admin panel)
-- =====================================================================
insert into app_settings (id) values (1);

-- day_of_week: 0=Sunday ... 5=Friday, 6=Saturday
insert into batch_days (label, day_of_week, is_open, serving_time_label, opens_day_offset, opens_time, cutoff_time, max_portions, note)
values
  ('Friday',   5, true,  'After Jumah (~2:30pm)', 0, '00:00', '15:30', null, null),
  ('Saturday', 6, false, '6-7am',                 1, '18:00', '05:00', null, 'Coming soon');

insert into products (name, description, price, category, counts_toward_limit, sort_order) values
  ('Puff-Puff (With Pepper)',    'Spicy, a student favourite', 100, 'puff-puff', true, 1),
  ('Puff-Puff (Without Pepper)', 'Soft and sweet',             100, 'puff-puff', true, 2);

insert into products (name, description, price, category, partner_name, is_available, sort_order) values
  ('Zobo (Small)', 'Refreshing hibiscus drink', 500,  'drink', 'Bliss Blend', false, 3),
  ('Zobo (Large)', 'Refreshing hibiscus drink', 1000, 'drink', 'Bliss Blend', false, 4);

insert into delivery_slots (batch_day_id, label, sort_order)
select bd.id, s.label, s.ord
from batch_days bd
cross join (values ('2:45pm',1), ('3:15pm',2), ('3:45pm',3), ('4:15pm',4), ('4:45pm',5)) as s(label, ord)
where bd.label = 'Friday';

-- =====================================================================
-- AFTER RUNNING THIS FILE
-- 1. Authentication > Users > Add user (the admin's email + password).
-- 2. Make them an admin (replace the email):
--      insert into admins (user_id, full_name)
--      select id, 'Admin Name' from auth.users where email = 'admin@example.com';
-- =====================================================================