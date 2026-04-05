-- ============================================
-- MOV - Schema V2: Sistema Profesor-Alumno
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- DESPUÉS de haber ejecutado schema.sql
-- ============================================

-- 1. Agregar columnas de rol a profiles
alter table public.profiles
  add column if not exists role text not null default 'student',
  add column if not exists professor_id uuid references public.profiles(id) on delete set null;

create index if not exists idx_profiles_professor
  on public.profiles (professor_id);

-- 2. Permitir que profesores lean perfiles de sus alumnos
create policy "Professors can view student profiles"
  on public.profiles for select
  using (professor_id = auth.uid());

-- 3. Permitir que profesores lean rutinas de sus alumnos
create policy "Professors can view student routines"
  on public.routines for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = routines.user_id
        and profiles.professor_id = auth.uid()
    )
  );

-- 4. Permitir que profesores editen rutinas de sus alumnos
create policy "Professors can update student routines"
  on public.routines for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = routines.user_id
        and profiles.professor_id = auth.uid()
    )
  );

-- 5. Permitir que profesores inserten rutinas para sus alumnos
create policy "Professors can insert student routines"
  on public.routines for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = routines.user_id
        and profiles.professor_id = auth.uid()
    )
  );

-- 6. Permitir que profesores lean logs de sus alumnos
create policy "Professors can view student logs"
  on public.workout_logs for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = workout_logs.user_id
        and profiles.professor_id = auth.uid()
    )
  );

-- 7. Tabla de sesiones extra (correr, caminar, etc.)
create table if not exists public.extra_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null default current_date,
  activity_type text not null,
  duration_minutes integer,
  notes text,
  metrics jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.extra_sessions enable row level security;

create policy "Users can view own extra sessions"
  on public.extra_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own extra sessions"
  on public.extra_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own extra sessions"
  on public.extra_sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete own extra sessions"
  on public.extra_sessions for delete
  using (auth.uid() = user_id);

create policy "Professors can view student extra sessions"
  on public.extra_sessions for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = extra_sessions.user_id
        and profiles.professor_id = auth.uid()
    )
  );

create index if not exists idx_extra_sessions_user_date
  on public.extra_sessions (user_id, date desc);

-- 8. Actualizar trigger para guardar role y professor_id
create or replace function public.handle_new_user()
returns trigger as $$
declare
  prof_id uuid;
  prof_email text;
begin
  prof_email := new.raw_user_meta_data->>'professor_email';

  if prof_email is not null and prof_email != '' then
    select p.id into prof_id
    from public.profiles p
    join auth.users u on u.id = p.id
    where u.email = prof_email and p.role = 'professor'
    limit 1;
  end if;

  insert into public.profiles (id, display_name, role, professor_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    prof_id
  );
  return new;
end;
$$ language plpgsql security definer;
