import type { Appointment, Clinic, Doctor, Invoice, Patient, Service } from "./types";
import { addDays, todayISO, fromMin, toMin } from "./dates";

const u = (id: string) => `https://images.unsplash.com/${id}?w=600&q=80&auto=format&fit=crop`;

export const IMG = {
  hero: u("photo-1519494026892-80bbd2d6fd0d"),
  clinic: u("photo-1629909613654-28e377c37b09"),
  t1: u("photo-1438761681033-6461ffad8d80"),
  t2: u("photo-1507003211169-0a1dd7228f2d"),
  t3: u("photo-1544005313-94ddf0286df2"),
};

export const seedClinic = (): Clinic => ({
  nombre: "Clinica MediOS Demo",
  direccion: "Av. Reforma 500, Col. Centro, Ciudad de Mexico",
  telefono: "+52 55 1234 5678",
  email: "hola@mediosdemo.mx",
  apertura: "09:00",
  cierre: "19:00",
});

export const seedServices = (): Service[] => [
  { id: "srv_gen", nombre: "Medicina General", duracion: 30, precio: 800, descripcion: "Consulta integral, diagnostico y seguimiento.", icono: "Stethoscope" },
  { id: "srv_odo", nombre: "Odontologia", duracion: 45, precio: 1200, descripcion: "Limpiezas, revisiones y tratamientos dentales.", icono: "SmilePlus" },
  { id: "srv_ped", nombre: "Pediatria", duracion: 30, precio: 900, descripcion: "Cuidado y control del nino sano.", icono: "Baby" },
  { id: "srv_der", nombre: "Dermatologia", duracion: 30, precio: 1000, descripcion: "Salud de piel, cabello y unas.", icono: "Scan" },
  { id: "srv_nut", nombre: "Nutricion", duracion: 45, precio: 700, descripcion: "Planes de alimentacion personalizados.", icono: "Apple" },
];

