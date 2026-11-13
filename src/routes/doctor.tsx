import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CalendarClock,
  ClipboardList,
  Play,
  Stethoscope,
  UserX,
  Users,
  CheckCircle2,
  CreditCard,
  ArrowLeft,
  SmilePlus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChargeDialog,
  EmptyState,
  Hydrated,
  StatusBadge,
  TabBar,
  TopBar,
  useSwipeTabs,
} from "@/components/medios/shared";
import {
  Odontogram,
  isToothModified,
} from "@/components/medios/odontogram";
import { useLookup, useStore } from "@/lib/store";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { age, fmtDateLong, todayISO } from "@/lib/dates";
import type { Appointment } from "@/lib/types";

export const Route = createFileRoute("/doctor")({
  head: () => ({
    meta: [
      { title: "Panel del doctor — MediOS" },
      {
        name: "description",
        content:
          "Agenda del dia, consulta activa, odontograma clinico y pacientes del doctor en MediOS.",
      },
      { property: "og:title", content: "Panel del doctor — MediOS" },
      {
        property: "og:description",
        content: "Panel del doctor de MediOS.",
      },
    ],
  }),
  component: () => (
    <Hydrated>
      <ProtectedRoute allowedRoles={["doctor", "admin"]}>
        <DoctorPanel />
      </ProtectedRoute>
    </Hydrated>
  ),
});

type Tab = "dia" | "consulta" | "pacientes";
const TABS = [
  { id: "dia" as Tab, label: "Mi Dia", icon: CalendarClock },
  { id: "consulta" as Tab, label: "Consulta", icon: Stethoscope },
  { id: "pacientes" as Tab, label: "Mis Pacientes", icon: Users },
];

function isDentalServiceName(name?: string | undefined, icon?: string | undefined): boolean {
  if (!name && !icon) return false;
  const n = (name ?? "").toLowerCase();
  return (
    n.includes("odonto") ||
    n.includes("dental") ||
    n.includes("diente") ||
    icon === "SmilePlus"
  );
}

function hasOdontogramData(appt?: Appointment | undefined): boolean {
  if (!appt?.odontograma) return false;
  if (appt.odontograma.observaciones?.trim()) return true;
  const teeth = appt.odontograma.teeth ?? {};
  return Object.values(teeth).some((rec) => isToothModified(rec));
}

