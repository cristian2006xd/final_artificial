-- =========================================================================
-- Prisma Market — esquema de Supabase
-- Cómo usarlo: Dashboard de tu proyecto → SQL Editor → New query →
-- pega TODO este archivo → Run. Es seguro volver a ejecutarlo (usa
-- "if not exists" / "or replace" donde aplica).
-- =========================================================================

-- ---------- Extensión necesaria para gen_random_uuid() ----------
create extension if not exists pgcrypto;

-- =========================================================================
-- 1) PERFILES (rol de cada usuario: cliente | administrador)
-- =========================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'cliente' check (role in ('cliente', 'administrador')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Función "security definer": consulta profiles SIN pasar por RLS (evita que
-- una política de profiles dispare a sí misma en bucle infinito al revisar el
-- rol del usuario actual). Este es el patrón recomendado por Supabase para
-- políticas de "rol de administrador".
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'administrador'
  );
$$;

-- Un usuario ve su propio perfil; un administrador ve todos (para el panel de usuarios).
drop policy if exists "profiles select" on public.profiles;
create policy "profiles select" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

-- Un usuario puede editar su propio nombre; un administrador puede editar cualquier perfil (para cambiar roles).
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update" on public.profiles
  for update using (public.is_admin());

-- Crea automáticamente el perfil (rol "cliente" por defecto) cuando alguien se registra.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================================
-- 2) PRODUCTOS (catálogo)
-- =========================================================================

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  icon text not null default '🧩',
  price numeric(10, 2) not null default 0,
  stock integer not null default 0,
  rating numeric(2, 1) not null default 5.0,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

-- Cualquiera (incluso sin sesión) puede ver el catálogo.
drop policy if exists "products select all" on public.products;
create policy "products select all" on public.products for select using (true);

