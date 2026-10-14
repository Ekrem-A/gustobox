begin;

create table if not exists public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  storage_path text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.hero_slides enable row level security;

grant select on public.hero_slides to anon, authenticated;
grant insert, update, delete on public.hero_slides to authenticated;

drop policy if exists "Public can read hero slides" on public.hero_slides;
drop policy if exists "Admins can add hero slides" on public.hero_slides;
drop policy if exists "Admins can update hero slides" on public.hero_slides;
drop policy if exists "Admins can delete hero slides" on public.hero_slides;

create policy "Public can read hero slides"
  on public.hero_slides for select to anon, authenticated
  using (true);

create policy "Admins can add hero slides"
  on public.hero_slides for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can update hero slides"
  on public.hero_slides for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can delete hero slides"
  on public.hero_slides for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

commit;