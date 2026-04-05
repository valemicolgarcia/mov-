-- Correccion: vinculacion alumno-profesor mas tolerante (rol y codigo)
-- Ejecutar en Supabase SQL Editor si falla "usuario o codigo incorrectos" con datos bien puestos

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
begin
  if v_student_id is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select role into v_role from public.profiles where id = v_student_id;
  if lower(trim(coalesce(v_role, 'student'))) <> 'student' then
    return json_build_object('ok', false, 'error', 'only_students');
  end if;

  select p.id into v_prof_id
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(trim(p.role)) = 'professor'
    and lower(trim(u.email)) = lower(trim(p_professor_email))
    and p.share_code is not null
    and length(trim(p.share_code)) > 0
    and lower(trim(p.share_code)) = lower(trim(p_code));

  if v_prof_id is null then
    return json_build_object('ok', false, 'error', 'invalid_credentials');
  end if;

  if v_prof_id = v_student_id then
    return json_build_object('ok', false, 'error', 'cannot_link_self');
  end if;

  update public.profiles
  set professor_id = v_prof_id
  where id = v_student_id;

  return json_build_object('ok', true, 'professor_id', v_prof_id);
end;
$$;

grant execute on function public.link_student_to_professor(text, text) to authenticated;
