create schema if not exists private;
grant usage on schema private to anon, authenticated;

alter function public.app_role() set schema private;
alter function public.my_doctor_id() set schema private;
alter function public.my_patient_id() set schema private;

grant execute on function private.app_role() to anon, authenticated;
grant execute on function private.my_doctor_id() to anon, authenticated;
grant execute on function private.my_patient_id() to anon, authenticated;
