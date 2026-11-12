import type {
  Appointment,
  ApptEvent,
  ApptStatus,
  Clinic,
  Doctor,
  Invoice,
  InvoiceStatus,
  Patient,
  PayMethod,
  Schedule,
  Service,
} from "@/lib/types";

export interface DbClinicRow {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  email: string;
  apertura: string;
  cierre: string;
}

export interface DbServiceRow {
  id: string;
  clinic_id: string;
  nombre: string;
  duracion: number;
  precio: number | string;
  descripcion: string;
  icono: string;
}

export interface DbDoctorRow {
  id: string;
  clinic_id: string;
  user_id: string | null;
  nombre: string;
  especialidad_id: string | null;
  foto: string;
  horario: Schedule | null;
  activo: boolean;
  bio: string;
  color: string;
}

export interface DbPatientRow {
  id: string;
  clinic_id: string;
  user_id: string | null;
  nombre: string;
  telefono: string;
  email: string;
  nacimiento: string | null;
  created_at: string;
}

export interface DbAppointmentEventRow {
  id: string;
  cita_id: string;
  tipo: string;
  created_at: string;
}

export interface DbAppointmentRow {
  id: string;
  clinic_id: string;
  paciente_id: string;
  doctor_id: string;
  servicio_id: string;
  fecha: string;
  hora: string;
  duracion: number;
  estado: ApptStatus;
  motivo: string;
  notas: string;
  created_at: string;
  appointment_events?: DbAppointmentEventRow[] | undefined;
}

export interface DbInvoiceRow {
  id: string;
  cita_id: string | null;
  paciente_id: string;
  monto: number | string;
  adelanto?: number | string | null | undefined;
  estado: InvoiceStatus;
  metodo: PayMethod | null;
  fecha_pago: string | null;
  fecha: string;
  notas: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): boolean {
  return typeof value === "string" && UUID_RE.test(value);
}

export function newUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function mapDbClinic(row: DbClinicRow): Clinic & { id: string } {
  return {
    id: row.id,
    nombre: row.nombre ?? "",
    direccion: row.direccion ?? "",
    telefono: row.telefono ?? "",
    email: row.email ?? "",
    apertura: row.apertura ?? "09:00",
    cierre: row.cierre ?? "19:00",
  };
}

export function mapDbService(row: DbServiceRow): Service {
  return {
    id: row.id,
    nombre: row.nombre,
    duracion: Number(row.duracion) || 30,
    precio: Number(row.precio) || 0,
    descripcion: row.descripcion ?? "",
    icono: row.icono || "Stethoscope",
  };
}

export function mapDbDoctor(row: DbDoctorRow): Doctor & { userId?: string | null | undefined } {
  const defaultSchedule: Schedule = {
    days: [1, 2, 3, 4, 5],
    start: "09:00",
    end: "17:00",
  };
  const h = row.horario;
  const horario: Schedule =
    h && Array.isArray(h.days) && typeof h.start === "string" && typeof h.end === "string"
      ? { days: h.days.map(Number), start: h.start, end: h.end }
      : defaultSchedule;

  return {
    id: row.id,
    userId: row.user_id,
    nombre: row.nombre,
    especialidadId: row.especialidad_id ?? "",
    foto:
      row.foto ||
      "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&q=80&auto=format&fit=crop",
    horario,
    activo: row.activo ?? true,
    bio: row.bio ?? "",
    color: row.color || "oklch(0.6 0.15 200)",
  };
}

export function mapDbPatient(row: DbPatientRow): Patient & { userId?: string | null | undefined } {
  return {
    id: row.id,
    userId: row.user_id,
    nombre: row.nombre,
    telefono: row.telefono ?? "",
    email: row.email ?? "",
    nacimiento: row.nacimiento ?? "1990-01-01",
    createdAt: row.created_at ? row.created_at.slice(0, 10) : "2026-01-01",
  };
}

export function mapDbAppointment(row: DbAppointmentRow): Appointment {
  const rawEvents = row.appointment_events ?? [];
  const eventos: ApptEvent[] = [...rawEvents]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((e) => ({
      tipo: e.tipo,
      timestamp: e.created_at,
    }));

  if (eventos.length === 0) {
    eventos.push({
      tipo: "created",
      timestamp: row.created_at ?? new Date().toISOString(),
    });
  }

  return {
    id: row.id,
    pacienteId: row.paciente_id,
    doctorId: row.doctor_id,
    servicioId: row.servicio_id,
    fecha: row.fecha,
    hora: row.hora.slice(0, 5),
    duracion: Number(row.duracion) || 30,
    estado: row.estado,
    motivo: row.motivo ?? "",
    notas: row.notas ?? "",
    eventos,
  };
}

export function mapDbInvoice(row: DbInvoiceRow): Invoice {
  const monto = Number(row.monto) || 0;
  const rawAdelanto =
    row.adelanto !== undefined && row.adelanto !== null
      ? Number(row.adelanto)
      : row.estado === "paid"
        ? monto
        : 0;

  return {
    id: row.id,
    citaId: row.cita_id ?? "",
    pacienteId: row.paciente_id,
    monto,
    adelanto: rawAdelanto,
    estado: row.estado,
    metodo: row.metodo ?? null,
    fechaPago: row.fecha_pago ? row.fecha_pago.slice(0, 10) : null,
    fecha: row.fecha,
    notas: row.notas ?? "",
  };
}
