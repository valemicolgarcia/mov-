-- ============================================
-- MOV - Schema SQL para Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================

-- 1. Tabla de perfiles (se crea automaticamente al registrarse)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Trigger: crear perfil automaticamente al registrarse
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Tabla de rutinas (una por usuario, almacena JSON completo)
create table if not exists public.routines (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null unique,
  data jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

alter table public.routines enable row level security;

create policy "Users can view own routine"
  on public.routines for select
  using (auth.uid() = user_id);

create policy "Users can insert own routine"
  on public.routines for insert
  with check (auth.uid() = user_id);

create policy "Users can update own routine"
  on public.routines for update
  using (auth.uid() = user_id);

create policy "Users can delete own routine"
  on public.routines for delete
  using (auth.uid() = user_id);

-- 3. Tabla de logs de entrenamiento
create table if not exists public.workout_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  day_id text not null,
  date date not null default current_date,
  exercises jsonb not null default '{}'::jsonb,
  completed boolean default false,
  created_at timestamptz default now(),
  unique(user_id, day_id, date)
);

alter table public.workout_logs enable row level security;

create policy "Users can view own logs"
  on public.workout_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own logs"
  on public.workout_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own logs"
  on public.workout_logs for update
  using (auth.uid() = user_id);

create policy "Users can delete own logs"
  on public.workout_logs for delete
  using (auth.uid() = user_id);

-- Indice para consultas frecuentes
create index if not exists idx_workout_logs_user_date
  on public.workout_logs (user_id, date desc);

create index if not exists idx_workout_logs_user_day
  on public.workout_logs (user_id, day_id, date desc);

-- Migraciones adicionales: ejecutar tambien schema-v2.sql y schema-v3.sql en el SQL Editor.