-- Solo administradores pueden crear, editar o borrar productos.
drop policy if exists "products admin write" on public.products;
create policy "products admin write" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- Semilla del catálogo (101 categorías) — solo se inserta si la tabla está vacía.
insert into public.products (name, category, icon, price, stock, rating)
select * from (values
  ('Accordion', 'accordion', '🪗', 61.84, 17, 3.1),
  ('Airplanes', 'airplanes', '✈️', 23.22, 35, 4.7),
  ('Anchor', 'anchor', '⚓', 22.3, 41, 4.7),
  ('Ant', 'ant', '🐜', 48.67, 16, 4.5),
  ('Barrel', 'barrel', '🛢️', 42.28, 35, 3.9),
  ('Bass', 'bass', '🐟', 77.2, 23, 3.6),
  ('Beaver', 'beaver', '🦫', 65.48, 3, 4.6),
  ('Binocular', 'binocular', '🔭', 95.25, 24, 4.5),
  ('Bonsai', 'bonsai', '🌳', 41.01, 6, 3.7),
  ('Brain', 'brain', '🧠', 77.59, 29, 3.1),
  ('Brontosaurus', 'brontosaurus', '🧩', 91.3, 34, 3.9),
  ('Buddha', 'buddha', '🧘', 96.51, 30, 4.2),
  ('Butterfly', 'butterfly', '🦋', 21.79, 23, 3.4),
  ('Camera', 'camera', '📷', 84.7, 38, 3.1),
  ('Cannon', 'cannon', '🧩', 84.69, 41, 3.2),
  ('Car Side', 'car_side', '🚗', 24.41, 7, 5),
  ('Ceiling Fan', 'ceiling_fan', '🌀', 12.35, 34, 4.8),
  ('Cellphone', 'cellphone', '📱', 26.91, 36, 4.3),
  ('Chair', 'chair', '🪑', 74.63, 18, 4),
  ('Chandelier', 'chandelier', '💡', 14.98, 35, 3.9),
  ('Cougar Body', 'cougar_body', '🐆', 17.59, 8, 4.6),
  ('Cougar Face', 'cougar_face', '🐆', 75.65, 13, 4.6),
  ('Crab', 'crab', '🦀', 56.01, 17, 4.2),
  ('Crayfish', 'crayfish', '🦞', 82.04, 5, 3.2),
  ('Crocodile', 'crocodile', '🐊', 41.6, 40, 4.7),
  ('Crocodile Head', 'crocodile_head', '🐊', 42.61, 41, 3.5),
  ('Cup', 'cup', '☕', 22.75, 7, 4.4),
  ('Dalmatian', 'dalmatian', '🐕', 99.37, 38, 3.5),
  ('Dollar Bill', 'dollar_bill', '💵', 59.74, 43, 4.1),
  ('Dolphin', 'dolphin', '🐬', 51.14, 14, 3.2),
  ('Dragonfly', 'dragonfly', '🦟', 52.13, 17, 4.5),
  ('Electric Guitar', 'electric_guitar', '🎸', 37.16, 5, 3.5),
  ('Elephant', 'elephant', '🐘', 92.31, 19, 4.7),
  ('Emu', 'emu', '🦤', 13.36, 19, 3.7),
  ('Euphonium', 'euphonium', '🧩', 82.74, 5, 3.7),
  ('Ewer', 'ewer', '🏺', 80.16, 33, 3.5),
  ('Faces', 'faces', '🙂', 24.66, 8, 4.7),
  ('Faces Easy', 'faces_easy', '🙂', 23.37, 40, 4.3),
  ('Ferry', 'ferry', '⛴️', 66.79, 30, 4.7),
  ('Flamingo', 'flamingo', '🦩', 26.73, 8, 4.2),
  ('Flamingo Head', 'flamingo_head', '🦩', 52.09, 39, 4.1),
  ('Garfield', 'garfield', '🐱', 92.34, 24, 3.7),
  ('Gerenuk', 'gerenuk', '🧩', 90.43, 40, 3.4),
  ('Gramophone', 'gramophone', '🎶', 28.26, 21, 5),
  ('Grand Piano', 'grand_piano', '🎹', 67.32, 6, 4.4),
  ('Hawksbill', 'hawksbill', '🐢', 99.91, 16, 3.8),
  ('Headphone', 'headphone', '🎧', 64.98, 35, 4.9),
  ('Hedgehog', 'hedgehog', '🦔', 45.29, 2, 4.6),
  ('Helicopter', 'helicopter', '🚁', 57.88, 32, 4.3),
  ('Ibis', 'ibis', '🐦', 87.46, 10, 3.9),
  ('Inline Skate', 'inline_skate', '⛸️', 44.18, 5, 3.2),
  ('Joshua Tree', 'joshua_tree', '🌵', 58.8, 28, 3.8),
  ('Kangaroo', 'kangaroo', '🦘', 77.19, 30, 4.7),
  ('Ketch', 'ketch', '🧩', 14.59, 13, 4.3),
  ('Lamp', 'lamp', '💡', 20.84, 6, 4.1),
  ('Laptop', 'laptop', '💻', 93.81, 28, 3.7),
  ('Leopards', 'leopards', '🐆', 65.43, 31, 4.7),
  ('Llama', 'llama', '🦙', 67.84, 40, 3.7),
  ('Lobster', 'lobster', '🦞', 52.4, 16, 3.3),
  ('Lotus', 'lotus', '🪷', 16.44, 11, 4.3),
  ('Mandolin', 'mandolin', '🪕', 99.93, 38, 3.5),
  ('Mayfly', 'mayfly', '🧩', 63.5, 16, 3.2),
  ('Menorah', 'menorah', '🧩', 24.21, 38, 4),
  ('Metronome', 'metronome', '🧩', 16.24, 19, 4.7),
  ('Minaret', 'minaret', '🧩', 64.45, 40, 3.6),
  ('Motorbikes', 'motorbikes', '🏍️', 66.87, 34, 4.1),
  ('Nautilus', 'nautilus', '🧩', 55.17, 43, 4.5),
  ('Octopus', 'octopus', '🐙', 90.26, 26, 3.6),
  ('Okapi', 'okapi', '🧩', 45.57, 43, 3.8),
  ('Pagoda', 'pagoda', '🏯', 18.35, 22, 4.4),
  ('Panda', 'panda', '🐼', 82.37, 9, 4.2),
  ('Pigeon', 'pigeon', '🐦', 34.04, 16, 3.4),
  ('Pizza', 'pizza', '🍕', 95.91, 27, 3.5),
  ('Platypus', 'platypus', '🧩', 38.03, 38, 3.4),
  ('Pyramid', 'pyramid', '🔺', 68.02, 39, 4.5),
  ('Revolver', 'revolver', '🧩', 64.86, 22, 4.7),
  ('Rhino', 'rhino', '🦏', 76.11, 27, 3.1),
  ('Rooster', 'rooster', '🐓', 15.53, 39, 4.3),
  ('Saxophone', 'saxophone', '🎷', 38.12, 19, 4.2),
  ('Schooner', 'schooner', '⛵', 21.28, 41, 3.2),
  ('Scissors', 'scissors', '✂️', 29.54, 22, 4),
  ('Scorpion', 'scorpion', '🦂', 14.96, 25, 3.2),
  ('Sea Horse', 'sea_horse', '🌊', 95.72, 23, 4.9),
  ('Snoopy', 'snoopy', '🐶', 31.35, 22, 3.7),
  ('Soccer Ball', 'soccer_ball', '⚽', 62.13, 16, 4.8),
  ('Stapler', 'stapler', '📎', 77.69, 6, 4.9),
  ('Starfish', 'starfish', '⭐', 68.45, 34, 4.8),
  ('Stegosaurus', 'stegosaurus', '🦕', 63.03, 2, 4.2),
  ('Stop Sign', 'stop_sign', '🛑', 46.95, 5, 3.6),
  ('Strawberry', 'strawberry', '🍓', 96.46, 13, 3.2),
  ('Sunflower', 'sunflower', '🌻', 47.09, 31, 4.5),
  ('Tick', 'tick', '🧩', 57.04, 20, 4.3),
  ('Trilobite', 'trilobite', '🧩', 35.46, 28, 4.8),
  ('Umbrella', 'umbrella', '☂️', 81.07, 43, 5),
  ('Watch', 'watch', '⌚', 93.83, 42, 3.4),
  ('Water Lilly', 'water_lilly', '🪷', 69.46, 4, 3.9),
  ('Wheelchair', 'wheelchair', '♿', 74.14, 7, 3.5),
  ('Wild Cat', 'wild_cat', '🐈', 85.45, 37, 4.2),
  ('Windsor Chair', 'windsor_chair', '🪑', 97.29, 36, 4),
  ('Wrench', 'wrench', '🔧', 97.35, 2, 4),
  ('Yin Yang', 'yin_yang', '☯️', 54.41, 23, 3.7)
) as seed(name, category, icon, price, stock, rating)
where not exists (select 1 from public.products);

