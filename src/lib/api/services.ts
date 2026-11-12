import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Service } from "@/lib/types";
import { isUuid, mapDbService, newUuid, type DbServiceRow } from "./mappers";

export const SERVICES_QUERY_KEY = ["services"] as const;

export async function fetchServices(clinicId?: string): Promise<Service[]> {
  let query = supabase
    .from("services")
    .select("id, clinic_id, nombre, duracion, precio, descripcion, icono")
    .order("nombre", { ascending: true });

  if (clinicId && isUuid(clinicId)) {
    query = query.eq("clinic_id", clinicId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as DbServiceRow[]).map(mapDbService);
}

export async function syncServicesDb(
  clinicId: string,
  services: Service[],
): Promise<Service[]> {
  const existing = await fetchServices(clinicId);
  const nextIds = new Set(services.filter((s) => isUuid(s.id)).map((s) => s.id));

  // Eliminar servicios que ya no estan en la lista
  const toDelete = existing.filter((e) => !nextIds.has(e.id)).map((e) => e.id);
  if (toDelete.length > 0) {
    const { error: delErr } = await supabase
      .from("services")
      .delete()
      .in("id", toDelete);
    if (delErr) throw delErr;
  }

  // Upsert de servicios actuales
  const rows = services.map((s) => ({
    id: isUuid(s.id) ? s.id : newUuid(),
    clinic_id: clinicId,
    nombre: s.nombre,
    duracion: s.duracion,
    precio: s.precio,
    descripcion: s.descripcion,
    icono: s.icono,
  }));

  if (rows.length > 0) {
    const { error: upErr } = await supabase
      .from("services")
      .upsert(rows, { onConflict: "id" });
    if (upErr) throw upErr;
  }

  return fetchServices(clinicId);
}

export function useServicesQuery(clinicId?: string) {
  return useQuery({
    queryKey: [...SERVICES_QUERY_KEY, clinicId ?? "default"],
    queryFn: () => fetchServices(clinicId),
  });
}

export function useSyncServicesMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      clinicId,
      services,
    }: {
      clinicId: string;
      services: Service[];
    }) => syncServicesDb(clinicId, services),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
    },
  });
}
