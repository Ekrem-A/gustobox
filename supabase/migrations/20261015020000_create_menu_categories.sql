begin;

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 40),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.menu_categories enable row level security;

grant select on public.menu_categories to anon, authenticated;
grant insert, update, delete on public.menu_categories to authenticated;

drop policy if exists "Public can read menu categories" on public.menu_categories;
drop policy if exists "Admins can add menu categories" on public.menu_categories;
drop policy if exists "Admins can update menu categories" on public.menu_categories;
drop policy if exists "Admins can delete menu categories" on public.menu_categories;

create policy "Public can read menu categories"
  on public.menu_categories for select to anon, authenticated
  using (true);

create policy "Admins can add menu categories"
  on public.menu_categories for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can update menu categories"
  on public.menu_categories for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can delete menu categories"
  on public.menu_categories for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

insert into public.menu_categories (name, sort_order)
values ('Sandviçler', 1), ('Atıştırmalıklar', 2), ('İçecekler', 3)
on conflict (name) do update set sort_order = excluded.sort_order;

alter table public.menu_items drop constraint if exists menu_items_category_check;
alter table public.menu_items drop constraint if exists menu_items_category_fkey;
alter table public.menu_items
  add constraint menu_items_category_fkey
  foreign key (category) references public.menu_categories (name)
  on update cascade on delete restrict;

commit;