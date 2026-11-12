-- Permitir cobros manuales sin cita asociada, pagos por Yape y registro de adelantos
alter table public.invoices
  alter column cita_id drop not null;

alter table public.invoices
  add column if not exists adelanto numeric(10, 2) not null default 0 check (adelanto >= 0);

alter table public.invoices
  drop constraint if exists invoices_metodo_check;

alter table public.invoices
  add constraint invoices_metodo_check
  check (metodo in ('efectivo', 'tarjeta', 'transferencia', 'yape'));