-- =========================================================================
-- 3) FAVORITOS
-- =========================================================================

create table if not exists public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.favorites enable row level security;

drop policy if exists "favorites own" on public.favorites;
create policy "favorites own" on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================================
-- 4) HISTORIAL DEL CHATBOT
-- =========================================================================

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Nueva conversación',
  updated_at timestamptz not null default now()
);

alter table public.conversations enable row level security;

drop policy if exists "conversations own" on public.conversations;
create policy "conversations own" on public.conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender text not null check (sender in ('user', 'bot')),
  text text,
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

drop policy if exists "messages own" on public.messages;
create policy "messages own" on public.messages
  for all using (
    exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid())
  );

-- =========================================================================
-- 5) BUCKET para imágenes que los usuarios suban en el chat (opcional)
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do nothing;

drop policy if exists "chat-images read" on storage.objects;
create policy "chat-images read" on storage.objects
  for select using (bucket_id = 'chat-images');

drop policy if exists "chat-images upload own" on storage.objects;
create policy "chat-images upload own" on storage.objects
  for insert with check (bucket_id = 'chat-images' and auth.uid() is not null);

-- =========================================================================
-- 6) BOOTSTRAP: conviértete en administrador
-- =========================================================================
-- 1. Regístrate una vez desde la app (pantalla de "Crear cuenta").
-- 2. Luego corre esto reemplazando el correo por el tuyo:
--
-- update public.profiles set role = 'administrador' where email = 'tu-correo@ejemplo.com';
--
-- Desde ahí podrás promover a otras personas directamente desde el panel
-- de administración de la app (sección "Usuarios"), sin volver a tocar SQL.
