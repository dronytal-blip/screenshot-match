import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Appointment, ApptStatus } from "@/lib/types";
import { isUuid, mapDbAppointment, type DbAppointmentRow } from "./mappers";

export const APPOINTMENTS_QUERY_KEY = ["appointments"] as const;

export async function fetchAppointments(
  clinicId?: string,
): Promise<Appointment[]> {
  let query = supabase
    .from("appointments")
    .select(
      "id, clinic_id, paciente_id, doctor_id, servicio_id, fecha, hora, duracion, estado, motivo, notas, created_at, appointment_events(id, cita_id, tipo, created_at)",
    )
    .order("fecha", { ascending: false })
    .order("hora", { ascending: true });

  if (clinicId && isUuid(clinicId)) {
    query = query.eq("clinic_id", clinicId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as DbAppointmentRow[]).map(mapDbAppointment);
}

export async function createAppointmentDb(
  clinicId: string,
  appt: Appointment,
): Promise<void> {
  const { error } = await supabase.from("appointments").insert({
    id: appt.id,
    clinic_id: clinicId,
    paciente_id: appt.pacienteId,
    doctor_id: appt.doctorId,
    servicio_id: appt.servicioId,
    fecha: appt.fecha,
    hora: appt.hora,
    duracion: appt.duracion,
    estado: appt.estado,
    motivo: appt.motivo,
    notas: appt.notas,
  });
  if (error) throw error;

  await supabase.from("appointment_events").insert({
    cita_id: appt.id,
    tipo: "created",
  });
}

export async function bookPublicAppointmentDb(params: {
  nombre: string;
  telefono: string;
  email: string;
  nacimiento: string;
  doctorId: string;
  servicioId: string;
  fecha: string;
  hora: string;
  motivo: string;
}): Promise<{ ok: true; id: string; pacienteId: string } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc("book_public_appointment", {
    p_nombre: params.nombre,
    p_telefono: params.telefono,
    p_email: params.email,
    p_nacimiento: params.nacimiento || "1990-01-01",
    p_doctor_id: params.doctorId,
    p_servicio_id: params.servicioId,
    p_fecha: params.fecha,
    p_hora: params.hora,
    p_motivo: params.motivo,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const res = data as { ok?: boolean; id?: string; paciente_id?: string; error?: string } | null;
  if (!res?.ok || !res.id || !res.paciente_id) {
    return { ok: false, error: res?.error ?? "No se pudo agendar la cita" };
  }

  return { ok: true, id: res.id, pacienteId: res.paciente_id };
}

export async function transitionAppointmentDb(
  id: string,
  to: ApptStatus,
  autoInvoice?: {
    id: string;
    pacienteId: string;
    monto: number;
    fecha: string;
  } | null,
): Promise<void> {
  const { error } = await supabase
    .from("appointments")
    .update({ estado: to })
    .eq("id", id);

  if (error) throw error;

  await supabase.from("appointment_events").insert({
    cita_id: id,
    tipo: to,
  });

  if (to === "completed" && autoInvoice) {
    const { error: invErr } = await supabase.from("invoices").insert({
      id: autoInvoice.id,
      cita_id: id,
      paciente_id: autoInvoice.pacienteId,
      monto: autoInvoice.monto,
      adelanto: 0,
      estado: "pending",
      metodo: null,
      fecha_pago: null,
      fecha: autoInvoice.fecha,
      notas: "",
    });
    if (!invErr) {
      await supabase.from("appointment_events").insert({
        cita_id: id,
        tipo: "invoice_created",
      });
    }
  }

  if (to === "cancelled") {
    await supabase
      .from("invoices")
      .update({ estado: "cancelled" })
      .eq("cita_id", id)
      .eq("estado", "pending");
  }
}

export async function rescheduleAppointmentDb(
  id: string,
  fecha: string,
  hora: string,
): Promise<void> {
  const { error } = await supabase
    .from("appointments")
    .update({ fecha, hora, estado: "scheduled" })
    .eq("id", id);

  if (error) throw error;

  await supabase.from("appointment_events").insert({
    cita_id: id,
    tipo: "rescheduled",
  });
}

export async function updateAppointmentNotesDb(
  id: string,
  notas: string,
  recordEvent: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("appointments")
    .update({ notas })
    .eq("id", id);

  if (error) throw error;

  if (recordEvent) {
    await supabase.from("appointment_events").insert({
      cita_id: id,
      tipo: "notes_added",
    });
  }
}

export function useAppointmentsQuery(clinicId?: string) {
  return useQuery({
    queryKey: [...APPOINTMENTS_QUERY_KEY, clinicId ?? "default"],
    queryFn: () => fetchAppointments(clinicId),
  });
}

export function useTransitionAppointmentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      to,
      autoInvoice,
    }: {
      id: string;
      to: ApptStatus;
      autoInvoice?: {
        id: string;
        pacienteId: string;
        monto: number;
        fecha: string;
      } | null;
    }) => transitionAppointmentDb(id, to, autoInvoice),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: APPOINTMENTS_QUERY_KEY });
    },
  });
}
