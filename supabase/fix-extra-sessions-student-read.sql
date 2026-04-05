-- ============================================================
-- FIX: Actividades extra visibles para el ALUMNO en Historial
--
-- Sintoma: la profesora ve correr/caminar en el calendario del alumno,
-- pero el alumno no las ve en Historial. Suele pasar si falta la
-- policy SELECT para el propio usuario (solo existia INSERT o policy del profesor).
--
-- Ejecutar TODO el bloque en Supabase > SQL Editor.
-- ============================================================

alter table public.extra_sessions enable row level security;

drop policy if exists "Users can view own extra sessions" on public.extra_sessions;
create policy "Users can view own extra sessions"
  on public.extra_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own extra sessions" on public.extra_sessions;
create policy "Users can insert own extra sessions"
  on public.extra_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own extra sessions" on public.extra_sessions;
create policy "Users can update own extra sessions"
  on public.extra_sessions for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own extra sessions" on public.extra_sessions;
create policy "Users can delete own extra sessions"
  on public.extra_sessions for delete
  using (auth.uid() = user_id);

-- Profesor vinculado sigue pudiendo leer (policy separada; no tocar si ya existe)
-- Si no existe, descomenta:
-- create policy "Professors can view student extra sessions"
--   on public.extra_sessions for select
--   using (
--     exists (
--       select 1 from public.profiles
--       where profiles.id = extra_sessions.user_id
--         and profiles.professor_id = auth.uid()
--     )
--   );

grant select, insert, update, delete on public.extra_sessions to authenticated;
