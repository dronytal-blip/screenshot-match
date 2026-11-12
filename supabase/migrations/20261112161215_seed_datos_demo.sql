-- ============================================================
-- Seed de datos demo (Fase 2.2)
-- Adaptado al schema remoto: doctors.horario, appointment_events.cita_id/created_at,
-- invoices sin clinic_id. IDs fijos + ON CONFLICT para que sea re-ejecutable.
-- Fechas fijas alrededor del 2026-11-12 (jueves), respetando dias laborales de cada doctor.
-- ============================================================

-- Clinica existente (creada en 20261105133131): completar datos de contacto
update public.clinics
set direccion = 'Cusco - Cusco / Peru',
    telefono  = '+51 00000000',
    email     = 'hola@mediosdemo.mx',
    apertura  = '09:00',
    cierre    = '19:00'
where id = (select id from public.clinics order by nombre limit 1);

-- id de la clinica para los inserts siguientes (no se hardcodea el UUID generado)
select set_config('seed.clinic_id', (select id::text from public.clinics order by nombre limit 1), false);

-- Servicios (5)
insert into public.services (id, clinic_id, nombre, duracion, precio, descripcion, icono) values
  ('b0000000-0000-4000-8000-000000000001', current_setting('seed.clinic_id')::uuid, 'Medicina General', 30,  800, 'Consulta integral, diagnostico y seguimiento.',  'Stethoscope'),
  ('b0000000-0000-4000-8000-000000000002', current_setting('seed.clinic_id')::uuid, 'Odontologia',      45, 1200, 'Limpiezas, revisiones y tratamientos dentales.', 'SmilePlus'),
  ('b0000000-0000-4000-8000-000000000003', current_setting('seed.clinic_id')::uuid, 'Pediatria',        30,  900, 'Cuidado y control del nino sano.',               'Baby'),
  ('b0000000-0000-4000-8000-000000000004', current_setting('seed.clinic_id')::uuid, 'Dermatologia',     30, 1000, 'Salud de piel, cabello y unas.',                 'Scan'),
  ('b0000000-0000-4000-8000-000000000005', current_setting('seed.clinic_id')::uuid, 'Nutricion',        45,  700, 'Planes de alimentacion personalizados.',         'Apple')
on conflict (id) do nothing;

-- Doctores (4)
insert into public.doctors (id, clinic_id, nombre, especialidad_id, foto, horario, activo, bio, color) values
  ('c0000000-0000-4000-8000-000000000001', current_setting('seed.clinic_id')::uuid, 'Dra. Sofia Martinez', 'b0000000-0000-4000-8000-000000000001',
   'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&q=80&auto=format&fit=crop',
   '{"days":[1,2,3,4,5],"start":"09:00","end":"17:00"}', true, '15 anos de experiencia en medicina familiar.', 'oklch(0.546 0.215 262.9)'),
  ('c0000000-0000-4000-8000-000000000002', current_setting('seed.clinic_id')::uuid, 'Dr. Carlos Herrera', 'b0000000-0000-4000-8000-000000000002',
   'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&q=80&auto=format&fit=crop',
   '{"days":[1,2,3,4,5],"start":"10:00","end":"18:00"}', true, 'Especialista en odontologia estetica.', 'oklch(0.65 0.17 160)'),
  ('c0000000-0000-4000-8000-000000000003', current_setting('seed.clinic_id')::uuid, 'Dra. Ana Lopez', 'b0000000-0000-4000-8000-000000000003',
   'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=600&q=80&auto=format&fit=crop',
   '{"days":[1,3,4],"start":"09:00","end":"14:00"}', true, 'Pediatra certificada, amante de los ninos.', 'oklch(0.7 0.16 60)'),
  ('c0000000-0000-4000-8000-000000000004', current_setting('seed.clinic_id')::uuid, 'Dr. Roberto Diaz', 'b0000000-0000-4000-8000-000000000004',
   'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600&q=80&auto=format&fit=crop',
   '{"days":[2,4,5],"start":"11:00","end":"19:00"}', true, 'Dermatologia clinica y cosmetica.', 'oklch(0.58 0.2 330)')
on conflict (id) do nothing;

