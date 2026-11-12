import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Patient } from "@/lib/types";
import { isUuid, mapDbPatient, type DbPatientRow } from "./mappers";

export const PATIENTS_QUERY_KEY = ["patients"] as const;

export async function fetchPatients(
  clinicId?: string,
): Promise<(Patient & { userId?: string | null | undefined })[]> {
  let query = supabase
    .from("patients")
    .select("id, clinic_id, user_id, nombre, telefono, email, nacimiento, created_at")
    .order("created_at", { ascending: false });

  if (clinicId && isUuid(clinicId)) {
    query = query.eq("clinic_id", clinicId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as DbPatientRow[]).map(mapDbPatient);
}

export async function createPatientDb(
  clinicId: string,
  patient: Patient,
): Promise<Patient> {
  const { data, error } = await supabase
    .from("patients")
    .insert({
      id: patient.id,
      clinic_id: clinicId,
      nombre: patient.nombre,
      telefono: patient.telefono,
      email: patient.email,
      nacimiento: patient.nacimiento || "1990-01-01",
    })
    .select("id, clinic_id, user_id, nombre, telefono, email, nacimiento, created_at")
    .single();

  if (error) throw error;
  return mapDbPatient(data as DbPatientRow);
}

export async function updatePatientDb(
  id: string,
  patch: Partial<Omit<Patient, "id" | "createdAt">>,
): Promise<void> {
  const updatePayload: Record<string, unknown> = {};
  if (patch.nombre !== undefined) updatePayload["nombre"] = patch.nombre;
  if (patch.telefono !== undefined) updatePayload["telefono"] = patch.telefono;
  if (patch.email !== undefined) updatePayload["email"] = patch.email;
  if (patch.nacimiento !== undefined)
    updatePayload["nacimiento"] = patch.nacimiento || "1990-01-01";

  const { error } = await supabase
    .from("patients")
    .update(updatePayload)
    .eq("id", id);

  if (error) throw error;
}

export async function deletePatientDb(id: string): Promise<void> {
  // Eliminar primero cobros y citas asociadas para evitar bloqueo de FK
  const { error: invErr } = await supabase
    .from("invoices")
    .delete()
    .eq("paciente_id", id);
  if (invErr) throw invErr;

  const { error: apptErr } = await supabase
    .from("appointments")
    .delete()
    .eq("paciente_id", id);
  if (apptErr) throw apptErr;

  const { error } = await supabase.from("patients").delete().eq("id", id);
  if (error) throw error;
}

export function usePatientsQuery(clinicId?: string) {
  return useQuery({
    queryKey: [...PATIENTS_QUERY_KEY, clinicId ?? "default"],
    queryFn: () => fetchPatients(clinicId),
  });
}

export function useCreatePatientMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      clinicId,
      patient,
    }: {
      clinicId: string;
      patient: Patient;
    }) => createPatientDb(clinicId, patient),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PATIENTS_QUERY_KEY });
    },
  });
}

export function useUpdatePatientMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Omit<Patient, "id" | "createdAt">>;
    }) => updatePatientDb(id, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PATIENTS_QUERY_KEY });
    },
  });
}

export function useDeletePatientMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePatientDb(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PATIENTS_QUERY_KEY });
    },
  });
}
