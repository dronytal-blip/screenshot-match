export type Role = "admin" | "doctor" | "patient";
export type ApptStatus = "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
export type InvoiceStatus = "pending" | "paid" | "cancelled";
export type PayMethod = "efectivo" | "tarjeta" | "transferencia" | "yape";

export const PAY_METHODS: { id: PayMethod; label: string }[] = [
  { id: "efectivo", label: "Efectivo" },
  { id: "transferencia", label: "Transferencia" },
  { id: "tarjeta", label: "Tarjeta" },
  { id: "yape", label: "Yape" },
];

export interface Service {
  id: string;
  nombre: string;
  duracion: number;
  precio: number;
  descripcion: string;
  icono: string;
}

export interface Schedule {
  days: number[]; // 0=Dom ... 6=Sab
  start: string; // HH:mm
  end: string;
}

export interface Doctor {
  id: string;
  nombre: string;
  especialidadId: string;
  foto: string;
  horario: Schedule;
  activo: boolean;
  bio: string;
  color: string;
}

export interface Patient {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
  nacimiento: string; // YYYY-MM-DD
  createdAt: string;
}

export interface ApptEvent {
  tipo: string;
  timestamp: string;
}

export interface Appointment {
  id: string;
  pacienteId: string;
  doctorId: string;
  servicioId: string;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:mm
  duracion: number;
  estado: ApptStatus;
  motivo: string;
  notas: string;
  eventos: ApptEvent[];
}

export interface Invoice {
  id: string;
  citaId: string;
  pacienteId: string;
  monto: number;
  adelanto?: number | undefined;
  estado: InvoiceStatus;
  metodo: PayMethod | null;
  fechaPago: string | null;
  fecha: string;
  notas: string;
}

export function invoicePaidAmount(i: Invoice): number {
  if (i.estado === "cancelled") return 0;
  if (i.estado === "paid") return i.monto;
  return Math.min(i.monto, Math.max(0, i.adelanto ?? 0));
}

export function invoiceRemaining(i: Invoice): number {
  if (i.estado !== "pending") return 0;
  return Math.max(0, i.monto - invoicePaidAmount(i));
}

export interface Clinic {
  nombre: string;
  direccion: string;
  telefono: string;
  email: string;
  apertura: string;
  cierre: string;
}
