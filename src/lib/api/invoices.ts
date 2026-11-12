import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Invoice, PayMethod } from "@/lib/types";
import { isUuid, mapDbInvoice, type DbInvoiceRow } from "./mappers";

export const INVOICES_QUERY_KEY = ["invoices"] as const;

export async function fetchInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, cita_id, paciente_id, monto, adelanto, estado, metodo, fecha_pago, fecha, notas",
    )
    .order("fecha", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as DbInvoiceRow[]).map(mapDbInvoice);
}

export async function upsertInvoiceDb(invoice: Invoice): Promise<void> {
  const payload = {
    id: invoice.id,
    cita_id: isUuid(invoice.citaId) ? invoice.citaId : null,
    paciente_id: invoice.pacienteId,
    monto: invoice.monto,
    adelanto: invoice.adelanto ?? (invoice.estado === "paid" ? invoice.monto : 0),
    estado: invoice.estado,
    metodo: invoice.metodo,
    fecha_pago: invoice.fechaPago ? new Date().toISOString() : null,
    fecha: invoice.fecha,
    notas: invoice.notas,
  };

  const { error } = await supabase
    .from("invoices")
    .upsert(payload, { onConflict: "id" });

  if (error) throw error;
}

export async function updateInvoicePaymentDb(params: {
  id: string;
  adelanto: number;
  estado: "pending" | "paid";
  metodo: PayMethod;
  fechaPago: string | null;
}): Promise<void> {
  const { error } = await supabase
    .from("invoices")
    .update({
      adelanto: params.adelanto,
      estado: params.estado,
      metodo: params.metodo,
      fecha_pago: params.fechaPago ? new Date().toISOString() : null,
    })
    .eq("id", params.id);

  if (error) throw error;
}

export async function cancelInvoiceDb(id: string): Promise<void> {
  const { error } = await supabase
    .from("invoices")
    .update({ estado: "cancelled" })
    .eq("id", id);

  if (error) throw error;
}

export function useInvoicesQuery() {
  return useQuery({
    queryKey: INVOICES_QUERY_KEY,
    queryFn: fetchInvoices,
  });
}

export function useUpsertInvoiceMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoice: Invoice) => upsertInvoiceDb(invoice),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: INVOICES_QUERY_KEY });
    },
  });
}

export function useCancelInvoiceMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelInvoiceDb(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: INVOICES_QUERY_KEY });
    },
  });
}