-- Pacientes (5)
insert into public.patients (id, clinic_id, nombre, telefono, email, nacimiento, created_at) values
  ('d0000000-0000-4000-8000-000000000001', current_setting('seed.clinic_id')::uuid, 'Maria Garcia',   '5512345001', 'maria@mail.com',      '1991-03-12', '2026-09-13 10:00-05'),
  ('d0000000-0000-4000-8000-000000000002', current_setting('seed.clinic_id')::uuid, 'Juan Rodriguez', '5512345002', 'juan@mail.com',       '1998-07-02', '2026-10-13 10:00-05'),
  ('d0000000-0000-4000-8000-000000000003', current_setting('seed.clinic_id')::uuid, 'Laura Sanchez',  '5512345003', 'laura@mail.com',      '1984-01-20', '2026-10-23 10:00-05'),
  ('d0000000-0000-4000-8000-000000000004', current_setting('seed.clinic_id')::uuid, 'Pedro Gonzalez', '5512345004', 'pedro@mail.com',      '1971-02-05', '2026-11-02 10:00-05'),
  ('d0000000-0000-4000-8000-000000000005', current_setting('seed.clinic_id')::uuid, 'Ana Torres',     '5512345005', 'ana.torres@mail.com', '2018-05-15', '2026-11-04 10:00-05')
on conflict (id) do nothing;

