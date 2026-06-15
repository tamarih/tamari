-- ============================================================
-- Catalog Database Schema for Supabase
-- ============================================================
-- Run this in Supabase SQL Editor (Project → SQL Editor → New Query)
-- ============================================================

create table if not exists products (
    id              bigserial primary key,
    sku             text not null unique,
    name            text not null,
    description     text,
    category        text,
    image_url       text,

    supplier_price  numeric(10,2) not null default 0,

    vat_rate        numeric(5,2)  not null default 18,
    margin_rate     numeric(5,2)  not null default 30,

    stock_qty       integer,
    print_area      text,
    press_time      text,
    press_temp      text,
    notes           text,

    is_active       boolean not null default true,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create or replace view products_view as
select
    p.*,
    round(p.supplier_price * (1 + p.vat_rate/100), 2)                                         as price_with_vat,
    round(p.supplier_price * (1 + p.vat_rate/100) * (1 + p.margin_rate/100), 2)               as sale_price,
    round(p.supplier_price * (1 + p.vat_rate/100) * (p.margin_rate/100), 2)                   as profit_amount
from products p;

create index if not exists idx_products_category on products(category);
create index if not exists idx_products_sku on products(sku);
create index if not exists idx_products_name on products(name);

create or replace function touch_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists trg_products_updated on products;
create trigger trg_products_updated
    before update on products
    for each row execute function touch_updated_at();

-- Storage bucket for product images
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- ============================================================
-- Row Level Security (open read; auth-only writes)
-- ============================================================
alter table products enable row level security;

drop policy if exists "public read" on products;
create policy "public read"
    on products for select
    using (true);

drop policy if exists "auth write" on products;
create policy "auth write"
    on products for all
    using (auth.role() = 'authenticated')
    with check (auth.role() = 'authenticated');

drop policy if exists "public image read" on storage.objects;
create policy "public image read"
    on storage.objects for select
    using (bucket_id = 'product-images');

drop policy if exists "auth image write" on storage.objects;
create policy "auth image write"
    on storage.objects for insert
    with check (bucket_id = 'product-images' and auth.role() = 'authenticated');

drop policy if exists "auth image update" on storage.objects;
create policy "auth image update"
    on storage.objects for update
    using (bucket_id = 'product-images' and auth.role() = 'authenticated');

drop policy if exists "auth image delete" on storage.objects;
create policy "auth image delete"
    on storage.objects for delete
    using (bucket_id = 'product-images' and auth.role() = 'authenticated');
