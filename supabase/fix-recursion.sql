-- ============================================================
-- FIX URGENTE: Recursion infinita en RLS de profiles
-- La policy "Students can view linked professor profile"
-- hace un subquery sobre profiles, lo que causa recursion.
-- Solucion: funcion SECURITY DEFINER que lee sin pasar por RLS.
-- Ejecutar COMPLETO en Supabase > SQL Editor.
-- ============================================================

-- 1. Eliminar la policy rota
drop policy if exists "Students can view linked professor profile" on public.profiles;

-- 2. Funcion auxiliar que lee professor_id SIN pasar por RLS
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

-- 3. Recrear la policy usando la funcion (sin recursion)
create policy "Students can view linked professor profile"
  on public.profiles for select
  using ( id = public.my_professor_id() );
