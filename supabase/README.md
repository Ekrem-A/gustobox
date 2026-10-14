# Supabase setup

1. Copy `.env.example` to `.env.local` and add the project URL and publishable (anon) key from Supabase Project Settings > API.
2. Run `migrations/20261015000000_create_menu_items.sql` in the Supabase SQL Editor. It creates the menu table, sample products, and row-level security policies.
3. In Supabase Authentication, enable email/password and create the owner account.
4. In the SQL Editor, grant the owner account the admin application role. Replace the email before running:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'owner@example.com';
```

5. Sign in again at `/` so the refreshed session includes the admin role. The public QR menu is available at `/menu`.

Only the public/anon key belongs in `.env.local`; never expose the service-role key in a `NEXT_PUBLIC_` variable or browser code. RLS allows the public menu to read available items and restricts writes to admin-role users.