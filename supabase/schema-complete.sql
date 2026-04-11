-- ============================================================
-- MOV - Schema COMPLETO e idempotente
-- Ejecutar TODO este archivo en Supabase > SQL Editor.
-- Puede re-ejecutarse sin problemas (usa IF NOT EXISTS, OR REPLACE, etc.)
-- Reemplaza: schema.sql + schema-v2 + schema-v3 + v3.1 + v3.2 + v3.4
-- ============================================================

-- ===================== TABLAS =================================

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

alter table public.profiles
  add column if not exists role text default 'student',
  add column if not exists professor_id uuid references public.profiles(id) on delete set null,
  add column if not exists share_code text;

-- Asegurar NOT NULL en role (si la columna ya existía sin constraint)
update public.profiles set role = 'student' where role is null;
alter table public.profiles alter column role set default 'student';
alter table public.profiles alter column role set not null;

create index if not exists idx_profiles_professor
  on public.profiles (professor_id);

-- Rutinas
create table if not exists public.routines (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null unique,
  data jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

alter table public.routines enable row level security;

-- Logs de entrenamiento
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

alter table public.workout_logs
  add column if not exists completion_order jsonb not null default '[]'::jsonb;

alter table public.workout_logs enable row level security;

create index if not exists idx_workout_logs_user_date
  on public.workout_logs (user_id, date desc);

create index if not exists idx_workout_logs_user_day
  on public.workout_logs (user_id, day_id, date desc);

-- Sesiones extra
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

create index if not exists idx_extra_sessions_user_date
  on public.extra_sessions (user_id, date desc);


-- ===================== RLS POLICIES ===========================
-- (drop + create para evitar errores si ya existen)

-- profiles
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Professors can view student profiles" on public.profiles;
create policy "Professors can view student profiles"
  on public.profiles for select using (professor_id = auth.uid());

-- Funcion auxiliar: lee professor_id del usuario actual SIN pasar por RLS
-- (evita recursion infinita en la policy de abajo)
create or replace function public.my_professor_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select professor_id from public.profiles where id = auth.uid();
$$;

alter function public.my_professor_id() owner to postgres;
grant execute on function public.my_professor_id() to authenticated;

drop policy if exists "Students can view linked professor profile" on public.profiles;
create policy "Students can view linked professor profile"
  on public.profiles for select
  using ( id = public.my_professor_id() );

-- routines
drop policy if exists "Users can view own routine" on public.routines;
create policy "Users can view own routine"
  on public.routines for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own routine" on public.routines;
create policy "Users can insert own routine"
  on public.routines for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own routine" on public.routines;
create policy "Users can update own routine"
  on public.routines for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own routine" on public.routines;
create policy "Users can delete own routine"
  on public.routines for delete using (auth.uid() = user_id);

drop policy if exists "Professors can view student routines" on public.routines;
create policy "Professors can view student routines"
  on public.routines for select
  using (exists (
    select 1 from public.profiles
    where profiles.id = routines.user_id and profiles.professor_id = auth.uid()
  ));

drop policy if exists "Professors can update student routines" on public.routines;
create policy "Professors can update student routines"
  on public.routines for update
  using (exists (
    select 1 from public.profiles
    where profiles.id = routines.user_id and profiles.professor_id = auth.uid()
  ));

drop policy if exists "Professors can insert student routines" on public.routines;
create policy "Professors can insert student routines"
  on public.routines for insert
  with check (exists (
    select 1 from public.profiles
    where profiles.id = routines.user_id and profiles.professor_id = auth.uid()
  ));

-- workout_logs
drop policy if exists "Users can view own logs" on public.workout_logs;
create policy "Users can view own logs"
  on public.workout_logs for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own logs" on public.workout_logs;
create policy "Users can insert own logs"
  on public.workout_logs for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own logs" on public.workout_logs;
create policy "Users can update own logs"
  on public.workout_logs for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own logs" on public.workout_logs;
create policy "Users can delete own logs"
  on public.workout_logs for delete using (auth.uid() = user_id);

drop policy if exists "Professors can view student logs" on public.workout_logs;
create policy "Professors can view student logs"
  on public.workout_logs for select
  using (exists (
    select 1 from public.profiles
    where profiles.id = workout_logs.user_id and profiles.professor_id = auth.uid()
  ));

-- extra_sessions
drop policy if exists "Users can view own extra sessions" on public.extra_sessions;
create policy "Users can view own extra sessions"
  on public.extra_sessions for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own extra sessions" on public.extra_sessions;
create policy "Users can insert own extra sessions"
  on public.extra_sessions for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own extra sessions" on public.extra_sessions;
create policy "Users can update own extra sessions"
  on public.extra_sessions for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own extra sessions" on public.extra_sessions;
create policy "Users can delete own extra sessions"
  on public.extra_sessions for delete using (auth.uid() = user_id);

drop policy if exists "Professors can view student extra sessions" on public.extra_sessions;
create policy "Professors can view student extra sessions"
  on public.extra_sessions for select
  using (exists (
    select 1 from public.profiles
    where profiles.id = extra_sessions.user_id and profiles.professor_id = auth.uid()
  ));


-- ===================== TRIGGER ================================

create or replace function public.handle_new_user()
returns trigger as $$
declare
  prof_id uuid;
  prof_email text;
begin
  prof_email := new.raw_user_meta_data->>'professor_email';

  if prof_email is not null and prof_email <> '' then
    select p.id into prof_id
    from public.profiles p
    join auth.users u on u.id = p.id
    where lower(trim(u.email)) = lower(trim(prof_email))
      and lower(trim(p.role)) = 'professor'
    limit 1;
  end if;

  insert into public.profiles (id, display_name, role, professor_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(nullif(trim(new.raw_user_meta_data->>'role'), ''), 'student'),
    prof_id
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ===================== RPC: VINCULAR ALUMNO ===================

create or replace function public.link_student_to_professor(
  p_professor_email text,
  p_code text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_prof_id uuid;
  v_role text;
  v_prof_role text;
  v_share text;
  v_email text := lower(trim(p_professor_email));
  v_code text := trim(p_code);
  n int;
begin
  if v_student_id is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select role into v_role from public.profiles where id = v_student_id;
  if lower(trim(coalesce(v_role, 'student'))) <> 'student' then
    return json_build_object('ok', false, 'error', 'only_students');
  end if;

  select u.id into v_prof_id
  from auth.users u
  where lower(trim(u.email)) = v_email;

  if v_prof_id is null then
    return json_build_object('ok', false, 'error', 'professor_email_not_found');
  end if;

  select p.role, p.share_code into v_prof_role, v_share
  from public.profiles p
  where p.id = v_prof_id;

  if v_prof_role is null then
    return json_build_object('ok', false, 'error', 'professor_no_profile');
  end if;

  if lower(trim(v_prof_role)) <> 'professor' then
    return json_build_object('ok', false, 'error', 'not_a_professor');
  end if;

  if v_share is null or length(trim(v_share)) = 0 then
    return json_build_object('ok', false, 'error', 'professor_code_not_set');
  end if;

  if lower(trim(v_share)) <> lower(v_code) then
    return json_build_object('ok', false, 'error', 'wrong_code');
  end if;

  if v_prof_id = v_student_id then
    return json_build_object('ok', false, 'error', 'cannot_link_self');
  end if;

  update public.profiles
  set professor_id = v_prof_id
  where id = v_student_id;

  get diagnostics n = row_count;
  if n = 0 then
    return json_build_object('ok', false, 'error', 'update_failed');
  end if;

  return json_build_object('ok', true, 'professor_id', v_prof_id);
end;
$$;

alter function public.link_student_to_professor(text, text) owner to postgres;
grant execute on function public.link_student_to_professor(text, text) to authenticated;


-- ===================== RPC: GUARDAR CODIGO ====================

create or replace function public.set_my_share_code(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := auth.uid();
  n int;
begin
  if v_id is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  update public.profiles
  set share_code = nullif(trim(p_code), '')
  where id = v_id;

  get diagnostics n = row_count;
  if n = 0 then
    return json_build_object('ok', false, 'error', 'no_profile_row');
  end if;

  return json_build_object('ok', true);
end;
$$;

alter function public.set_my_share_code(text) owner to postgres;
grant execute on function public.set_my_share_code(text) to authenticated;
