-- ============================================================
-- Fase 2.3: Trigger handle_new_user mejorado (invites + rol + vinculo)
-- y creacion de los 3 usuarios demo (admin, sofia, maria)
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _role        text;
  _nombre      text;
  _telefono    text;
  _clinic_id   uuid;
  _invite_type text;
  _invite_id   uuid;
begin
  _role        := coalesce(new.raw_user_meta_data->>'role', 'patient');
  if _role not in ('admin', 'doctor', 'patient') then
    _role := 'patient';
  end if;

  _nombre      := coalesce(
    nullif(trim(new.raw_user_meta_data->>'nombre'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );
  _telefono    := coalesce(new.raw_user_meta_data->>'telefono', '');
  _invite_type := coalesce(new.raw_user_meta_data->>'invite', new.raw_user_meta_data->>'invite_type');

  begin
    _invite_id := nullif(coalesce(new.raw_user_meta_data->>'invite_id', new.raw_user_meta_data->>'record_id'), '')::uuid;
  exception when others then
    _invite_id := null;
  end;

  -- 1. Invitacion de doctor
  if _invite_type = 'doctor' and _invite_id is not null then
    update public.doctors
       set user_id = new.id
     where id = _invite_id
    returning clinic_id, nombre into _clinic_id, _nombre;
    _role := 'doctor';

  -- 2. Invitacion de paciente
  elsif _invite_type = 'patient' and _invite_id is not null then
    update public.patients
       set user_id = new.id
     where id = _invite_id
    returning clinic_id, nombre into _clinic_id, _nombre;
    _role := 'patient';
  end if;

  -- Fallback clinic_id: primera clinica disponible
  if _clinic_id is null then
    select id into _clinic_id from public.clinics order by nombre limit 1;
  end if;

  -- Si es paciente sin invite, vincular por email si existe o crear registro en patients
  if _role = 'patient' and not exists (select 1 from public.patients where user_id = new.id) then
    update public.patients
       set user_id = new.id
     where id = (
       select id from public.patients
        where lower(email) = lower(coalesce(new.email, ''))
          and user_id is null
        limit 1
     );

    if not found and _clinic_id is not null then
      insert into public.patients (clinic_id, user_id, nombre, telefono, email)
      values (_clinic_id, new.id, _nombre, _telefono, coalesce(new.email, ''));
    end if;
  end if;

  insert into public.profiles (id, clinic_id, role, nombre)
  values (new.id, _clinic_id, _role, coalesce(_nombre, ''))
  on conflict (id) do update
    set clinic_id = excluded.clinic_id,
        role      = excluded.role,
        nombre    = excluded.nombre;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ============================================================
-- Usuarios demo:
-- 1) admin@medios.demo  (rol: admin)
-- 2) sofia@medios.demo  (rol: doctor -> Dra. Sofia Martinez)
-- 3) maria@medios.demo  (rol: patient -> Maria Garcia)
-- Password para los 3: demo1234
-- ============================================================

do $$
declare
  _admin_id uuid := '11111111-1111-4111-8111-111111111101';
  _sofia_id uuid := '11111111-1111-4111-8111-111111111102';
  _maria_id uuid := '11111111-1111-4111-8111-111111111103';
  _pw_hash  text := extensions.crypt('demo1234', extensions.gen_salt('bf'));
begin
  -- 1. Admin
  if not exists (select 1 from auth.users where email = 'admin@medios.demo') then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token, is_sso_user, is_anonymous
    ) values (
      '00000000-0000-0000-0000-000000000000', _admin_id, 'authenticated', 'authenticated',
      'admin@medios.demo', _pw_hash, now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"admin","nombre":"Administrador MediOS"}'::jsonb,
      now(), now(), '', '', '', '', false, false
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), _admin_id, _admin_id::text,
      jsonb_build_object('sub', _admin_id::text, 'email', 'admin@medios.demo', 'email_verified', true, 'phone_verified', false),
      'email', now(), now(), now()
    );
  end if;

  -- 2. Dra. Sofia Martinez
  if not exists (select 1 from auth.users where email = 'sofia@medios.demo') then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token, is_sso_user, is_anonymous
    ) values (
      '00000000-0000-0000-0000-000000000000', _sofia_id, 'authenticated', 'authenticated',
      'sofia@medios.demo', _pw_hash, now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"doctor","nombre":"Dra. Sofia Martinez","invite":"doctor","invite_id":"c0000000-0000-4000-8000-000000000001"}'::jsonb,
      now(), now(), '', '', '', '', false, false
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), _sofia_id, _sofia_id::text,
      jsonb_build_object('sub', _sofia_id::text, 'email', 'sofia@medios.demo', 'email_verified', true, 'phone_verified', false),
      'email', now(), now(), now()
    );
  end if;

  -- 3. Maria Garcia (Paciente)
  if not exists (select 1 from auth.users where email = 'maria@medios.demo') then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token, is_sso_user, is_anonymous
    ) values (
      '00000000-0000-0000-0000-000000000000', _maria_id, 'authenticated', 'authenticated',
      'maria@medios.demo', _pw_hash, now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"patient","nombre":"Maria Garcia","invite":"patient","invite_id":"d0000000-0000-4000-8000-000000000001"}'::jsonb,
      now(), now(), '', '', '', '', false, false
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), _maria_id, _maria_id::text,
      jsonb_build_object('sub', _maria_id::text, 'email', 'maria@medios.demo', 'email_verified', true, 'phone_verified', false),
      'email', now(), now(), now()
    );
  end if;
end $$;