function DoctorPanel() {
  const [tab, setTab] = useState<Tab>("dia");
  const currentDoctorId = useStore((s) => s.currentDoctorId);
  const setCurrentDoctor = useStore((s) => s.setCurrentDoctor);
  const doctors = useStore((s) => s.doctors);
  const services = useStore((s) => s.services);
  const doc =
    doctors.find((d) => d.id === currentDoctorId) ?? doctors[0];
  const docSrv = services.find((s) => s.id === doc?.especialidadId);
  const swipe = useSwipeTabs(TABS.map((t) => t.id), tab, setTab);

  return (
    <div className="min-h-screen">
      <TopBar
        title="Panel del doctor"
        subtitle={
          doc ? `${doc.nombre} · ${docSrv?.nombre ?? "Especialista"}` : ""
        }
      />
      <main className="mx-auto max-w-6xl px-4 pt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <TabBar tabs={TABS} value={tab} onChange={setTab} />
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              Profesional:
            </span>
            <select
              value={doc?.id ?? ""}
              onChange={(e) => setCurrentDoctor(e.target.value)}
              className="h-9 rounded-xl border border-input bg-card px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {doctors.map((d) => {
                const s = services.find((x) => x.id === d.especialidadId);
                return (
                  <option key={d.id} value={d.id}>
                    {d.nombre} ({s?.nombre ?? "Medicina"})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
        <div key={tab} className="fade-in-tab min-h-[60vh] py-6" {...swipe}>
          {tab === "dia" && <MiDia goConsulta={() => setTab("consulta")} />}
          {tab === "consulta" && <Consulta />}
          {tab === "pacientes" && <MisPacientes />}
        </div>
      </main>
    </div>
  );
}

function MiDia({ goConsulta }: { goConsulta: () => void }) {
  const { appointments, transition, currentDoctorId } = useStore();
  const L = useLookup();
  const today = appointments
    .filter(
      (a) => a.doctorId === currentDoctorId && a.fecha === todayISO(),
    )
    .sort((a, b) => a.hora.localeCompare(b.hora));
  const next = today.find(
    (a) => a.estado === "confirmed" || a.estado === "scheduled",
  );
  const inProg = today.find((a) => a.estado === "in_progress");

  const act = (id: string, to: "in_progress" | "no_show" | "confirmed") => {
    const r = transition(id, to);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success(
      to === "in_progress"
        ? "Consulta iniciada"
        : to === "no_show"
          ? "Marcada como no-show"
          : "Cita confirmada",
    );
    if (to === "in_progress") goConsulta();
  };

  const activeCardAppt = inProg ?? next;
  const p = activeCardAppt && L.patient(activeCardAppt.pacienteId);
  const last =
    activeCardAppt &&
    appointments
      .filter(
        (a) =>
          a.pacienteId === activeCardAppt.pacienteId &&
          a.estado === "completed",
      )
      .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <div>
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {inProg ? "Consulta en curso" : "Proximo paciente"}
        </p>
        {activeCardAppt && p ? (
          <div className="rounded-3xl bg-hero p-6 text-primary-foreground shadow-lift">
            <div className="flex items-center justify-between">
              <p className="font-display text-4xl font-extrabold">
                {activeCardAppt.hora}
              </p>
              <span className="rounded-full bg-primary-foreground/20 px-3 py-1 text-xs font-bold">
                {L.service(activeCardAppt.servicioId)?.nombre}
              </span>
            </div>
            <p className="mt-4 text-2xl font-bold">{p.nombre}</p>
            <p className="text-primary-foreground/80">
              {age(p.nacimiento)} anos
            </p>
            <p className="mt-4 rounded-xl bg-primary-foreground/15 p-3 text-sm">
              {activeCardAppt.motivo}
            </p>
            <p className="mt-3 text-sm text-primary-foreground/80">
              {last
                ? `Ultima visita: ${fmtDateLong(last.fecha)}`
                : "Primera visita"}
            </p>
            {inProg ? (
              <Button
                className="mt-5 w-full bg-card text-primary hover:bg-card/90"
                size="lg"
                onClick={goConsulta}
              >
                <Stethoscope className="size-4" /> Continuar Consulta
              </Button>
            ) : (
              <Button
                className="mt-5 w-full bg-card text-primary hover:bg-card/90"
                size="lg"
                onClick={() =>
                  activeCardAppt.estado === "scheduled"
                    ? toast.error(
                        "Confirma la cita antes de iniciar la consulta",
                      )
                    : act(activeCardAppt.id, "in_progress")
                }
              >
                <Play className="size-4" /> Iniciar Consulta
              </Button>
            )}
          </div>
        ) : (
          <EmptyState
            icon={CalendarClock}
            title="No hay mas pacientes por hoy"
          />
        )}
      </div>
      <div>
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Agenda de hoy · {fmtDateLong(todayISO())}
        </p>
        <div className="space-y-3">
          {today.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-soft"
            >
              <p className="w-14 font-display text-lg font-extrabold text-primary">
                {a.hora}
              </p>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {L.patient(a.pacienteId)?.nombre}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {a.motivo}
                </p>
              </div>
              <StatusBadge status={a.estado} />
              <div className="flex gap-1">
                {a.estado === "scheduled" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => act(a.id, "confirmed")}
                  >
                    Confirmar
                  </Button>
                )}
                {a.estado === "confirmed" && (
                  <Button
                    size="sm"
                    onClick={() => act(a.id, "in_progress")}
                  >
                    <Play className="size-3" />
                  </Button>
                )}
                {(a.estado === "confirmed" || a.estado === "scheduled") && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => act(a.id, "no_show")}
                    title="No-show"
                  >
                    <UserX className="size-4" />
                  </Button>
                )}
                {a.estado === "in_progress" && (
                  <Button size="sm" variant="outline" onClick={goConsulta}>
                    Abrir
                  </Button>
                )}
              </div>
            </div>
          ))}
          {!today.length && (
            <EmptyState icon={CalendarClock} title="Sin citas hoy" />
          )}
        </div>
      </div>
    </div>
  );
}

