-- 1. Permitir que el doctor actualice facturas de sus propias citas (al cobrar o registrar adelanto)
create policy invoices_doctor_u on public.invoices
  for update
  using (
    exists (
      select 1 from public.appointments a
      where a.id = cita_id and a.doctor_id = private.my_doctor_id()
    )
  )
  with check (
    exists (
      select 1 from public.appointments a
      where a.id = cita_id and a.doctor_id = private.my_doctor_id()
    )
  );

-- 2. Permitir que el paciente reagende (scheduled) ademas de cancelar (cancelled) sus propias citas
alter policy appts_patient_u on public.appointments
  using (paciente_id = private.my_patient_id())
  with check (
    paciente_id = private.my_patient_id()
    and estado in ('scheduled', 'cancelled')
  );

-- 3. Permitir lectura de citas para calculo de disponibilidad de horarios en /booking
create policy appts_slots_read on public.appointments
  for select
  to anon, authenticated
  using (true);

-- 4. RPC para agendamiento publico (/booking) con o sin sesion iniciada
create or replace function public.book_public_appointment(
  p_nombre text,
  p_telefono text,
  p_email text,
  p_nacimiento date,
  p_doctor_id uuid,
  p_servicio_id uuid,
  p_fecha date,
  p_hora text,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _clinic_id uuid;
  _patient_id uuid;
  _duracion int;
  _appt_id uuid;
  _uid uuid := auth.uid();
begin
  select clinic_id, duracion into _clinic_id, _duracion
  from public.services
  where id = p_servicio_id;

  if _clinic_id is null then
    return jsonb_build_object('ok', false, 'error', 'Servicio no encontrado');
  end if;

  if _uid is not null then
    select id into _patient_id from public.patients where user_id = _uid limit 1;
  end if;

  if _patient_id is null then
    select id into _patient_id
    from public.patients
    where clinic_id = _clinic_id and telefono = trim(p_telefono)
    limit 1;
  end if;

  if _patient_id is null then
    insert into public.patients (clinic_id, user_id, nombre, telefono, email, nacimiento)
    values (
      _clinic_id,
      case when _uid is not null and not exists (select 1 from public.patients where user_id = _uid) then _uid else null end,
      trim(p_nombre),
      trim(p_telefono),
      trim(p_email),
      coalesce(p_nacimiento, '1990-01-01'::date)
    )
    returning id into _patient_id;
  end if;

  insert into public.appointments (
    clinic_id, paciente_id, doctor_id, servicio_id, fecha, hora, duracion, estado, motivo, notas
  ) values (
    _clinic_id, _patient_id, p_doctor_id, p_servicio_id, p_fecha, p_hora, _duracion, 'scheduled', trim(p_motivo), ''
  )
  returning id into _appt_id;

  insert into public.appointment_events (cita_id, tipo)
  values (_appt_id, 'created');

  return jsonb_build_object('ok', true, 'id', _appt_id, 'paciente_id', _patient_id);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'Horario no disponible');
  when others then
    return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$$;

grant execute on function public.book_public_appointment(text, text, text, date, uuid, uuid, date, text, text) to anon, authenticated;
