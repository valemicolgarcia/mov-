-- Guardar codigo de profesor aunque falle el UPDATE por RLS (respaldo)
-- Requiere columna share_code (schema-v3.sql). Ejecutar en SQL Editor.

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

grant execute on function public.set_my_share_code(text) to authenticated;