-- Citas (10): 2 agendadas, 2 confirmadas, 1 en curso, 3 completadas, 1 no-show, 1 cancelada
insert into public.appointments (id, clinic_id, paciente_id, doctor_id, servicio_id, fecha, hora, duracion, estado, motivo, notas, created_at) values
  -- Agendadas (futuras)
  ('e0000000-0000-4000-8000-000000000001', current_setting('seed.clinic_id')::uuid, 'd0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   '2026-11-13', '10:00', 30, 'scheduled', 'Dolor de garganta persistente', '', '2026-11-11 09:00-05'),
  ('e0000000-0000-4000-8000-000000000002', current_setting('seed.clinic_id')::uuid, 'd0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000004',
   '2026-11-17', '12:00', 30, 'scheduled', 'Revision de lunar', '', '2026-11-11 09:30-05'),
  -- Confirmadas (hoy)
  ('e0000000-0000-4000-8000-000000000003', current_setting('seed.clinic_id')::uuid, 'd0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   '2026-11-12', '14:00', 30, 'confirmed', 'Control de presion arterial', '', '2026-11-10 09:00-05'),
  ('e0000000-0000-4000-8000-000000000004', current_setting('seed.clinic_id')::uuid, 'd0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   '2026-11-12', '15:00', 30, 'confirmed', 'Fiebre y tos', '', '2026-11-10 10:00-05'),
  -- En curso (hoy)
  ('e0000000-0000-4000-8000-000000000005', current_setting('seed.clinic_id')::uuid, 'd0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   '2026-11-12', '11:00', 30, 'in_progress', 'Seguimiento de resultados de laboratorio', '', '2026-11-10 11:00-05'),
  -- Completadas
  ('e0000000-0000-4000-8000-000000000006', current_setting('seed.clinic_id')::uuid, 'd0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   '2026-11-05', '09:30', 30, 'completed', 'Chequeo general', 'Paciente estable. TA 120/80. Se solicitan estudios de laboratorio de rutina.', '2026-11-02 09:00-05'),
  ('e0000000-0000-4000-8000-000000000007', current_setting('seed.clinic_id')::uuid, 'd0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002',
   '2026-11-09', '12:00', 45, 'completed', 'Dolor de muela', 'Caries en molar 36. Se realizo resina. Control en 6 meses.', '2026-11-07 09:00-05'),
  ('e0000000-0000-4000-8000-000000000008', current_setting('seed.clinic_id')::uuid, 'd0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003',
   '2026-11-09', '11:00', 30, 'completed', 'Vacunacion', 'Aplicada vacuna de refuerzo. Sin reacciones.', '2026-11-05 09:00-05'),
  -- No asistio
  ('e0000000-0000-4000-8000-000000000009', current_setting('seed.clinic_id')::uuid, 'd0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003',
   '2026-11-11', '10:00', 30, 'no_show', 'Consulta de control', '', '2026-11-08 09:00-05'),
  -- Cancelada
  ('e0000000-0000-4000-8000-000000000010', current_setting('seed.clinic_id')::uuid, 'd0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000004',
   '2026-11-06', '13:00', 30, 'cancelled', 'Acne', '', '2026-11-02 09:00-05')
on conflict (id) do nothing;

-- Historial de eventos (23)
insert into public.appointment_events (id, cita_id, tipo, created_at) values
  ('a1000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'created',     '2026-11-11 09:00-05'),
  ('a1000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000002', 'created',     '2026-11-11 09:30-05'),
  ('a1000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000003', 'created',     '2026-11-10 09:00-05'),
  ('a1000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000003', 'confirmed',   '2026-11-11 11:00-05'),
  ('a1000000-0000-4000-8000-000000000005', 'e0000000-0000-4000-8000-000000000004', 'created',     '2026-11-10 10:00-05'),
  ('a1000000-0000-4000-8000-000000000006', 'e0000000-0000-4000-8000-000000000004', 'confirmed',   '2026-11-11 12:00-05'),
  ('a1000000-0000-4000-8000-000000000007', 'e0000000-0000-4000-8000-000000000005', 'created',     '2026-11-10 11:00-05'),
  ('a1000000-0000-4000-8000-000000000008', 'e0000000-0000-4000-8000-000000000005', 'confirmed',   '2026-11-11 10:00-05'),
  ('a1000000-0000-4000-8000-000000000009', 'e0000000-0000-4000-8000-000000000005', 'in_progress', '2026-11-12 11:00-05'),
  ('a1000000-0000-4000-8000-000000000010', 'e0000000-0000-4000-8000-000000000006', 'created',     '2026-11-02 09:00-05'),
  ('a1000000-0000-4000-8000-000000000011', 'e0000000-0000-4000-8000-000000000006', 'confirmed',   '2026-11-04 09:00-05'),
  ('a1000000-0000-4000-8000-000000000012', 'e0000000-0000-4000-8000-000000000006', 'in_progress', '2026-11-05 09:30-05'),
  ('a1000000-0000-4000-8000-000000000013', 'e0000000-0000-4000-8000-000000000006', 'completed',   '2026-11-05 10:00-05'),
  ('a1000000-0000-4000-8000-000000000014', 'e0000000-0000-4000-8000-000000000007', 'created',     '2026-11-07 09:00-05'),
  ('a1000000-0000-4000-8000-000000000015', 'e0000000-0000-4000-8000-000000000007', 'confirmed',   '2026-11-08 09:00-05'),
  ('a1000000-0000-4000-8000-000000000016', 'e0000000-0000-4000-8000-000000000007', 'in_progress', '2026-11-09 12:00-05'),
  ('a1000000-0000-4000-8000-000000000017', 'e0000000-0000-4000-8000-000000000007', 'completed',   '2026-11-09 12:45-05'),
  ('a1000000-0000-4000-8000-000000000018', 'e0000000-0000-4000-8000-000000000008', 'created',     '2026-11-05 09:00-05'),
  ('a1000000-0000-4000-8000-000000000019', 'e0000000-0000-4000-8000-000000000008', 'completed',   '2026-11-09 11:30-05'),
  ('a1000000-0000-4000-8000-000000000020', 'e0000000-0000-4000-8000-000000000009', 'created',     '2026-11-08 09:00-05'),
  ('a1000000-0000-4000-8000-000000000021', 'e0000000-0000-4000-8000-000000000009', 'no_show',     '2026-11-11 10:20-05'),
  ('a1000000-0000-4000-8000-000000000022', 'e0000000-0000-4000-8000-000000000010', 'created',     '2026-11-02 09:00-05'),
  ('a1000000-0000-4000-8000-000000000023', 'e0000000-0000-4000-8000-000000000010', 'cancelled',   '2026-11-05 09:00-05')
on conflict (id) do nothing;

-- Cobros (3): 2 pagados, 1 pendiente
insert into public.invoices (id, cita_id, paciente_id, monto, estado, metodo, fecha_pago, fecha, notas) values
  ('f0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000001',  800, 'paid',    'efectivo', '2026-11-05 10:05-05', '2026-11-05', ''),
  ('f0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000002', 1200, 'paid',    'tarjeta',  '2026-11-09 12:50-05', '2026-11-09', ''),
  ('f0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-000000000005',  900, 'pending', null,       null,                  '2026-11-09', '')
on conflict (id) do nothing;
