create extension if not exists "pgcrypto";

create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  direccion text not null default '',
  telefono text not null default '',
  email text not null default '',
  apertura text not null default '08:00',
  cierre text not null default '18:00'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  clinic_id uuid references public.clinics(id),
  role text not null default 'patient' check (role in ('admin','doctor','patient')),
  nombre text not null default '',
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id),
  nombre text not null,
  duracion int not null check (duracion > 0),
  precio numeric(10,2) not null check (precio >= 0),
  descripcion text not null default '',
  icono text not null default ''
);

create table public.doctors (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id),
  user_id uuid unique references auth.users(id) on delete set null,
  nombre text not null,
  especialidad_id uuid references public.services(id) on delete set null,
  foto text not null default '',
  horario jsonb not null default '{"days":[1,2,3,4,5],"start":"09:00","end":"17:00"}',
  activo boolean not null default true,
  bio text not null default '',
  color text not null default ''
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id),
  user_id uuid unique references auth.users(id) on delete set null,
  nombre text not null,
  telefono text not null default '',
  email text not null default '',
  nacimiento date,
  created_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id),
  paciente_id uuid not null references public.patients(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id),
  servicio_id uuid not null references public.services(id),
  fecha date not null,
  hora text not null,
  duracion int not null check (duracion > 0),
  estado text not null default 'scheduled'
    check (estado in ('scheduled','confirmed','in_progress','completed','cancelled','no_show')),
  motivo text not null default '',
  notas text not null default '',
  created_at timestamptz not null default now()
);

create unique index appointments_no_double_booking
  on public.appointments (doctor_id, fecha, hora)
  where estado not in ('cancelled','no_show');

create table public.appointment_events (
  id uuid primary key default gen_random_uuid(),
  cita_id uuid not null references public.appointments(id) on delete cascade,
  tipo text not null,
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  cita_id uuid not null references public.appointments(id) on delete cascade,
  paciente_id uuid not null references public.patients(id),
  monto numeric(10,2) not null check (monto >= 0),
  estado text not null default 'pending' check (estado in ('pending','paid','cancelled')),
  metodo text check (metodo in ('efectivo','tarjeta','transferencia')),
  fecha_pago timestamptz,
  fecha date not null default current_date,
  notas text not null default ''
);

create index on public.appointments (fecha);
create index on public.appointments (doctor_id, fecha);
create index on public.appointments (paciente_id);
create index on public.appointments (clinic_id);
create index on public.appointment_events (cita_id);
create index on public.invoices (cita_id);
create index on public.invoices (paciente_id);
create index on public.doctors (clinic_id);
create index on public.doctors (especialidad_id);
create index on public.patients (clinic_id);
create index on public.services (clinic_id);
create index on public.appointments (servicio_id);
create index on public.profiles (clinic_id);

create function public.app_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = (select auth.uid())
$$;

create function public.my_doctor_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.doctors where user_id = (select auth.uid())
$$;

create function public.my_patient_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.patients where user_id = (select auth.uid())
$$;

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, clinic_id, role, nombre)
  values (
    new.id,
    (select id from public.clinics order by nombre limit 1),
    'patient',
    coalesce(new.raw_user_meta_data->>'nombre', '')
  );
  return new;
end $$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.clinics            enable row level security;
alter table public.profiles           enable row level security;
alter table public.services           enable row level security;
alter table public.doctors            enable row level security;
alter table public.patients           enable row level security;
alter table public.appointments       enable row level security;
alter table public.appointment_events enable row level security;
alter table public.invoices           enable row level security;

create policy clinics_read   on public.clinics  for select using (true);
create policy clinics_admin  on public.clinics  for all using (app_role() = 'admin') with check (app_role() = 'admin');
create policy services_read  on public.services for select using (true);
create policy services_admin on public.services for all using (app_role() = 'admin') with check (app_role() = 'admin');
create policy doctors_read   on public.doctors  for select using (true);
create policy doctors_admin  on public.doctors  for all using (app_role() = 'admin') with check (app_role() = 'admin');

create policy profiles_self  on public.profiles for select using (id = (select auth.uid()));
create policy profiles_admin on public.profiles for all using (app_role() = 'admin') with check (app_role() = 'admin');

create policy patients_admin  on public.patients for all using (app_role() = 'admin') with check (app_role() = 'admin');
create policy patients_self   on public.patients for select using (user_id = (select auth.uid()));
create policy patients_self_u on public.patients for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy patients_self_i on public.patients for insert with check (user_id = (select auth.uid()));
create policy patients_doctor on public.patients for select using (
  exists (select 1 from public.appointments a
          where a.paciente_id = patients.id and a.doctor_id = my_doctor_id())
);

create policy appts_admin    on public.appointments for all using (app_role() = 'admin') with check (app_role() = 'admin');
create policy appts_doctor_r on public.appointments for select using (doctor_id = my_doctor_id());
create policy appts_doctor_u on public.appointments for update using (doctor_id = my_doctor_id()) with check (doctor_id = my_doctor_id());
create policy appts_patient_r on public.appointments for select using (paciente_id = my_patient_id());
create policy appts_patient_i on public.appointments for insert with check (paciente_id = my_patient_id());
create policy appts_patient_u on public.appointments for update
  using (paciente_id = my_patient_id())
  with check (paciente_id = my_patient_id() and estado = 'cancelled');

create policy events_admin  on public.appointment_events for all using (app_role() = 'admin') with check (app_role() = 'admin');
create policy events_read   on public.appointment_events for select using (
  exists (select 1 from public.appointments a where a.id = cita_id)
);
create policy events_insert on public.appointment_events for insert with check (
  exists (select 1 from public.appointments a where a.id = cita_id)
);

create policy invoices_admin    on public.invoices for all using (app_role() = 'admin') with check (app_role() = 'admin');
create policy invoices_patient  on public.invoices for select using (paciente_id = my_patient_id());
create policy invoices_doctor_r on public.invoices for select using (
  exists (select 1 from public.appointments a where a.id = cita_id and a.doctor_id = my_doctor_id())
);
create policy invoices_doctor_i on public.invoices for insert with check (
  exists (select 1 from public.appointments a where a.id = cita_id and a.doctor_id = my_doctor_id())
);

insert into public.clinics (nombre) values ('FISIOKIDS');
