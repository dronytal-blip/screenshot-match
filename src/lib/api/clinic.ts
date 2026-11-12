import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Clinic } from "@/lib/types";
import { mapDbClinic, type DbClinicRow } from "./mappers";

export const CLINIC_QUERY_KEY = ["clinic"] as const;

export async function fetchClinic(): Promise<(Clinic & { id: string }) | null> {
  const { data, error } = await supabase
    .from("clinics")
    .select("id, nombre, direccion, telefono, email, apertura, cierre")
    .order("nombre", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapDbClinic(data as DbClinicRow);
}

export async function updateClinicDb(
  clinicId: string,
  clinic: Clinic,
): Promise<Clinic & { id: string }> {
  const { data, error } = await supabase
    .from("clinics")
    .update({
      nombre: clinic.nombre,
      direccion: clinic.direccion,
      telefono: clinic.telefono,
      email: clinic.email,
      apertura: clinic.apertura,
      cierre: clinic.cierre,
    })
    .eq("id", clinicId)
    .select("id, nombre, direccion, telefono, email, apertura, cierre")
    .single();

  if (error) throw error;
  return mapDbClinic(data as DbClinicRow);
}

export function useClinicQuery() {
  return useQuery({
    queryKey: CLINIC_QUERY_KEY,
    queryFn: fetchClinic,
  });
}

export function useUpdateClinicMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ clinicId, clinic }: { clinicId: string; clinic: Clinic }) =>
      updateClinicDb(clinicId, clinic),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CLINIC_QUERY_KEY });
    },
  });
}
