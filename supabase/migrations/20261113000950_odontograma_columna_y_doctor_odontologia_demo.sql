-- 1. Agregar columna odontograma (JSONB) a public.appointments
alter table public.appointments
  add column if not exists odontograma jsonb not null default '{}'::jsonb;

-- 2. Poblar odontograma de ejemplo en la cita odontologica completada (Pieza 36 con resina oclusal y pieza 16 con caries)
update public.appointments
set odontograma = '{
  "denticion": "adult",
  "teeth": {
    "36": {
      "surfaces": { "O": "resina_buena", "M": "resina_buena" },
      "whole": "none",
      "notes": "Caries en molar 36 (O-M). Se realizo restauracion con resina fotocurada A2. Control en 6 meses."
    },
    "16": {
      "surfaces": { "O": "caries" },
      "whole": "none",
      "notes": "Caries oclusal incipiente pendiente de restauracion en siguiente sesion."
    },
    "18": {
      "surfaces": {},
      "whole": "ausente",
      "notes": "Tercer molar ausente."
    }
  },
  "observaciones": "Higiene oral regular. Se recomienda profilaxis y restauracion de pieza 1.6."
}'::jsonb
where id = 'e0000000-0000-4000-8000-000000000007';

-- 3. Crear usuario demo para el Odontologo Dr. Carlos Herrera (carlos@medios.demo / demo1234)
do $$
declare
  _carlos_id uuid := '11111111-1111-4111-8111-111111111104';
  _pw_hash   text := extensions.crypt('demo1234', extensions.gen_salt('bf'));
  _clinic_id uuid;
begin
  select id into _clinic_id from public.clinics order by nombre limit 1;

  if not exists (select 1 from auth.users where email = 'carlos@medios.demo') then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token, is_sso_user, is_anonymous
    ) values (
      '00000000-0000-0000-0000-000000000000', _carlos_id, 'authenticated', 'authenticated',
      'carlos@medios.demo', _pw_hash, now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"doctor","nombre":"Dr. Carlos Herrera","invite":"doctor","invite_id":"c0000000-0000-4000-8000-000000000002"}'::jsonb,
      now(), now(), '', '', '', '', false, false
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), _carlos_id, _carlos_id::text,
      jsonb_build_object('sub', _carlos_id::text, 'email', 'carlos@medios.demo', 'email_verified', true, 'phone_verified', false),
      'email', now(), now(), now()
    );
  end if;

  update public.doctors
     set user_id = _carlos_id
   where id = 'c0000000-0000-4000-8000-000000000002';

  if _clinic_id is not null then
    insert into public.profiles (id, clinic_id, role, nombre)
    values (_carlos_id, _clinic_id, 'doctor', 'Dr. Carlos Herrera')
    on conflict (id) do update
      set clinic_id = excluded.clinic_id,
          role      = 'doctor',
          nombre    = 'Dr. Carlos Herrera';
  end if;
end $$;

-- 4. Crear una cita odontologica en curso hoy para el Dr. Carlos Herrera para pruebas inmediatas
insert into public.appointments (
  id, clinic_id, paciente_id, doctor_id, servicio_id, fecha, hora, duracion, estado, motivo, notas, odontograma
) values (
  'e0000000-0000-4000-8000-000000000011',
  (select id from public.clinics order by nombre limit 1),
  'd0000000-0000-4000-8000-000000000003',
  'c0000000-0000-4000-8000-000000000002',
  'b0000000-0000-4000-8000-000000000002',
  current_date,
  '11:30',
  45,
  'in_progress',
  'Evaluacion odontologica integral, sensibilidad en molar inferior y limpieza',
  'Paciente refiere sensibilidad al frio en cuadrante inferior izquierdo.',
  '{
    "denticion": "adult",
    "teeth": {
      "36": {
        "surfaces": { "O": "caries", "D": "caries" },
        "whole": "none",
        "notes": "Lesion cariosa ocluso-distal profunda sin compromiso pulpar."
      },
      "26": {
        "surfaces": { "O": "resina_buena" },
        "whole": "none",
        "notes": "Restauracion previa en buen estado."
      },
      "11": {
        "surfaces": {},
        "whole": "corona_buena",
        "notes": "Corona ceramica en buen estado."
      },
      "46": {
        "surfaces": { "O": "resina_mala" },
        "whole": "endodoncia_buena",
        "notes": "Endodoncia previa asintomatica; obturacion oclusal filtrada para recambio."
      }
    },
    "observaciones": "Evaluacion inicial con odontograma MINSA."
  }'::jsonb
)
on conflict (id) do nothing;

insert into public.appointment_events (id, cita_id, tipo)
values
  ('a1000000-0000-4000-8000-000000000024', 'e0000000-0000-4000-8000-000000000011', 'created'),
  ('a1000000-0000-4000-8000-000000000025', 'e0000000-0000-4000-8000-000000000011', 'confirmed'),
  ('a1000000-0000-4000-8000-000000000026', 'e0000000-0000-4000-8000-000000000011', 'in_progress')
on conflict (id) do nothing;
