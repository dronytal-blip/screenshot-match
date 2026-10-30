import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, CalendarDays, CalendarPlus, History, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, Hydrated, InvoiceBadge, SlotPicker, StatusBadge, TabBar, TopBar, useSwipeTabs } from "@/components/medios/shared";
import { CURRENT_PATIENT, useLookup, useStore } from "@/lib/store";
import { patientCanCancel } from "@/lib/logic";
import { fmtDateLong, money } from "@/lib/dates";
import type { Appointment } from "@/lib/types";

export const Route = createFileRoute("/patient")({
  head: () => ({
    meta: [
      { title: "Mi portal — MediOS" },
      { name: "description", content: "Consulta tus citas, historial y pagos en MediOS." },
      { property: "og:title", content: "Mi portal — MediOS" },
      { property: "og:description", content: "Portal del paciente de MediOS." },
    ],
  }),
  component: () => <Hydrated><Patient /></Hydrated>,
});

type Tab = "citas" | "historial" | "pagos";
const TABS = [
  { id: "citas" as Tab, label: "Mis Citas", icon: CalendarDays },
  { id: "historial" as Tab, label: "Historial", icon: History },
  { id: "pagos" as Tab, label: "Pagos", icon: Receipt },
];

function Patient() {
  const [tab, setTab] = useState<Tab>("citas");
  const me = useStore((s) => s.patients.find((p) => p.id === CURRENT_PATIENT));
  const swipe = useSwipeTabs(TABS.map((t) => t.id), tab, setTab);
  return (
    <div className="min-h-screen">
      <TopBar title="Portal del paciente" subtitle={me?.nombre ?? ""} />
      <main className="mx-auto max-w-4xl px-4 pt-4">
        <h1 className="mb-2 text-2xl font-extrabold">Hola, {me?.nombre.split(" ")[0]}</h1>
        <TabBar tabs={TABS} value={tab} onChange={setTab} />
        <div key={tab} className="fade-in-tab min-h-[60vh] py-6" {...swipe}>
          {tab === "citas" && <Citas />}
          {tab === "historial" && <Historial />}
          {tab === "pagos" && <Pagos />}
        </div>
      </main>
    </div>
  );
}

function Citas() {
  const { appointments, transition } = useStore();
  const L = useLookup();
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [resch, setResch] = useState<Appointment | null>(null);
  const list = appointments.filter((a) => a.pacienteId === CURRENT_PATIENT && ["scheduled", "confirmed", "in_progress"].includes(a.estado))
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  return (
    <>
      <Button asChild size="lg" className="mb-6"><Link to="/booking"><CalendarPlus className="size-5" /> Agendar Nueva Cita</Link></Button>
      {list.length === 0 ? <EmptyState icon={CalendarDays} title="No tienes citas programadas" action={<Button asChild variant="outline"><Link to="/booking">Agendar</Link></Button>} /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((a) => {
            const d = L.doctor(a.doctorId);
            const canCancel = patientCanCancel(a);
            return (
              <div key={a.id} className="rounded-2xl border bg-card p-5 shadow-soft">
                <div className="flex items-start gap-3">
                  <img src={d?.foto} alt="" className="size-14 rounded-xl object-cover" />
                  <div className="flex-1"><p className="font-bold">{d?.nombre}</p><p className="text-sm text-primary">{L.service(a.servicioId)?.nombre}</p></div>
                  <StatusBadge status={a.estado} />
                </div>
                <p className="mt-4 font-semibold">{fmtDateLong(a.fecha)} · {a.hora}</p>
                <p className="text-sm text-muted-foreground">{a.motivo}</p>
                {a.estado !== "in_progress" && (
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setResch(a)}>Reagendar</Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => canCancel ? setCancelId(a.id) : toast.error("Solo puedes cancelar hasta 2 horas antes de la cita")}>Cancelar</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <AlertDialog open={!!cancelId} onOpenChange={(o) => !o && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Cancelar esta cita?</AlertDialogTitle><AlertDialogDescription>Esta accion no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={() => { const r = transition(cancelId!, "cancelled"); r.ok ? toast.success("Cita cancelada") : toast.error(r.error); setCancelId(null); }}>Si, cancelar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {resch && <RescheduleDialog appt={resch} onClose={() => setResch(null)} />}
    </>
  );
}

export function RescheduleDialog({ appt, onClose }: { appt: Appointment; onClose: () => void }) {
  const { reschedule, doctors } = useStore();
  const doc = doctors.find((d) => d.id === appt.doctorId)!;
  const [fecha, setFecha] = useState<string | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Reagendar cita</DialogTitle></DialogHeader>
        <SlotPicker doctor={doc} duracion={appt.duracion} fecha={fecha} hora={hora} excludeId={appt.id} onChange={(f, h) => { setFecha(f); setHora(h); }} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
          <Button disabled={!fecha || !hora} onClick={() => { const r = reschedule(appt.id, fecha!, hora!); if (r.ok) { toast.success("Cita reagendada"); onClose(); } else toast.error(r.error); }}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Historial() {
  const appts = useStore((s) => s.appointments);
  const L = useLookup();
  const list = appts.filter((a) => a.pacienteId === CURRENT_PATIENT && ["completed", "cancelled", "no_show"].includes(a.estado)).sort((a, b) => b.fecha.localeCompare(a.fecha));
  if (!list.length) return <EmptyState icon={History} title="Aun no tienes consultas pasadas" />;
  return (
    <div className="space-y-3">
      {list.map((a) => (
        <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-5 shadow-soft">
          <div>
            <p className="font-bold">{fmtDateLong(a.fecha)}</p>
            <p className="text-sm text-muted-foreground">{L.doctor(a.doctorId)?.nombre} · {L.service(a.servicioId)?.nombre}</p>
            <p className="mt-1 text-sm">{a.motivo}</p>
          </div>
          <StatusBadge status={a.estado} />
        </div>
      ))}
    </div>
  );
}

function Pagos() {
  const { invoices, appointments } = useStore();
  const L = useLookup();
  const list = invoices.filter((i) => i.pacienteId === CURRENT_PATIENT && i.estado !== "cancelled").sort((a, b) => b.fecha.localeCompare(a.fecha));
  const pending = list.some((i) => i.estado === "pending");
  return (
    <>
      {pending && <div className="mb-4 flex items-center gap-3 rounded-2xl bg-warning-soft p-4 text-sm font-semibold text-warning"><AlertTriangle className="size-5" /> Tienes pagos pendientes</div>}
      {!list.length ? <EmptyState icon={Receipt} title="No tienes recibos" /> : (
        <div className="space-y-3">
          {list.map((i) => {
            const a = appointments.find((x) => x.id === i.citaId);
            return (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-5 shadow-soft">
                <div>
                  <p className="font-display text-xl font-extrabold">{money(i.monto)}</p>
                  <p className="text-sm text-muted-foreground">{a && L.service(a.servicioId)?.nombre} · {fmtDateLong(i.fecha)}</p>
                  <p className="text-sm capitalize text-muted-foreground">{i.metodo ?? "Por pagar en clinica"}</p>
                </div>
                <InvoiceBadge status={i.estado} />
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
