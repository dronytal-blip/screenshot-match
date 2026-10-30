import type { Appointment, ApptStatus, Doctor } from "./types";
import { apptDate, fromMin, parseISO, toMin } from "./dates";

export const TRANSITIONS: Record<ApptStatus, ApptStatus[]> = {
  scheduled: ["confirmed", "cancelled", "no_show"],
  confirmed: ["in_progress", "cancelled", "no_show"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function canTransition(from: ApptStatus, to: ApptStatus) {
  return TRANSITIONS[from].includes(to);
}

const BLOCKING: ApptStatus[] = ["scheduled", "confirmed", "in_progress", "completed"];

export function overlaps(aStart: number, aDur: number, bStart: number, bDur: number) {
  return aStart < bStart + bDur && bStart < aStart + aDur;
}

/** Available start times for a doctor on a date for a given duration. */
export function availableSlots(
  doctor: Doctor,
  fecha: string,
  duracion: number,
  appts: Appointment[],
  now: Date = new Date(),
  excludeId?: string,
): string[] {
  if (!doctor.activo) return [];
  const dow = parseISO(fecha).getDay();
  if (!doctor.horario.days.includes(dow)) return [];
  const start = toMin(doctor.horario.start);
  const end = toMin(doctor.horario.end);
  const busy = appts.filter(
    (a) => a.doctorId === doctor.id && a.fecha === fecha && a.id !== excludeId && BLOCKING.includes(a.estado),
  );
  const out: string[] = [];
  for (let m = start; m + duracion <= end; m += 15) {
    const hora = fromMin(m);
    if (apptDate(fecha, hora) <= now) continue;
    if (busy.some((b) => overlaps(m, duracion, toMin(b.hora), b.duracion))) continue;
    out.push(hora);
  }
  return out;
}

/** Patient may cancel until 2h before the appointment. */
export function patientCanCancel(a: Appointment, now: Date = new Date()) {
  if (!["scheduled", "confirmed"].includes(a.estado)) return false;
  return apptDate(a.fecha, a.hora).getTime() - now.getTime() >= 2 * 60 * 60 * 1000;
}
