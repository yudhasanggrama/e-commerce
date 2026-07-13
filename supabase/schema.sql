-- =========================================================
-- Bloom E-commerce — Database Schema (Supabase / PostgreSQL)
-- =========================================================
-- Reverse-engineered from application code. Run against a
-- fresh Supabase project. Requires the "pgcrypto" extension
-- for gen_random_uuid().
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- Helper: keep updated_at fresh on every row update
-- ---------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- =========================================================
-- profiles
-- One row per auth.users, extended with app-specific fields.
-- =========================================================
create table profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  email      text,
  role       text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
before update on profiles
for each row execute function set_updated_at();

-- =========================================================
-- categories
-- =========================================================
create table categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_categories_updated_at
before update on categories
for each row execute function set_updated_at();

-- =========================================================
-- products
-- =========================================================
create table products (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid references categories (id) on delete set null,
  name        text not null,
  slug        text not null unique,
  brand       text,
  description text,
  price       numeric(12, 2) not null check (price >= 0),
  stock       integer not null default 0 check (stock >= 0),
  image_url   text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_products_category_id on products (category_id);
create index idx_products_is_active on products (is_active);

create trigger trg_products_updated_at
before update on products
for each row execute function set_updated_at();

-- =========================================================
-- carts
-- One active cart per user.
-- =========================================================
create table carts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  status     text not null default 'active' check (status in ('active', 'checked_out')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_carts_active_per_user
  on carts (user_id)
  where status = 'active';

create trigger trg_carts_updated_at
before update on carts
for each row execute function set_updated_at();

-- =========================================================
-- cart_items
-- =========================================================
create table cart_items (
  id         uuid primary key default gen_random_uuid(),
  cart_id    uuid not null references carts (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  qty        integer not null check (qty > 0),
  price      numeric(12, 2) not null check (price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, product_id)
);

create index idx_cart_items_cart_id on cart_items (cart_id);
create index idx_cart_items_product_id on cart_items (product_id);

create trigger trg_cart_items_updated_at
before update on cart_items
for each row execute function set_updated_at();

-- =========================================================
-- orders
-- =========================================================
create table orders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete set null,

  status         text not null default 'pending'
    check (status in ('pending', 'paid', 'shipped', 'completed', 'cancelled', 'expired')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'failed', 'expired', 'refunded')),

  subtotal     numeric(12, 2) not null check (subtotal >= 0),
  shipping_fee numeric(12, 2) not null default 0 check (shipping_fee >= 0),
  total        numeric(12, 2) not null check (total >= 0),

  paid_at      timestamptz,
  cancelled_at timestamptz,

  cancel_requested             boolean not null default false,
  cancel_reason                text,
  cancel_requested_at          timestamptz,
  cancel_request_email_sent_at timestamptz,
  cancel_approved_email_sent_at timestamptz,

  payment_email_sent    boolean not null default false,
  payment_email_sent_at timestamptz,
  failed_email_sent      boolean not null default false,
  failed_email_sent_at   timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_orders_user_id on orders (user_id);
create index idx_orders_status on orders (status);
create index idx_orders_payment_status on orders (payment_status);

create trigger trg_orders_updated_at
before update on orders
for each row execute function set_updated_at();

-- =========================================================
-- order_items
-- Snapshot of product data at the time of purchase.
-- =========================================================
create table order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references orders (id) on delete cascade,
  product_id uuid references products (id) on delete set null,
  name       text not null,
  price      numeric(12, 2) not null check (price >= 0),
  image_url  text,
  quantity   integer not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create index idx_order_items_order_id on order_items (order_id);
create index idx_order_items_product_id on order_items (product_id);

-- =========================================================
-- payments
-- One row per payment attempt/provider transaction (Midtrans).
-- =========================================================
create table payments (
  id  uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,

  provider           text not null default 'midtrans',
  provider_order_id  text not null unique,

  gross_amount       numeric(12, 2) not null check (gross_amount >= 0),
  transaction_status text not null default 'pending'
    check (transaction_status in
      ('pending', 'settlement', 'capture', 'success', 'deny', 'expire', 'cancel', 'failure')),
  fraud_status   text,
  payment_type   text,
  transaction_id text,
  payload        jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_payments_order_id on payments (order_id);

create trigger trg_payments_updated_at
before update on payments
for each row execute function set_updated_at();

-- =========================================================
-- Storage bucket for product images
-- =========================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', false)
on conflict (id) do nothing;

-- =========================================================
-- RPC functions
-- =========================================================

-- Marks an order as paid, records/updates the payment row, and
-- deducts stock for each item. Single source of truth invoked
-- from the Midtrans webhook and payment-status endpoints.
create or replace function fulfill_order_paid(
  p_order_id          uuid,
  p_provider_order_id text,
  p_transaction_status text,
  p_fraud_status       text,
  p_payment_type       text,
  p_gross_amount       numeric,
  p_payload            jsonb
)
returns void as $$
begin
  insert into payments (
    order_id, provider, provider_order_id, gross_amount,
    transaction_status, fraud_status, payment_type, payload
  )
  values (
    p_order_id, 'midtrans', p_provider_order_id, p_gross_amount,
    p_transaction_status, p_fraud_status, p_payment_type, p_payload
  )
  on conflict (provider_order_id) do update
    set transaction_status = excluded.transaction_status,
        fraud_status       = excluded.fraud_status,
        payment_type       = excluded.payment_type,
        gross_amount       = excluded.gross_amount,
        payload             = excluded.payload,
        updated_at          = now();

  update orders
     set status         = 'paid',
         payment_status = 'paid',
         paid_at        = coalesce(paid_at, now())
   where id = p_order_id
     and payment_status <> 'paid';

  update products p
     set stock = p.stock - oi.quantity
    from order_items oi
   where oi.order_id = p_order_id
     and oi.product_id = p.id;
end;
$$ language plpgsql security definer;

-- Approves a cancellation request for a paid order and restocks
-- the reserved items.
create or replace function admin_approve_cancel_paid(
  p_order_id uuid,
  p_note     text
)
returns void as $$
begin
  update orders
     set status               = 'cancelled',
         cancelled_at         = now(),
         cancel_requested     = false,
         cancel_reason        = coalesce(p_note, cancel_reason)
   where id = p_order_id;

  update products p
     set stock = p.stock + oi.quantity
    from order_items oi
   where oi.order_id = p_order_id
     and oi.product_id = p.id;
end;
$$ language plpgsql security definer;

-- Increments product stock by a given quantity (used to restock
-- on cancellation of unpaid orders).
create or replace function inc_product_stock(
  p_product_id uuid,
  p_qty        integer
)
returns void as $$
begin
  update products
     set stock = stock + p_qty
   where id = p_product_id;
end;
$$ language plpgsql security definer;