export const seedDoctors = (): Doctor[] => [
  { id: "doc_01", nombre: "Dra. Sofia Martinez", especialidadId: "srv_gen", foto: u("photo-1559839734-2b71ea197ec2"), horario: { days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00" }, activo: true, bio: "15 anos de experiencia en medicina familiar.", color: "oklch(0.546 0.215 262.9)" },
  { id: "doc_02", nombre: "Dr. Carlos Herrera", especialidadId: "srv_odo", foto: u("photo-1612349317150-e413f6a5b16d"), horario: { days: [1, 2, 3, 4, 5], start: "10:00", end: "18:00" }, activo: true, bio: "Especialista en odontologia estetica.", color: "oklch(0.65 0.17 160)" },
  { id: "doc_03", nombre: "Dra. Ana Lopez", especialidadId: "srv_ped", foto: u("photo-1594824476967-48c8b964273f"), horario: { days: [1, 3, 4], start: "09:00", end: "14:00" }, activo: true, bio: "Pediatra certificada, amante de los ninos.", color: "oklch(0.7 0.16 60)" },
  { id: "doc_04", nombre: "Dr. Roberto Diaz", especialidadId: "srv_der", foto: u("photo-1622253692010-333f2da6031d"), horario: { days: [2, 4, 5], start: "11:00", end: "19:00" }, activo: true, bio: "Dermatologia clinica y cosmetica.", color: "oklch(0.58 0.2 330)" },
];

export const seedPatients = (): Patient[] => {
  const y = new Date().getFullYear();
  const t = todayISO();
  return [
    { id: "pac_01", nombre: "Maria Garcia", telefono: "5512345001", email: "maria@mail.com", nacimiento: `${y - 35}-03-12`, createdAt: addDays(t, -60) },
    { id: "pac_02", nombre: "Juan Rodriguez", telefono: "5512345002", email: "juan@mail.com", nacimiento: `${y - 28}-07-02`, createdAt: addDays(t, -30) },
    { id: "pac_03", nombre: "Laura Sanchez", telefono: "5512345003", email: "laura@mail.com", nacimiento: `${y - 42}-01-20`, createdAt: addDays(t, -20) },
    { id: "pac_04", nombre: "Pedro Gonzalez", telefono: "5512345004", email: "pedro@mail.com", nacimiento: `${y - 55}-02-05`, createdAt: addDays(t, -10) },
    { id: "pac_05", nombre: "Ana Torres", telefono: "5512345005", email: "ana.torres@mail.com", nacimiento: `${y - 8}-05-15`, createdAt: t },
  ];
};

/** Next weekday (offset >= 1) on which a doctor works */
function nextWorkday(days: number[], from: string, minOffset: number) {
  let d = addDays(from, minOffset);
  for (let i = 0; i < 14; i++) {
    const dow = new Date(d + "T00:00:00").getDay();
    if (days.includes(dow)) return d;
    d = addDays(d, 1);
  }
  return d;
}

export function seedAppointments(): Appointment[] {
  const t = todayISO();
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const ts = (iso: string, h = "09:00") => `${iso}T${h}:00`;
  const inProgHora = fromMin(Math.max(0, Math.floor((nowMin - 10) / 15) * 15));
  const later1 = fromMin(Math.min(23 * 60, Math.ceil((nowMin + 60) / 30) * 30));
  const later2 = fromMin(Math.min(23 * 60 + 30, toMin(later1) + 60));
  const ev = (...tipos: [string, string][]) => tipos.map(([tipo, timestamp]) => ({ tipo, timestamp }));
  const y = addDays(t, -1);
  const p3 = addDays(t, -3);
  const p7 = addDays(t, -7);
  const p5 = addDays(t, -5);
  return [
    { id: "apt_01", pacienteId: "pac_02", doctorId: "doc_01", servicioId: "srv_gen", fecha: nextWorkday([1, 2, 3, 4, 5], t, 1), hora: "10:00", duracion: 30, estado: "scheduled", motivo: "Dolor de garganta persistente", notas: "", eventos: ev(["created", ts(t)]) },
    { id: "apt_02", pacienteId: "pac_03", doctorId: "doc_02", servicioId: "srv_odo", fecha: nextWorkday([1, 2, 3, 4, 5], t, 2), hora: "11:00", duracion: 45, estado: "scheduled", motivo: "Limpieza dental anual", notas: "", eventos: ev(["created", ts(t)]) },
    { id: "apt_03", pacienteId: "pac_01", doctorId: "doc_04", servicioId: "srv_der", fecha: nextWorkday([2, 4, 5], t, 2), hora: "12:00", duracion: 30, estado: "scheduled", motivo: "Revision de lunar", notas: "", eventos: ev(["created", ts(t)]) },
    { id: "apt_04", pacienteId: "pac_04", doctorId: "doc_01", servicioId: "srv_gen", fecha: t, hora: later1, duracion: 30, estado: "confirmed", motivo: "Control de presion arterial", notas: "", eventos: ev(["created", ts(y)], ["reminder_sent", ts(y, "10:00")], ["confirmed", ts(y, "11:00")]) },
    { id: "apt_05", pacienteId: "pac_05", doctorId: "doc_01", servicioId: "srv_gen", fecha: t, hora: later2, duracion: 30, estado: "confirmed", motivo: "Fiebre y tos", notas: "", eventos: ev(["created", ts(y)], ["confirmed", ts(y, "12:00")]) },
    { id: "apt_06", pacienteId: "pac_01", doctorId: "doc_01", servicioId: "srv_gen", fecha: p7, hora: "09:30", duracion: 30, estado: "completed", motivo: "Chequeo general", notas: "Paciente estable. TA 120/80. Se solicitan estudios de laboratorio de rutina.", eventos: ev(["created", ts(addDays(p7, -3))], ["confirmed", ts(addDays(p7, -1))], ["in_progress", ts(p7, "09:30")], ["notes_added", ts(p7, "09:45")], ["completed", ts(p7, "10:00")], ["invoice_created", ts(p7, "10:01")]) },
    { id: "apt_07", pacienteId: "pac_02", doctorId: "doc_02", servicioId: "srv_odo", fecha: p3, hora: "12:00", duracion: 45, estado: "completed", motivo: "Dolor de muela", notas: "Caries en molar 36. Se realizo resina. Control en 6 meses.", eventos: ev(["created", ts(addDays(p3, -2))], ["confirmed", ts(addDays(p3, -1))], ["in_progress", ts(p3, "12:00")], ["completed", ts(p3, "12:45")], ["invoice_created", ts(p3, "12:46")]) },
    { id: "apt_08", pacienteId: "pac_01", doctorId: "doc_01", servicioId: "srv_gen", fecha: t, hora: inProgHora, duracion: 30, estado: "in_progress", motivo: "Seguimiento de resultados de laboratorio", notas: "", eventos: ev(["created", ts(addDays(t, -2))], ["confirmed", ts(y)], ["in_progress", ts(t, inProgHora)]) },
    { id: "apt_09", pacienteId: "pac_03", doctorId: "doc_03", servicioId: "srv_ped", fecha: y, hora: "10:00", duracion: 30, estado: "no_show", motivo: "Consulta de control", notas: "", eventos: ev(["created", ts(addDays(y, -3))], ["no_show", ts(y, "10:20")]) },
    { id: "apt_10", pacienteId: "pac_04", doctorId: "doc_04", servicioId: "srv_der", fecha: p5, hora: "13:00", duracion: 30, estado: "cancelled", motivo: "Acne", notas: "", eventos: ev(["created", ts(addDays(p5, -4))], ["cancelled", ts(addDays(p5, -1))]) },
    { id: "apt_11", pacienteId: "pac_05", doctorId: "doc_03", servicioId: "srv_ped", fecha: addDays(t, -2), hora: "11:00", duracion: 30, estado: "completed", motivo: "Vacunacion", notas: "Aplicada vacuna de refuerzo. Sin reacciones.", eventos: ev(["created", ts(addDays(t, -6))], ["in_progress", ts(addDays(t, -2), "11:00")], ["completed", ts(addDays(t, -2), "11:30")], ["invoice_created", ts(addDays(t, -2), "11:31")]) },
  ];
}

export function seedInvoices(): Invoice[] {
  const t = todayISO();
  return [
    { id: "inv_01", citaId: "apt_06", pacienteId: "pac_01", monto: 800, estado: "paid", metodo: "efectivo", fechaPago: addDays(t, -7), fecha: addDays(t, -7), notas: "" },
    { id: "inv_02", citaId: "apt_07", pacienteId: "pac_02", monto: 1200, estado: "paid", metodo: "tarjeta", fechaPago: addDays(t, -3), fecha: addDays(t, -3), notas: "" },
    { id: "inv_03", citaId: "apt_11", pacienteId: "pac_05", monto: 900, estado: "pending", metodo: null, fechaPago: null, fecha: addDays(t, -2), notas: "" },
  ];
}