function Consulta() {
  const {
    appointments,
    invoices,
    updateNotes,
    updateOdontograma,
    transition,
    currentDoctorId,
  } = useStore();
  const L = useLookup();
  const a = appointments.find(
    (x) => x.doctorId === currentDoctorId && x.estado === "in_progress",
  );
  const doc = L.doctor(currentDoctorId);
  const docSrv = doc ? L.service(doc.especialidadId) : undefined;
  const srv = a ? L.service(a.servicioId) : undefined;

  const isDental =
    isDentalServiceName(srv?.nombre, srv?.icono) ||
    isDentalServiceName(docSrv?.nombre, docSrv?.icono);

  const [notes, setNotes] = useState(a?.notas ?? "");
  const [charge, setCharge] = useState(false);
  const [showOdontogram, setShowOdontogram] = useState(true);
  const [historyOdontoAppt, setHistoryOdontoAppt] =
    useState<Appointment | null>(null);

  useEffect(() => {
    setNotes(a?.notas ?? "");
  }, [a?.id]);

  useEffect(() => {
    if (!a || notes === a.notas) return;
    const t = setTimeout(() => updateNotes(a.id, notes), 500);
    return () => clearTimeout(t);
  }, [notes, a, updateNotes]);

  if (!a) {
    return (
      <EmptyState
        icon={Stethoscope}
        title="No hay consulta en curso. Inicia una desde Mi Dia."
      />
    );
  }

  const p = L.patient(a.pacienteId)!;
  const hist = appointments
    .filter((x) => x.pacienteId === p.id && x.estado === "completed")
    .sort((x, y) => y.fecha.localeCompare(x.fecha));
  const inv = invoices.find(
    (i) => i.citaId === a.id && i.estado !== "cancelled",
  );

  const handleInsertDentalSummary = (summaryText: string) => {
    const nextNotes = notes.trim()
      ? `${notes.trim()}\n\n${summaryText}`
      : summaryText;
    setNotes(nextNotes);
    updateNotes(a.id, nextNotes);
    toast.success("Resumen del odontograma agregado a las notas de consulta");
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-6 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Paciente
          </p>
          <h2 className="mt-2 text-2xl font-extrabold">{p.nombre}</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Edad</span>
            <span className="font-medium">{age(p.nacimiento)} anos</span>
            <span className="text-muted-foreground">Telefono</span>
            <span className="font-medium">{p.telefono}</span>
            <span className="text-muted-foreground">Email</span>
            <span className="truncate font-medium">{p.email}</span>
          </div>
          <p className="mt-6 text-sm font-semibold">Historial clinico</p>
          <div className="mt-2 max-h-80 space-y-2 overflow-y-auto">
            {hist.map((h) => {
              const hHasOdonto = hasOdontogramData(h);
              return (
                <div key={h.id} className="rounded-xl bg-muted p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">
                      {fmtDateLong(h.fecha)} ·{" "}
                      {L.service(h.servicioId)?.nombre}
                    </p>
                    {hHasOdonto && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => setHistoryOdontoAppt(h)}
                      >
                        <SmilePlus className="size-3.5 text-primary" /> Ver
                        Odontograma
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {L.doctor(h.doctorId)?.nombre}
                  </p>
                  <p className="mt-1 whitespace-pre-line">
                    {h.notas || "Sin notas"}
                  </p>
                </div>
              );
            })}
            {!hist.length && (
              <p className="text-sm text-muted-foreground">
                Sin consultas previas.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Consulta actual
              </p>
              <StatusBadge status={a.estado} />
            </div>
            <Button
              type="button"
              size="sm"
              variant={isDental && showOdontogram ? "default" : "outline"}
              onClick={() => setShowOdontogram((v) => !v)}
            >
              <SmilePlus className="size-4" />{" "}
              {showOdontogram ? "Ocultar Odontograma" : "Abrir Odontograma"}
            </Button>
          </div>
          <p className="mt-2 text-lg font-bold">{srv?.nombre}</p>
          <p className="text-sm text-muted-foreground">Motivo: {a.motivo}</p>
          <label className="mt-5 block text-sm font-semibold">
            Notas de la consulta y evolucion
          </label>
          <Textarea
            className="mt-2 min-h-48"
            placeholder="Exploracion, diagnostico, piezas tratadas, tratamiento realizado..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {notes === a.notas ? "Guardado" : "Guardando..."}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              onClick={() => {
                updateNotes(a.id, notes);
                const r = transition(a.id, "completed");
                r.ok
                  ? toast.success("Consulta completada")
                  : toast.error(r.error);
              }}
              className="bg-success text-success-foreground hover:bg-success/90"
            >
              <CheckCircle2 className="size-4" /> Completar Consulta
            </Button>
            <Button
              variant="outline"
              onClick={() => setCharge(true)}
              disabled={inv?.estado === "paid"}
            >
              <CreditCard className="size-4" />{" "}
              {inv?.estado === "paid" ? "Cobrado" : "Cobrar"}
            </Button>
          </div>
        </div>
      </div>

      {/* Odontograma Clinico Interactivo (automatico para Odontologia o al activarlo) */}
      {(isDental || hasOdontogramData(a)) && showOdontogram && (
        <Odontogram
          value={a.odontograma}
          onChange={(next) => updateOdontograma(a.id, next)}
          onInsertSummaryToNotes={handleInsertDentalSummary}
        />
      )}

      {!isDental && !hasOdontogramData(a) && !showOdontogram && null}

      {!isDental && !hasOdontogramData(a) && showOdontogram && (
        <div className="rounded-2xl border bg-muted/30 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <SmilePlus className="size-5 text-primary shrink-0" />
            <span>
              Esta consulta es de <strong>{srv?.nombre}</strong>. Si necesitas registrar hallazgos dentales, puedes inicializar el odontograma para este paciente.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              updateOdontograma(a.id, {
                denticion: "adult",
                teeth: {},
                observaciones: "Evaluacion dental complementaria.",
              })
            }
          >
            Habilitar Odontograma
          </Button>
        </div>
      )}

      <ChargeDialog citaId={a.id} open={charge} onOpenChange={setCharge} />

      {historyOdontoAppt && (
        <Dialog
          open
          onOpenChange={(o) => !o && setHistoryOdontoAppt(null)}
        >
          <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Odontograma del {fmtDateLong(historyOdontoAppt.fecha)} —{" "}
                {p.nombre}
              </DialogTitle>
            </DialogHeader>
            <Odontogram value={historyOdontoAppt.odontograma} readOnly />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setHistoryOdontoAppt(null)}
              >
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function MisPacientes() {
  const appts = useStore((s) => s.appointments);
  const currentDoctorId = useStore((s) => s.currentDoctorId);
  const L = useLookup();
  const [sel, setSel] = useState<string | null>(null);
  const [viewOdontoAppt, setViewOdontoAppt] = useState<Appointment | null>(
    null,
  );
  const mine = appts.filter(
    (a) => a.doctorId === currentDoctorId && a.estado === "completed",
  );
  const ids = [...new Set(mine.map((a) => a.pacienteId))];
  if (sel) {
    const p = L.patient(sel)!;
    const h = mine
      .filter((a) => a.pacienteId === sel)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
    return (
      <div>
        <Button variant="ghost" size="sm" onClick={() => setSel(null)}>
          <ArrowLeft className="size-4" /> Volver
        </Button>
        <h2 className="mt-3 text-2xl font-extrabold">{p.nombre}</h2>
        <p className="text-muted-foreground">
          {age(p.nacimiento)} anos · {p.telefono}
        </p>
        <div className="mt-6 space-y-3">
          {h.map((a) => {
            const hasOdonto = hasOdontogramData(a);
            return (
              <div
                key={a.id}
                className="rounded-2xl border bg-card p-5 shadow-soft"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold">
                    {fmtDateLong(a.fecha)} ·{" "}
                    {L.service(a.servicioId)?.nombre}
                  </p>
                  {hasOdonto && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewOdontoAppt(a)}
                    >
                      <SmilePlus className="size-4 text-primary" /> Ver
                      Odontograma
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Motivo: {a.motivo}
                </p>
                <p className="mt-2 whitespace-pre-line text-sm">
                  {a.notas || "Sin notas"}
                </p>
              </div>
            );
          })}
        </div>

        {viewOdontoAppt && (
          <Dialog
            open
            onOpenChange={(o) => !o && setViewOdontoAppt(null)}
          >
            <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Odontograma del {fmtDateLong(viewOdontoAppt.fecha)} —{" "}
                  {p.nombre}
                </DialogTitle>
              </DialogHeader>
              <Odontogram value={viewOdontoAppt.odontograma} readOnly />
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setViewOdontoAppt(null)}
                >
                  Cerrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }
  if (!ids.length)
    return (
      <EmptyState
        icon={ClipboardList}
        title="Aun no has atendido pacientes"
      />
    );
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {ids.map((id) => {
        const p = L.patient(id);
        const list = mine
          .filter((a) => a.pacienteId === id)
          .sort((a, b) => b.fecha.localeCompare(a.fecha));
        return (
          <button
            key={id}
            onClick={() => setSel(id)}
            className="rounded-2xl border bg-card p-5 text-left shadow-soft transition-all hover:border-primary"
          >
            <span className="grid size-11 place-items-center rounded-full bg-primary-soft font-bold text-primary">
              {p?.nombre[0]}
            </span>
            <p className="mt-3 font-bold">{p?.nombre}</p>
            <p className="text-sm text-muted-foreground">
              Ultima visita: {fmtDateLong(list[0]!.fecha)}
            </p>
            <p className="text-sm text-muted-foreground">
              {list.length} consulta(s)
            </p>
          </button>
        );
      })}
    </div>
  );
}
