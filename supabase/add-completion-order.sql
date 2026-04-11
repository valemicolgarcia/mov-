-- Orden de finalización de series para comprobante e historial (ejecutar en SQL Editor si ya tienes la BD)
alter table public.workout_logs
  add column if not exists completion_order jsonb not null default '[]'::jsonb;

comment on column public.workout_logs.completion_order is
  'Lista de claves "exerciseId:setIndex" en orden de completado (cronológico).';
