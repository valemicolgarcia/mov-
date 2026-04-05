-- ============================================
-- FIX: Vinculacion profesor-alumno (RLS + funcion clara)
-- La funcion corre como postgres y puede leer auth.users + profiles.
-- Ejecutar TODO el bloque en Supabase SQL Editor.
-- ============================================

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
