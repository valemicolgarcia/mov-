-- Ejecutar una vez si hay cuentas sin role (vinculacion o permisos raros)
update public.profiles
set role = 'student'
where role is null;
