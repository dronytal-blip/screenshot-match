import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Doctor } from "@/lib/types";
import { isUuid, mapDbDoctor, type DbDoctorRow } from "./mappers";

export const DOCTORS_QUERY_KEY = ["doctors"] as const;

export async function fetchDoctors(
  clinicId?: string,
): Promise<(Doctor & { userId?: string | null | undefined })[]> {
  let query = supabase
    .from("doctors")
    .select(
      "id, clinic_id, user_id, nombre, especialidad_id, foto, horario, activo, bio, color",
    )
    .order("nombre", { ascending: true });

  if (clinicId && isUuid(clinicId)) {
    query = query.eq("clinic_id", clinicId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as DbDoctorRow[]).map(mapDbDoctor);
}

export async function createDoctorDb(
  clinicId: string,
  doctor: Doctor,
): Promise<Doctor> {
  const { data, error } = await supabase
    .from("doctors")
    .insert({
      id: doctor.id,
      clinic_id: clinicId,
      nombre: doctor.nombre,
      especialidad_id: isUuid(doctor.especialidadId)
        ? doctor.especialidadId
        : null,
      foto: doctor.foto,
      horario: doctor.horario,
      activo: doctor.activo,
      bio: doctor.bio,
      color: doctor.color,
    })
    .select(
      "id, clinic_id, user_id, nombre, especialidad_id, foto, horario, activo, bio, color",
    )
    .single();

  if (error) throw error;
  return mapDbDoctor(data as DbDoctorRow);
}

export async function updateDoctorDb(
  id: string,
  patch: Partial<Doctor>,
): Promise<void> {
  const updatePayload: Record<string, unknown> = {};
  if (patch.nombre !== undefined) updatePayload["nombre"] = patch.nombre;
  if (patch.especialidadId !== undefined) {
    updatePayload["especialidad_id"] = isUuid(patch.especialidadId)
      ? patch.especialidadId
      : null;
  }
  if (patch.foto !== undefined) updatePayload["foto"] = patch.foto;
  if (patch.horario !== undefined) updatePayload["horario"] = patch.horario;
  if (patch.activo !== undefined) updatePayload["activo"] = patch.activo;
  if (patch.bio !== undefined) updatePayload["bio"] = patch.bio;
  if (patch.color !== undefined) updatePayload["color"] = patch.color;

  const { error } = await supabase
    .from("doctors")
    .update(updatePayload)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteDoctorDb(id: string): Promise<void> {
  // Eliminar primero las citas del doctor para evitar bloqueo de FK
  const { error: apptErr } = await supabase
    .from("appointments")
    .delete()
    .eq("doctor_id", id);
  if (apptErr) throw apptErr;

  const { error } = await supabase.from("doctors").delete().eq("id", id);
  if (error) throw error;
}

export function useDoctorsQuery(clinicId?: string) {
  return useQuery({
    queryKey: [...DOCTORS_QUERY_KEY, clinicId ?? "default"],
    queryFn: () => fetchDoctors(clinicId),
  });
}

export function useCreateDoctorMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ clinicId, doctor }: { clinicId: string; doctor: Doctor }) =>
      createDoctorDb(clinicId, doctor),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: DOCTORS_QUERY_KEY });
    },
  });
}

export function useUpdateDoctorMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Doctor> }) =>
      updateDoctorDb(id, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: DOCTORS_QUERY_KEY });
    },
  });
}

export function useDeleteDoctorMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDoctorDb(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: DOCTORS_QUERY_KEY });
    },
  });
}
