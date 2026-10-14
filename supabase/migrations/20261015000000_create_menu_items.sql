begin;

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 240),
  price numeric(10, 2) not null check (price > 0),
  category text not null check (category in ('Sandviçler', 'Atıştırmalıklar', 'İçecekler')),
  image_url text not null default '/gusto-sandwich.jpg',
  available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.menu_items enable row level security;

grant select on public.menu_items to anon, authenticated;
grant insert, update, delete on public.menu_items to authenticated;

drop policy if exists "Public can read available menu items" on public.menu_items;
drop policy if exists "Admins can add menu items" on public.menu_items;
drop policy if exists "Admins can update menu items" on public.menu_items;
drop policy if exists "Admins can delete menu items" on public.menu_items;

create policy "Public can read available menu items"
  on public.menu_items for select
  using (available or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can add menu items"
  on public.menu_items for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can update menu items"
  on public.menu_items for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can delete menu items"
  on public.menu_items for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

insert into public.menu_items (id, name, description, price, category, image_url, available, sort_order)
values
  ('00000000-0000-4000-8000-000000000001', 'Gusto Club', 'Izgara tavuk, cheddar, avokado, ballı hardal', 245, 'Sandviçler', '/gusto-sandwich.jpg', true, 1),
  ('00000000-0000-4000-8000-000000000002', 'Sokak Lezzeti', 'Dana füme, karamelize soğan, eski kaşar', 285, 'Sandviçler', '/gusto-sandwich.jpg', true, 2),
  ('00000000-0000-4000-8000-000000000003', 'Avokado Rüyası', 'Ezilmiş avokado, beyaz peynir, roka, ekşi maya', 220, 'Sandviçler', '/gusto-sandwich.jpg', false, 3),
  ('00000000-0000-4000-8000-000000000004', 'Çıtır Patates', 'Biberiyeli ev yapımı patates kızartması', 95, 'Atıştırmalıklar', '/gusto-fries.jpg', true, 4),
  ('00000000-0000-4000-8000-000000000005', 'Ev Yapımı Limonata', 'Taze limon, nane ve biraz mutluluk', 75, 'İçecekler', '/gusto-lemonade.jpg', true, 5)
on conflict (id) do nothing;

commit;