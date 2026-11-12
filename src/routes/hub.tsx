import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  UserCog,
  Users,
  CreditCard,
  TrendingUp,
  CalendarCheck,
  AlertTriangle,
  DollarSign,
  Clock,
  Plus,
  Search,
  Pencil,
  Phone,
  Mail,
  ChevronRight,
  CheckCircle2,
  Settings,
  Trash2,
  BarChart3,
  Building2,
  Sparkles,
  UserCheck,
  Percent,
  Check,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Stethoscope,
  SmilePlus,
  Baby,
  Scan,
  Apple,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  EmptyState,
  Hydrated,
  InvoiceBadge,
  KpiCard,
  StatusBadge,
  ServiceIcon,
  SlotPicker,
  TabBar,
  TopBar,
  useSwipeTabs,
  ICONS,
} from "@/components/medios/shared";
import { useStore, useLookup } from "@/lib/store";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { age, fmtDateLong, todayISO, money, addDays, parseISO } from "@/lib/dates";
import {
  PAY_METHODS,
  invoicePaidAmount,
  invoiceRemaining,
  type Doctor,
  type Patient,
  type Service,
  type PayMethod,
  type Clinic,
  type Invoice,
} from "@/lib/types";

export const Route = createFileRoute("/hub")({
  head: () => ({
    meta: [
      { title: "Administracion — FisioKITS" },
      {
        name: "description",
        content: "Panel de administracion de la clinica FisioKITS.",
      },
      { property: "og:title", content: "Administracion — FisioKITS" },
      {
        property: "og:description",
        content: "Gestiona tu clinica desde un solo lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <Hydrated>
      <ProtectedRoute allowedRoles={["admin"]}>
        <Hub />
      </ProtectedRoute>
    </Hydrated>
  ),
});

type Tab =
  | "dashboard"
  | "agenda"
  | "doctores"
  | "pacientes"
  | "cobros"
  | "reportes"
  | "configuracion";

const TABS = [
  { id: "dashboard" as Tab, label: "Dashboard", icon: LayoutDashboard },
  { id: "agenda" as Tab, label: "Agenda", icon: CalendarDays },
  { id: "doctores" as Tab, label: "Doctores", icon: UserCog },
  { id: "pacientes" as Tab, label: "Pacientes", icon: Users },
  { id: "cobros" as Tab, label: "Cobros", icon: CreditCard },
  { id: "reportes" as Tab, label: "Reportes", icon: BarChart3 },
  { id: "configuracion" as Tab, label: "Configuracion", icon: Settings },
];

function Hub() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const onboardingCompleted = useStore((s) => s.onboardingCompleted);
  const [showOnboarding, setShowOnboarding] = useState(!onboardingCompleted);

  const swipe = useSwipeTabs(
    TABS.map((t) => t.id),
    tab,
    setTab,
  );

  return (
    <div className="min-h-screen">
      <TopBar title="Administracion" subtitle="Panel de gestion" />
      <main className="mx-auto max-w-6xl px-4 pt-4">
        {!onboardingCompleted && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-hero p-6 text-primary-foreground shadow-lift">
            <div className="flex items-center gap-4">
              <span className="grid size-12 place-items-center rounded-2xl bg-white/20">
                <Sparkles className="size-6 text-white" />
              </span>
              <div>
                <h2 className="text-xl font-bold">¡Bienvenido a tu nueva clinica!</h2>
                <p className="text-sm text-primary-foreground/80">
                  Completa la configuracion inicial de tu clinica y equipo medico en 3 sencillos pasos.
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowOnboarding(true)}
              className="rounded-xl bg-card font-bold text-primary shadow-soft hover:bg-card/90"
            >
              Iniciar Asistente
            </Button>
          </div>
        )}

        <TabBar tabs={TABS} value={tab} onChange={setTab} />
        <div key={tab} className="fade-in-tab min-h-[60vh] py-6" {...swipe}>
          {tab === "dashboard" && <Dashboard />}
          {tab === "agenda" && <Agenda />}
          {tab === "doctores" && <Doctores />}
          {tab === "pacientes" && <Pacientes />}
          {tab === "cobros" && <Cobros />}
          {tab === "reportes" && <Reportes />}
          {tab === "configuracion" && (
            <Configuracion onOpenOnboarding={() => setShowOnboarding(true)} />
          )}
        </div>
      </main>

      {showOnboarding && (
        <OnboardingWizard onClose={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}

/* ─────────────── ONBOARDING WIZARD ─────────────── */

function OnboardingWizard({ onClose }: { onClose: () => void }) {
  const { clinic, services, updateClinic, addDoctor, completeOnboarding } =
    useStore();
  const [step, setStep] = useState(0);

  // Paso 1: Clinica
  const [clinicForm, setClinicForm] = useState<Clinic>({ ...clinic });

  // Paso 2: Doctor inicial
  const [docNombre, setDocNombre] = useState("Dr. Director Medico");
  const [docEsp, setDocEsp] = useState(services[0]?.id ?? "srv_gen");
  const [docBio, setDocBio] = useState(
    "Especialista con amplia trayectoria clinica.",
  );
  const [docStart, setDocStart] = useState("09:00");
  const [docEnd, setDocEnd] = useState("18:00");

  const finish = () => {
    updateClinic(clinicForm);
    addDoctor({
      nombre: docNombre.trim() || "Dr. Medico General",
      especialidadId: docEsp,
      bio: docBio.trim(),
      foto:
        "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&q=80&auto=format&fit=crop",
      horario: { days: [1, 2, 3, 4, 5], start: docStart, end: docEnd },
      activo: true,
    });
    completeOnboarding();
    toast.success("¡Configuracion inicial completada con exito!");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="size-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Asistente de configuracion inicial
            </span>
          </div>
          <DialogTitle className="text-2xl font-extrabold">
            {step === 0 && "1. Datos principales de tu clinica"}
            {step === 1 && "2. Servicios y Especialidades activas"}
            {step === 2 && "3. Tu primer doctor o especialista"}
          </DialogTitle>
        </DialogHeader>

        {step === 0 && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Configura el nombre comercial y medios de contacto para tus pacientes.
            </p>
            <div className="space-y-1.5">
              <Label>Nombre de la clinica</Label>
              <Input
                value={clinicForm.nombre}
                onChange={(e) =>
                  setClinicForm({ ...clinicForm, nombre: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Direccion</Label>
              <Input
                value={clinicForm.direccion}
                onChange={(e) =>
                  setClinicForm({ ...clinicForm, direccion: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Telefono</Label>
                <Input
                  value={clinicForm.telefono}
                  onChange={(e) =>
                    setClinicForm({ ...clinicForm, telefono: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  value={clinicForm.email}
                  onChange={(e) =>
                    setClinicForm({ ...clinicForm, email: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Apertura</Label>
                <Input
                  type="time"
                  value={clinicForm.apertura}
                  onChange={(e) =>
                    setClinicForm({ ...clinicForm, apertura: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cierre</Label>
                <Input
                  type="time"
                  value={clinicForm.cierre}
                  onChange={(e) =>
                    setClinicForm({ ...clinicForm, cierre: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Estos son los servicios disponibles en el catalogo inicial. Podras agregar y editar mas en cualquier momento.
            </p>
            <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
              {services.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border bg-card p-3 shadow-soft"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-lg bg-primary-soft text-primary">
                      <ServiceIcon name={s.icono} className="size-4" />
                    </span>
                    <div>
                      <p className="font-semibold text-sm">{s.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.duracion} min · {s.descripcion}
                      </p>
                    </div>
                  </div>
                  <span className="font-display font-extrabold text-sm text-primary">
                    {money(s.precio)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Ingresa al doctor responsable o director medico para habilitar la agenda.
            </p>
            <div className="space-y-1.5">
              <Label>Nombre completo</Label>
              <Input
                value={docNombre}
                onChange={(e) => setDocNombre(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Especialidad</Label>
              <select
                className="w-full rounded-xl border bg-card px-3 py-2 text-sm"
                value={docEsp}
                onChange={(e) => setDocEsp(e.target.value)}
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} ({money(s.precio)})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Resumen profesional</Label>
              <Input
                value={docBio}
                onChange={(e) => setDocBio(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Inicio de jornada</Label>
                <Input
                  type="time"
                  value={docStart}
                  onChange={(e) => setDocStart(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fin de jornada</Label>
                <Input
                  type="time"
                  value={docEnd}
                  onChange={(e) => setDocEnd(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4 flex sm:justify-between">
          {step > 0 ? (
            <Button
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
            >
              <ArrowLeft className="size-4" /> Atras
            </Button>
          ) : (
            <div />
          )}

          {step < 2 ? (
            <Button onClick={() => setStep((s) => s + 1)}>
              Siguiente <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button
              onClick={finish}
              className="bg-success text-success-foreground hover:bg-success/90"
            >
              <Check className="size-4" /> Guardar y Comenzar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────── DASHBOARD ─────────────── */

function Dashboard() {
  const { appointments, invoices, patients, doctors } = useStore();
  const today = todayISO();
  const todayAppts = appointments.filter((a) => a.fecha === today);
  const completedToday = todayAppts.filter(
    (a) => a.estado === "completed",
  ).length;
  const pendingToday = todayAppts.filter((a) =>
    ["scheduled", "confirmed"].includes(a.estado),
  ).length;
  const inProgress = todayAppts.filter(
    (a) => a.estado === "in_progress",
  ).length;

  const monthStart = today.slice(0, 7);
  const monthInvoices = invoices.filter(
    (i) => i.fecha.startsWith(monthStart) && i.estado !== "cancelled",
  );
  const monthRevenue = monthInvoices.reduce(
    (s, i) => s + invoicePaidAmount(i),
    0,
  );
  const pendingInvoices = invoices.filter((i) => i.estado === "pending");
  const pendingTotal = pendingInvoices.reduce(
    (s, i) => s + invoiceRemaining(i),
    0,
  );

  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, -6 + i));
  const weekData = last7.map((d) => ({
    date: d.slice(5),
    citas: appointments.filter(
      (a) => a.fecha === d && a.estado === "completed",
    ).length,
    ingresos: invoices
      .filter((i) => i.fecha === d && i.estado !== "cancelled")
      .reduce((s, i) => s + invoicePaidAmount(i), 0),
  }));
  const maxCitas = Math.max(...weekData.map((d) => d.citas), 1);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Citas hoy"
          value={todayAppts.length}
          icon={CalendarDays}
        />
        <KpiCard
          label="Completadas hoy"
          value={completedToday}
          icon={CalendarCheck}
          tone="success"
        />
        <KpiCard
          label="Ingresos del mes"
          value={money(monthRevenue)}
          icon={TrendingUp}
          tone="success"
        />
        <KpiCard
          label="Pendientes de cobro"
          value={money(pendingTotal)}
          icon={AlertTriangle}
          tone="warning"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Mini chart - last 7 days */}
        <div className="rounded-2xl border bg-card p-6 shadow-soft">
          <h3 className="font-bold">Citas completadas — Ultimos 7 dias</h3>
          <div className="mt-4 flex items-end gap-2" style={{ height: 120 }}>
            {weekData.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-semibold text-primary">
                  {d.citas}
                </span>
                <div
                  className="w-full rounded-t-lg bg-primary transition-all"
                  style={{
                    height: `${(d.citas / maxCitas) * 90}%`,
                    minHeight: d.citas > 0 ? 8 : 2,
                  }}
                />
                <span className="text-[10px] text-muted-foreground">
                  {d.date}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick stats */}
        <div className="rounded-2xl border bg-card p-6 shadow-soft">
          <h3 className="font-bold">Resumen general</h3>
          <div className="mt-4 space-y-3">
            <StatRow
              label="Total pacientes"
              value={patients.length.toString()}
            />
            <StatRow
              label="Doctores activos"
              value={doctors.filter((d) => d.activo).length.toString()}
            />
            <StatRow
              label="En consulta ahora"
              value={inProgress.toString()}
              highlight={inProgress > 0}
            />
            <StatRow
              label="Pendientes hoy"
              value={pendingToday.toString()}
              highlight={pendingToday > 0}
            />
            <StatRow
              label="Facturas pendientes"
              value={pendingInvoices.length.toString()}
              highlight={pendingInvoices.length > 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={`font-display text-lg font-extrabold ${highlight ? "text-warning" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

/* ─────────────── AGENDA ─────────────── */

function Agenda() {
  const { appointments, transition } = useStore();
  const L = useLookup();
  const [dateOffset, setDateOffset] = useState(0);
  const [newApptOpen, setNewApptOpen] = useState(false);
  const viewDate = addDays(todayISO(), dateOffset);

  const dayAppts = appointments
    .filter((a) => a.fecha === viewDate)
    .sort((a, b) => a.hora.localeCompare(b.hora));

  const goToDate = (iso: string) => {
    const t = parseISO(todayISO());
    const target = parseISO(iso);
    const diffDays = Math.round(
      (target.getTime() - t.getTime()) / (1000 * 60 * 60 * 24),
    );
    setDateOffset(diffDays);
  };

  const act = (
    id: string,
    to: "confirmed" | "in_progress" | "no_show" | "cancelled",
  ) => {
    const r = transition(id, to);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    const msgs: Record<string, string> = {
      confirmed: "Cita confirmada",
      in_progress: "Consulta iniciada",
      no_show: "Marcada como no-show",
      cancelled: "Cita cancelada",
    };
    toast.success(msgs[to] ?? "Actualizado");
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDateOffset((d) => d - 1)}
          >
            ← Anterior
          </Button>
          <Button
            variant={dateOffset === 0 ? "default" : "outline"}
            size="sm"
            onClick={() => setDateOffset(0)}
          >
            Hoy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDateOffset((d) => d + 1)}
          >
            Siguiente →
          </Button>
          <span className="ml-2 font-display text-lg font-extrabold">
            {fmtDateLong(viewDate)}
          </span>
        </div>
        <Button onClick={() => setNewApptOpen(true)}>
          <Plus className="size-4" /> Nueva cita
        </Button>
      </div>

      {dayAppts.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Sin citas para este dia"
          action={
            <Button variant="outline" onClick={() => setNewApptOpen(true)}>
              <Plus className="size-4" /> Nueva cita
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {dayAppts.map((a) => {
            const doc = L.doctor(a.doctorId);
            const pac = L.patient(a.pacienteId);
            const srv = L.service(a.servicioId);
            return (
              <div
                key={a.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4 shadow-soft"
              >
                <p className="w-14 font-display text-lg font-extrabold text-primary">
                  {a.hora}
                </p>
                <img
                  src={doc?.foto}
                  alt=""
                  className="size-10 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{pac?.nombre}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {doc?.nombre} · {srv?.nombre} · {a.duracion} min
                  </p>
                  <p className="text-sm text-muted-foreground">{a.motivo}</p>
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
                      Iniciar
                    </Button>
                  )}
                  {["scheduled", "confirmed"].includes(a.estado) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => act(a.id, "cancelled")}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {newApptOpen && (
        <NewAppointmentDialog
          initialDate={viewDate >= todayISO() ? viewDate : null}
          onClose={() => setNewApptOpen(false)}
          onCreated={(fecha) => {
            goToDate(fecha);
            setNewApptOpen(false);
          }}
        />
      )}
    </div>
  );
}

function NewAppointmentDialog({
  initialDate,
  onClose,
  onCreated,
}: {
  initialDate: string | null;
  onClose: () => void;
  onCreated: (fecha: string) => void;
}) {
  const {
    patients,
    doctors,
    services,
    addPatient,
    createAppointment,
  } = useStore();

  const activeDoctors = doctors.filter((d) => d.activo);
  const firstDoc = activeDoctors[0];
  const initialSrvId =
    firstDoc?.especialidadId ?? services[0]?.id ?? "";

  const [pacienteMode, setPacienteMode] = useState<"existing" | "new">(
    patients.length > 0 ? "existing" : "new",
  );
  const [pacienteId, setPacienteId] = useState(patients[0]?.id ?? "");
  const [newPac, setNewPac] = useState({
    nombre: "",
    telefono: "",
    email: "",
    nacimiento: "1990-01-01",
  });

  const [servicioId, setServicioId] = useState(initialSrvId);
  const [doctorId, setDoctorId] = useState(firstDoc?.id ?? "");
  const [fecha, setFecha] = useState<string | null>(initialDate);
  const [hora, setHora] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");

  const srv = services.find((s) => s.id === servicioId);
  const docsForService = activeDoctors.filter(
    (d) => d.especialidadId === servicioId,
  );
  const availableDocs =
    docsForService.length > 0 ? docsForService : activeDoctors;
  const doc =
    availableDocs.find((d) => d.id === doctorId) ?? availableDocs[0];

  const handleServiceChange = (nextSrvId: string) => {
    setServicioId(nextSrvId);
    const matchingDoc = activeDoctors.find(
      (d) => d.especialidadId === nextSrvId,
    );
    if (matchingDoc) {
      setDoctorId(matchingDoc.id);
    }
    setHora(null);
  };

  const handleDoctorChange = (nextDocId: string) => {
    setDoctorId(nextDocId);
    const selectedDoc = activeDoctors.find((d) => d.id === nextDocId);
    if (selectedDoc && services.some((s) => s.id === selectedDoc.especialidadId)) {
      setServicioId(selectedDoc.especialidadId);
    }
    setHora(null);
  };

  const handleSave = () => {
    let targetPatientId = pacienteId;
    if (pacienteMode === "new") {
      if (newPac.nombre.trim().length < 2) {
        toast.error("Ingresa el nombre del nuevo paciente");
        return;
      }
      if (newPac.telefono.trim().length < 6) {
        toast.error("Ingresa el telefono del paciente");
        return;
      }
      targetPatientId = addPatient({
        nombre: newPac.nombre.trim(),
        telefono: newPac.telefono.trim(),
        email: newPac.email.trim(),
        nacimiento: newPac.nacimiento || "1990-01-01",
      });
    } else if (!targetPatientId) {
      toast.error("Selecciona un paciente");
      return;
    }

    if (!srv || !doc) {
      toast.error("Selecciona un servicio y un doctor");
      return;
    }
    if (!fecha || !hora) {
      toast.error("Selecciona una fecha y un horario disponible");
      return;
    }
    if (motivo.trim().length < 2) {
      toast.error("Ingresa el motivo de la consulta");
      return;
    }

    const res = createAppointment({
      pacienteId: targetPatientId,
      doctorId: doc.id,
      servicioId: srv.id,
      fecha,
      hora,
      motivo: motivo.trim(),
    });

    if (!res.ok) {
      toast.error(res.error);
      return;
    }

    toast.success("Cita creada en la agenda");
    onCreated(fecha);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva cita en agenda</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* 1. Paciente */}
          <div className="space-y-2 rounded-2xl border bg-muted/40 p-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold">1. Paciente</Label>
              <button
                type="button"
                onClick={() =>
                  setPacienteMode((m) =>
                    m === "existing" ? "new" : "existing",
                  )
                }
                className="text-xs font-semibold text-primary hover:underline"
              >
                {pacienteMode === "existing"
                  ? "+ Registrar paciente nuevo"
                  : "Seleccionar paciente existente"}
              </button>
            </div>

            {pacienteMode === "existing" ? (
              <select
                className="w-full rounded-xl border bg-card px-3 py-2.5 text-sm"
                value={pacienteId}
                onChange={(e) => setPacienteId(e.target.value)}
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} — {p.telefono} ({p.email || "sin correo"})
                  </option>
                ))}
              </select>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Nombre completo</Label>
                  <Input
                    placeholder="Ej: Carlos Mendoza"
                    value={newPac.nombre}
                    onChange={(e) =>
                      setNewPac({ ...newPac, nombre: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Telefono</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="5512345678"
                    value={newPac.telefono}
                    onChange={(e) =>
                      setNewPac({
                        ...newPac,
                        telefono: e.target.value.replace(/\D/g, "").slice(0, 10),
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Correo electronico</Label>
                  <Input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={newPac.email}
                    onChange={(e) =>
                      setNewPac({ ...newPac, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Fecha de nacimiento</Label>
                  <Input
                    type="date"
                    value={newPac.nacimiento}
                    onChange={(e) =>
                      setNewPac({ ...newPac, nacimiento: e.target.value })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. Servicio y Doctor */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">2. Servicio / Especialidad</Label>
              <select
                className="w-full rounded-xl border bg-card px-3 py-2.5 text-sm"
                value={servicioId}
                onChange={(e) => handleServiceChange(e.target.value)}
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} ({s.duracion} min · {money(s.precio)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-bold">3. Doctor asignado</Label>
              <select
                className="w-full rounded-xl border bg-card px-3 py-2.5 text-sm"
                value={doc?.id ?? ""}
                onChange={(e) => handleDoctorChange(e.target.value)}
              >
                {availableDocs.map((d) => {
                  const docSrv = services.find(
                    (s) => s.id === d.especialidadId,
                  );
                  return (
                    <option key={d.id} value={d.id}>
                      {d.nombre} ({docSrv?.nombre ?? "General"})
                    </option>
                  );
                })}
              </select>
              {docsForService.length === 0 && (
                <p className="text-xs text-warning">
                  Ningun doctor tiene asignada esta especialidad; se muestran todos los doctores activos.
                </p>
              )}
            </div>
          </div>

          {/* 4. Fecha y Hora con SlotPicker */}
          {doc && srv && (
            <div className="space-y-2">
              <Label className="text-sm font-bold">
                4. Fecha y horario disponible ({doc.nombre} · {srv.duracion} min)
              </Label>
              <SlotPicker
                doctor={doc}
                duracion={srv.duracion}
                fecha={fecha}
                hora={hora}
                onChange={(f, h) => {
                  setFecha(f);
                  setHora(h);
                }}
              />
            </div>
          )}

          {/* 5. Motivo */}
          <div className="space-y-1.5">
            <Label className="text-sm font-bold">5. Motivo de la consulta</Label>
            <Textarea
              rows={2}
              placeholder="Ej: Dolor lumbar, control mensual, evaluacion inicial..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={!doc || !srv || !fecha || !hora || motivo.trim().length < 2}
            onClick={handleSave}
          >
            Agendar cita
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────── DOCTORES ─────────────── */

function Doctores() {
  const { doctors, services, appointments, updateDoctor, deleteDoctor } =
    useStore();
  const [editDoc, setEditDoc] = useState<Doctor | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<Doctor | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-extrabold">
          Equipo medico ({doctors.length})
        </h2>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" /> Agregar doctor
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {doctors.map((d) => {
          const srv = services.find((s) => s.id === d.especialidadId);
          const totalAppts = appointments.filter(
            (a) => a.doctorId === d.id && a.estado === "completed",
          ).length;
          return (
            <div
              key={d.id}
              className="overflow-hidden rounded-2xl border bg-card shadow-soft"
            >
              <div className="relative">
                <img
                  src={d.foto}
                  alt={d.nombre}
                  className="aspect-[3/2] w-full object-cover"
                />
                <span
                  className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-xs font-semibold ${d.activo ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"}`}
                >
                  {d.activo ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div className="p-5">
                <h3 className="font-bold">{d.nombre}</h3>
                <p className="text-sm font-medium text-primary">
                  {srv?.nombre ?? "Sin especialidad"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{d.bio}</p>
                <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" />
                    {d.horario.start} - {d.horario.end}
                  </span>
                  <span>{totalAppts} consultas</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setEditDoc(d)}
                  >
                    <Pencil className="size-3.5" /> Editar
                  </Button>
                  <Button
                    variant={d.activo ? "ghost" : "default"}
                    size="sm"
                    onClick={() => {
                      updateDoctor(d.id, { activo: !d.activo });
                      toast.success(
                        d.activo ? "Doctor desactivado" : "Doctor activado",
                      );
                    }}
                  >
                    {d.activo ? "Desactivar" : "Activar"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive-soft hover:text-destructive"
                    title="Eliminar doctor"
                    onClick={() => setDeleteDoc(d)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editDoc && (
        <DoctorFormDialog
          doctor={editDoc}
          onClose={() => setEditDoc(null)}
          mode="edit"
        />
      )}
      {addOpen && (
        <DoctorFormDialog onClose={() => setAddOpen(false)} mode="add" />
      )}

      <AlertDialog
        open={!!deleteDoc}
        onOpenChange={(o) => !o && setDeleteDoc(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar a {deleteDoc?.nombre}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion eliminara al doctor del equipo medico y sus citas asociadas. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteDoc) {
                  deleteDoctor(deleteDoc.id);
                  toast.success("Doctor eliminado");
                  setDeleteDoc(null);
                }
              }}
            >
              Si, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const DAYS_LABELS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

function DoctorFormDialog({
  doctor,
  onClose,
  mode,
}: {
  doctor?: Doctor | undefined;
  onClose: () => void;
  mode: "add" | "edit";
}) {
  const { services, addDoctor, updateDoctor } = useStore();
  const [nombre, setNombre] = useState(doctor?.nombre ?? "");
  const [especialidadId, setEspecialidadId] = useState(
    doctor?.especialidadId ?? services[0]?.id ?? "",
  );
  const [bio, setBio] = useState(doctor?.bio ?? "");
  const [foto, setFoto] = useState(doctor?.foto ?? "");
  const [start, setStart] = useState(doctor?.horario.start ?? "09:00");
  const [end, setEnd] = useState(doctor?.horario.end ?? "17:00");
  const [days, setDays] = useState<number[]>(
    doctor?.horario.days ?? [1, 2, 3, 4, 5],
  );

  const toggleDay = (d: number) =>
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort(),
    );

  const save = () => {
    if (!nombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    const data = {
      nombre: nombre.trim(),
      especialidadId,
      bio: bio.trim(),
      foto:
        foto.trim() ||
        "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&q=80&auto=format&fit=crop",
      horario: { days, start, end },
      activo: doctor?.activo ?? true,
    };
    if (mode === "edit" && doctor) {
      updateDoctor(doctor.id, data);
      toast.success("Doctor actualizado");
    } else {
      addDoctor(data);
      toast.success("Doctor agregado");
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Editar doctor" : "Agregar doctor"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre completo</Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Dr. Juan Perez"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Especialidad</Label>
            <select
              className="w-full rounded-xl border bg-card px-3 py-2 text-sm"
              value={especialidadId}
              onChange={(e) => setEspecialidadId(e.target.value)}
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Bio</Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              placeholder="Experiencia y especialidades..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>URL de foto (opcional)</Label>
            <Input
              value={foto}
              onChange={(e) => setFoto(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Dias laborales</Label>
            <div className="flex gap-1">
              {DAYS_LABELS.map((dl, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${days.includes(i) ? "border-primary bg-primary-soft text-primary" : "text-muted-foreground hover:border-primary"}`}
                >
                  {dl}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Hora inicio</Label>
              <Input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Hora fin</Label>
              <Input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save}>
            {mode === "edit" ? "Guardar cambios" : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────── PACIENTES ─────────────── */

function Pacientes() {
  const { patients, appointments, invoices, deletePatient } = useStore();
  const L = useLookup();
  const [search, setSearch] = useState("");
  const [selId, setSelId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editPac, setEditPac] = useState<Patient | null>(null);
  const [deletePac, setDeletePac] = useState<Patient | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.telefono.includes(q) ||
        p.email.toLowerCase().includes(q),
    );
  }, [patients, search]);

  if (selId) {
    const p = patients.find((x) => x.id === selId);
    if (!p) return null;
    const pAppts = appointments
      .filter((a) => a.pacienteId === selId)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
    const pInvoices = invoices
      .filter((i) => i.pacienteId === selId && i.estado !== "cancelled")
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
    const totalPaid = pInvoices.reduce((s, i) => s + invoicePaidAmount(i), 0);
    const totalPending = pInvoices.reduce(
      (s, i) => s + invoiceRemaining(i),
      0,
    );

    return (
      <div className="fade-in-tab">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelId(null)}>
            ← Volver a lista
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditPac(p)}
            >
              <Pencil className="size-3.5" /> Editar paciente
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive-soft hover:text-destructive"
              onClick={() => setDeletePac(p)}
            >
              <Trash2 className="size-4" /> Eliminar
            </Button>
          </div>
        </div>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_1.5fr]">
          <div className="rounded-2xl border bg-card p-6 shadow-soft">
            <h2 className="text-2xl font-extrabold">{p.nombre}</h2>
            <div className="mt-4 space-y-2 text-sm">
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="size-4" />
                {p.telefono}
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Mail className="size-4" />
                {p.email}
              </p>
              <p className="text-muted-foreground">
                Edad: {age(p.nacimiento)} anos ({p.nacimiento})
              </p>
              <p className="text-muted-foreground">
                Registrado: {fmtDateLong(p.createdAt)}
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-success-soft p-3 text-center">
                <p className="text-xs text-success">Pagado</p>
                <p className="font-display text-lg font-extrabold text-success">
                  {money(totalPaid)}
                </p>
              </div>
              <div className="rounded-xl bg-warning-soft p-3 text-center">
                <p className="text-xs text-warning">Pendiente</p>
                <p className="font-display text-lg font-extrabold text-warning">
                  {money(totalPending)}
                </p>
              </div>
            </div>
          </div>
          <div>
            <h3 className="mb-3 font-bold">
              Historial de citas ({pAppts.length})
            </h3>
            <div className="max-h-[60vh] space-y-3 overflow-y-auto">
              {pAppts.map((a) => (
                <div
                  key={a.id}
                  className="rounded-2xl border bg-card p-4 shadow-soft"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold">
                      {fmtDateLong(a.fecha)} · {a.hora}
                    </p>
                    <StatusBadge status={a.estado} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {L.doctor(a.doctorId)?.nombre} ·{" "}
                    {L.service(a.servicioId)?.nombre}
                  </p>
                  <p className="text-sm text-muted-foreground">{a.motivo}</p>
                  {a.notas && (
                    <p className="mt-2 rounded-lg bg-muted p-2 text-sm">
                      {a.notas}
                    </p>
                  )}
                </div>
              ))}
              {pAppts.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Sin citas registradas.
                </p>
              )}
            </div>
          </div>
        </div>

        {editPac && (
          <PatientFormDialog
            patient={editPac}
            mode="edit"
            onClose={() => setEditPac(null)}
          />
        )}
        <PatientDeleteDialog
          patient={deletePac}
          onClose={() => setDeletePac(null)}
          onConfirm={(id) => {
            deletePatient(id);
            toast.success("Paciente eliminado");
            setDeletePac(null);
            setSelId(null);
          }}
        />
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre, telefono o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {filtered.length} paciente(s)
        </span>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" /> Agregar paciente
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No se encontraron pacientes"
          action={
            <Button variant="outline" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" /> Agregar paciente
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const lastAppt = appointments
              .filter(
                (a) =>
                  a.pacienteId === p.id && a.estado === "completed",
              )
              .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
            const apptCount = appointments.filter(
              (a) => a.pacienteId === p.id,
            ).length;
            return (
              <div
                key={p.id}
                className="flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-soft transition-all hover:border-primary"
              >
                <button
                  type="button"
                  onClick={() => setSelId(p.id)}
                  className="flex w-full items-center gap-4 text-left"
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary-soft font-bold text-primary">
                    {p.nombre[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{p.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      {p.telefono} · {age(p.nacimiento)} anos
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {apptCount} cita(s)
                      {lastAppt && ` · Ultima: ${fmtDateLong(lastAppt.fecha)}`}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
                <div className="mt-4 flex gap-2 border-t pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setEditPac(p)}
                  >
                    <Pencil className="size-3.5" /> Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive-soft hover:text-destructive"
                    title="Eliminar paciente"
                    onClick={() => setDeletePac(p)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {addOpen && (
        <PatientFormDialog mode="add" onClose={() => setAddOpen(false)} />
      )}
      {editPac && (
        <PatientFormDialog
          patient={editPac}
          mode="edit"
          onClose={() => setEditPac(null)}
        />
      )}
      <PatientDeleteDialog
        patient={deletePac}
        onClose={() => setDeletePac(null)}
        onConfirm={(id) => {
          deletePatient(id);
          toast.success("Paciente eliminado");
          setDeletePac(null);
        }}
      />
    </>
  );
}

function PatientFormDialog({
  patient,
  mode,
  onClose,
}: {
  patient?: Patient | undefined;
  mode: "add" | "edit";
  onClose: () => void;
}) {
  const { addPatient, updatePatient } = useStore();
  const [nombre, setNombre] = useState(patient?.nombre ?? "");
  const [telefono, setTelefono] = useState(patient?.telefono ?? "");
  const [email, setEmail] = useState(patient?.email ?? "");
  const [nacimiento, setNacimiento] = useState(
    patient?.nacimiento ?? "1990-01-01",
  );

  const save = () => {
    if (nombre.trim().length < 2) {
      toast.error("Ingresa el nombre completo del paciente");
      return;
    }
    if (telefono.trim().length < 6) {
      toast.error("Ingresa un numero de telefono valido");
      return;
    }
    const payload = {
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
      nacimiento: nacimiento || "1990-01-01",
    };

    if (mode === "edit" && patient) {
      updatePatient(patient.id, payload);
      toast.success("Paciente actualizado");
    } else {
      addPatient(payload);
      toast.success("Paciente agregado");
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Editar paciente" : "Agregar paciente"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre completo</Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Maria Garcia"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Telefono</Label>
              <Input
                inputMode="numeric"
                value={telefono}
                onChange={(e) =>
                  setTelefono(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                placeholder="5512345678"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha de nacimiento</Label>
              <Input
                type="date"
                value={nacimiento}
                onChange={(e) => setNacimiento(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Correo electronico</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="paciente@correo.com"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save}>
            {mode === "edit" ? "Guardar cambios" : "Agregar paciente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PatientDeleteDialog({
  patient,
  onClose,
  onConfirm,
}: {
  patient: Patient | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
}) {
  return (
    <AlertDialog open={!!patient} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Eliminar a {patient?.nombre}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminara la ficha del paciente junto con su historial de citas y cobros asociados. Esta accion no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => patient && onConfirm(patient.id)}
          >
            Si, eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ─────────────── COBROS ─────────────── */

function Cobros() {
  const { invoices, appointments, cancelInvoice } = useStore();
  const L = useLookup();
  const [filter, setFilter] = useState<"all" | "pending" | "paid">("all");
  const [methodFilter, setMethodFilter] = useState<"all" | PayMethod>("all");
  const [payInv, setPayInv] = useState<Invoice | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  const activeInvoices = useMemo(
    () =>
      invoices
        .filter((i) => i.estado !== "cancelled")
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [invoices],
  );

  const list = useMemo(() => {
    let result = activeInvoices;
    if (filter === "pending")
      result = result.filter((i) => i.estado === "pending");
    if (filter === "paid") result = result.filter((i) => i.estado === "paid");
    if (methodFilter !== "all")
      result = result.filter((i) => i.metodo === methodFilter);
    return result;
  }, [activeInvoices, filter, methodFilter]);

  const totalPending = activeInvoices
    .filter((i) => i.estado === "pending")
    .reduce((s, i) => s + invoiceRemaining(i), 0);
  const totalPaid = activeInvoices.reduce(
    (s, i) => s + invoicePaidAmount(i),
    0,
  );
  const totalAdvances = activeInvoices
    .filter((i) => i.estado === "pending" && (i.adelanto ?? 0) > 0)
    .reduce((s, i) => s + (i.adelanto ?? 0), 0);

  return (
    <>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total cobrado (incl. adelantos)"
          value={money(totalPaid)}
          icon={DollarSign}
          tone="success"
        />
        <KpiCard
          label="Saldos pendientes por cobrar"
          value={money(totalPending)}
          icon={AlertTriangle}
          tone="warning"
        />
        <KpiCard
          label="Adelantos en curso"
          value={money(totalAdvances)}
          icon={CreditCard}
          tone="primary"
        />
        <KpiCard
          label="Cobros registrados"
          value={list.length}
          icon={CreditCard}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "pending", "paid"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === "all"
                ? "Todas"
                : f === "pending"
                  ? "Pendientes / Con adelanto"
                  : "Pagadas"}
            </Button>
          ))}
          <span className="mx-1 hidden h-4 w-px bg-border sm:inline-block" />
          <button
            type="button"
            onClick={() => setMethodFilter("all")}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${methodFilter === "all" ? "border-primary bg-primary-soft text-primary" : "text-muted-foreground hover:border-primary"}`}
          >
            Todos los metodos
          </button>
          {PAY_METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethodFilter(m.id)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${methodFilter === m.id ? "border-primary bg-primary-soft text-primary" : "text-muted-foreground hover:border-primary"}`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <Button onClick={() => setManualOpen(true)}>
          <Plus className="size-4" /> Nuevo cobro manual
        </Button>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No hay cobros con este filtro"
          action={
            <Button variant="outline" onClick={() => setManualOpen(true)}>
              <Plus className="size-4" /> Crear cobro manual
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {list.map((inv) => {
            const a = inv.citaId
              ? appointments.find((x) => x.id === inv.citaId)
              : undefined;
            const pac = L.patient(inv.pacienteId);
            const srv = a ? L.service(a.servicioId) : undefined;
            const adelanto = inv.adelanto ?? 0;
            const remaining = invoiceRemaining(inv);
            const hasPartial = inv.estado === "pending" && adelanto > 0;
            const conceptLabel =
              srv?.nombre ?? inv.notas ?? "Cobro manual en clinica";

            return (
              <div
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5 shadow-soft"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft font-bold text-primary">
                      {pac?.nombre[0] ?? "P"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold">{pac?.nombre ?? "Paciente"}</p>
                        {!inv.citaId && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                            Cobro manual
                          </span>
                        )}
                        {inv.metodo && (
                          <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-bold capitalize text-primary">
                            {inv.metodo}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {conceptLabel} · {fmtDateLong(inv.fecha)}
                      </p>
                      {srv && inv.notas && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Nota: {inv.notas}
                        </p>
                      )}
                      {hasPartial && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-lg bg-success-soft px-2.5 py-1 font-semibold text-success">
                            Adelanto abonado: {money(adelanto)}
                          </span>
                          <span className="rounded-lg bg-warning-soft px-2.5 py-1 font-semibold text-warning">
                            Saldo pendiente: {money(remaining)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-right">
                    <p className="font-display text-xl font-extrabold">
                      {money(inv.monto)}
                    </p>
                    {hasPartial && (
                      <p className="text-xs font-semibold text-warning">
                        Resta {money(remaining)}
                      </p>
                    )}
                  </div>
                  <InvoiceBadge status={inv.estado} />
                  {inv.estado === "pending" && (
                    <Button size="sm" onClick={() => setPayInv(inv)}>
                      <CheckCircle2 className="size-3.5" />{" "}
                      {hasPartial ? "Cobrar saldo / Abonar" : "Cobrar / Adelanto"}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive-soft hover:text-destructive"
                    title="Anular cobro"
                    onClick={() => {
                      cancelInvoice(inv.id);
                      toast.message("Cobro anulado");
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {payInv && (
        <PayInvoiceDialog invoice={payInv} onClose={() => setPayInv(null)} />
      )}

      {manualOpen && (
        <ManualChargeDialog onClose={() => setManualOpen(false)} />
      )}
    </>
  );
}

function PayInvoiceDialog({
  invoice,
  onClose,
}: {
  invoice: Invoice;
  onClose: () => void;
}) {
  const { payInvoice } = useStore();
  const L = useLookup();
  const pac = L.patient(invoice.pacienteId);
  const currentAdvance = invoice.adelanto ?? 0;
  const remaining = invoiceRemaining(invoice);

  const [payMode, setPayMode] = useState<"full" | "advance">("full");
  const [abonoInput, setAbonoInput] = useState(
    String(Math.max(10, Math.round(remaining / 2))),
  );
  const [method, setMethod] = useState<PayMethod>(
    invoice.metodo ?? "efectivo",
  );

  const handleConfirm = () => {
    if (payMode === "advance") {
      const abono = Number(abonoInput);
      if (!abono || abono <= 0) {
        toast.error("Ingresa un monto de adelanto mayor a 0");
        return;
      }
      if (abono > remaining) {
        toast.error(
          `El abono no puede superar el saldo pendiente (${money(remaining)})`,
        );
        return;
      }
      payInvoice(invoice.id, method, abono);
      if (abono >= remaining) {
        toast.success(`Saldo completado (${money(abono)}) por ${method}`);
      } else {
        toast.success(
          `Adelanto de ${money(abono)} registrado por ${method}. Resta ${money(remaining - abono)}`,
        );
      }
    } else {
      payInvoice(invoice.id, method);
      toast.success(`Pago de ${money(remaining)} registrado por ${method}`);
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar pago o adelanto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-xl bg-muted p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Paciente: <strong className="text-foreground">{pac?.nombre}</strong>
              </span>
              <span className="text-muted-foreground">
                Total: <strong className="text-foreground">{money(invoice.monto)}</strong>
              </span>
            </div>
            {currentAdvance > 0 && (
              <div className="mt-1 flex items-center justify-between text-xs text-success">
                <span>Adelanto previo abonado</span>
                <span className="font-bold">{money(currentAdvance)}</span>
              </div>
            )}
            <div className="mt-2 flex items-center justify-between border-t pt-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Saldo pendiente actual
              </span>
              <span className="font-display text-2xl font-extrabold text-primary">
                {money(remaining)}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Modalidad de pago</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPayMode("full")}
                className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${payMode === "full" ? "border-primary bg-primary-soft text-primary" : "hover:border-primary"}`}
              >
                Pagar saldo total ({money(remaining)})
              </button>
              <button
                type="button"
                onClick={() => setPayMode("advance")}
                className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${payMode === "advance" ? "border-primary bg-primary-soft text-primary" : "hover:border-primary"}`}
              >
                Dejar adelanto / abono
              </button>
            </div>
          </div>

          {payMode === "advance" && (
            <div className="space-y-1.5 rounded-xl border bg-muted/40 p-3">
              <Label>Monto del adelanto a abonar ahora (S/)</Label>
              <Input
                type="number"
                min={1}
                max={remaining}
                value={abonoInput}
                onChange={(e) => setAbonoInput(e.target.value)}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Nuevo adelanto acumulado:</span>
                <span className="font-bold text-success">
                  {money(currentAdvance + Math.max(0, Number(abonoInput) || 0))}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Nuevo saldo pendiente:</span>
                <span className="font-bold text-warning">
                  {money(Math.max(0, remaining - (Number(abonoInput) || 0)))}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Metodo de pago</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PAY_METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={`rounded-xl border px-2.5 py-2.5 text-sm font-semibold transition-colors ${method === m.id ? "border-primary bg-primary-soft text-primary" : "hover:border-primary"}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            <CheckCircle2 className="size-4" /> Confirmar cobro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManualChargeDialog({ onClose }: { onClose: () => void }) {
  const { patients, appointments, services, createManualInvoice, addPatient } =
    useStore();
  const [patientMode, setPatientMode] = useState<"existing" | "new">(
    patients.length > 0 ? "existing" : "new",
  );
  const [pacienteId, setPacienteId] = useState(patients[0]?.id ?? "");
  const [pacNombre, setPacNombre] = useState("");
  const [pacTel, setPacTel] = useState("");

  const [citaId, setCitaId] = useState<string>("none");
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("80");
  const [chargeMode, setChargeMode] = useState<"full" | "advance" | "pending">(
    "full",
  );
  const [adelanto, setAdelanto] = useState("40");
  const [metodo, setMetodo] = useState<PayMethod>("efectivo");

  const patientAppointments = useMemo(
    () =>
      appointments
        .filter((a) => a.pacienteId === pacienteId && a.estado !== "cancelled")
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [appointments, pacienteId],
  );

  const handleSelectCita = (val: string) => {
    setCitaId(val);
    if (val !== "none") {
      const appt = appointments.find((a) => a.id === val);
      const srv = services.find((s) => s.id === appt?.servicioId);
      if (srv) {
        setMonto(String(srv.precio));
        setAdelanto(String(Math.round(srv.precio / 2)));
        if (!concepto.trim()) setConcepto(srv.nombre);
      }
    }
  };

  const totalNum = Number(monto) || 0;
  const adelantoNum = Number(adelanto) || 0;
  const remaining = Math.max(0, totalNum - adelantoNum);

  const handleSave = () => {
    let targetPacId = pacienteId;
    if (patientMode === "new") {
      if (pacNombre.trim().length < 2) {
        toast.error("Ingresa el nombre del paciente");
        return;
      }
      const createdId = addPatient({
        nombre: pacNombre.trim(),
        telefono: pacTel.trim() || "999999999",
        email: "",
        nacimiento: "1990-01-01",
      });
      targetPacId = createdId;
    } else if (!targetPacId) {
      toast.error("Selecciona un paciente");
      return;
    }

    if (totalNum <= 0) {
      toast.error("Ingresa un monto total mayor a 0");
      return;
    }

    let abonoInicial = 0;
    if (chargeMode === "full") {
      abonoInicial = totalNum;
    } else if (chargeMode === "advance") {
      if (adelantoNum <= 0 || adelantoNum >= totalNum) {
        toast.error(
          "El adelanto debe ser mayor a 0 y menor al monto total (para pago completo elige Pago total)",
        );
        return;
      }
      abonoInicial = adelantoNum;
    }

    createManualInvoice({
      pacienteId: targetPacId,
      citaId: citaId !== "none" ? citaId : undefined,
      monto: totalNum,
      adelanto: abonoInicial,
      metodo: chargeMode === "pending" ? null : metodo,
      notas: concepto.trim() || "Cobro manual en clinica",
    });

    if (chargeMode === "full") {
      toast.success(
        `Cobro manual de ${money(totalNum)} registrado por ${metodo}`,
      );
    } else if (chargeMode === "advance") {
      toast.success(
        `Cobro registrado con adelanto de ${money(abonoInicial)} (${metodo}). Saldo pendiente: ${money(remaining)}`,
      );
    } else {
      toast.success(
        `Cuenta por cobrar de ${money(totalNum)} registrada como pendiente`,
      );
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo cobro manual</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Seleccion de paciente */}
          <div className="space-y-2 rounded-xl border bg-muted/40 p-3.5">
            <div className="flex items-center justify-between">
              <Label className="font-bold">Paciente</Label>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={patientMode === "existing" ? "default" : "ghost"}
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setPatientMode("existing")}
                >
                  Existente
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={patientMode === "new" ? "default" : "ghost"}
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setPatientMode("new")}
                >
                  + Nuevo
                </Button>
              </div>
            </div>

            {patientMode === "existing" ? (
              <select
                value={pacienteId}
                onChange={(e) => {
                  setPacienteId(e.target.value);
                  setCitaId("none");
                }}
                className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.telefono})
                  </option>
                ))}
              </select>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Nombre completo</Label>
                  <Input
                    className="bg-card"
                    value={pacNombre}
                    onChange={(e) => setPacNombre(e.target.value)}
                    placeholder="Ej: Carlos Mendoza"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Telefono</Label>
                  <Input
                    className="bg-card"
                    inputMode="numeric"
                    value={pacTel}
                    onChange={(e) =>
                      setPacTel(e.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                    placeholder="987654321"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Cita vinculada opcional y concepto */}
          {patientMode === "existing" && patientAppointments.length > 0 && (
            <div className="space-y-1.5">
              <Label>Vincular a una cita (opcional)</Label>
              <select
                value={citaId}
                onChange={(e) => handleSelectCita(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="none">
                  Cobro manual libre (sin vincular a cita)
                </option>
                {patientAppointments.map((a) => {
                  const srv = services.find((s) => s.id === a.servicioId);
                  return (
                    <option key={a.id} value={a.id}>
                      {a.fecha} {a.hora} — {srv?.nombre ?? "Consulta"} (
                      {money(srv?.precio ?? 0)})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Concepto / Servicio</Label>
              <Input
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder="Ej: Paquete 5 sesiones fisioterapia"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Monto total (S/)</Label>
              <Input
                type="number"
                min={1}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
              />
            </div>
          </div>

          {/* Modalidad: Pago total, Dejar adelanto, o Por cobrar */}
          <div className="space-y-1.5">
            <Label>Estado del pago hoy</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setChargeMode("full")}
                className={`rounded-xl border px-2.5 py-2.5 text-xs font-semibold transition-colors ${chargeMode === "full" ? "border-primary bg-primary-soft text-primary" : "hover:border-primary"}`}
              >
                Pago total ({money(totalNum)})
              </button>
              <button
                type="button"
                onClick={() => setChargeMode("advance")}
                className={`rounded-xl border px-2.5 py-2.5 text-xs font-semibold transition-colors ${chargeMode === "advance" ? "border-primary bg-primary-soft text-primary" : "hover:border-primary"}`}
              >
                Dejar adelanto
              </button>
              <button
                type="button"
                onClick={() => setChargeMode("pending")}
                className={`rounded-xl border px-2.5 py-2.5 text-xs font-semibold transition-colors ${chargeMode === "pending" ? "border-primary bg-primary-soft text-primary" : "hover:border-primary"}`}
              >
                Dejar por cobrar
              </button>
            </div>
          </div>

          {chargeMode === "advance" && (
            <div className="space-y-2 rounded-xl border bg-muted/40 p-3.5">
              <Label>Monto del adelanto recibido hoy (S/)</Label>
              <Input
                type="number"
                min={1}
                max={Math.max(1, totalNum - 1)}
                value={adelanto}
                onChange={(e) => setAdelanto(e.target.value)}
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Saldo restante por cobrar:
                </span>
                <span className="font-display text-sm font-extrabold text-warning">
                  {money(remaining)}
                </span>
              </div>
            </div>
          )}

          {chargeMode !== "pending" && (
            <div className="space-y-1.5">
              <Label>Metodo de pago</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PAY_METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMetodo(m.id)}
                    className={`rounded-xl border px-2.5 py-2.5 text-sm font-semibold transition-colors ${metodo === m.id ? "border-primary bg-primary-soft text-primary" : "hover:border-primary"}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            <CheckCircle2 className="size-4" /> Guardar cobro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────── REPORTES ─────────────── */

function Reportes() {
  const { appointments, invoices, doctors, services, patients } = useStore();

  const totalAppts = appointments.length;
  const completedAppts = appointments.filter((a) => a.estado === "completed");
  const noShowAppts = appointments.filter((a) => a.estado === "no_show");
  const cancelledAppts = appointments.filter((a) => a.estado === "cancelled");

  // Tasa de no-show
  const noShowRate =
    totalAppts > 0
      ? ((noShowAppts.length / totalAppts) * 100).toFixed(1)
      : "0";

  // Tasa de cumplimiento
  const completionRate =
    totalAppts > 0
      ? ((completedAppts.length / totalAppts) * 100).toFixed(1)
      : "0";

  // Ingresos del mes (incluye pagos completos y adelantos abonados)
  const currentMonth = todayISO().slice(0, 7);
  const monthInvoices = invoices.filter(
    (i) => i.fecha.startsWith(currentMonth) && i.estado !== "cancelled",
  );
  const monthRevenue = monthInvoices.reduce(
    (s, i) => s + invoicePaidAmount(i),
    0,
  );

  // Doctor mas activo
  const doctorStats = doctors.map((doc) => {
    const docAppts = appointments.filter(
      (a) => a.doctorId === doc.id && a.estado === "completed",
    );
    const docRevenue = invoices
      .filter((i) => {
        const appt = appointments.find((a) => a.id === i.citaId);
        return appt?.doctorId === doc.id && i.estado !== "cancelled";
      })
      .reduce((s, i) => s + invoicePaidAmount(i), 0);
    return {
      doc,
      count: docAppts.length,
      revenue: docRevenue,
    };
  });

  const topDoctor = [...doctorStats].sort((a, b) => b.count - a.count)[0];

  // Ingresos por servicio
  const serviceStats = services.map((srv) => {
    const srvAppts = appointments.filter(
      (a) => a.servicioId === srv.id && a.estado === "completed",
    );
    const srvRevenue = invoices
      .filter((i) => {
        const appt = appointments.find((a) => a.id === i.citaId);
        return appt?.servicioId === srv.id && i.estado !== "cancelled";
      })
      .reduce((s, i) => s + invoicePaidAmount(i), 0);
    return {
      srv,
      count: srvAppts.length,
      revenue: srvRevenue,
    };
  });

  const totalRevenue = invoices
    .filter((i) => i.estado !== "cancelled")
    .reduce((s, i) => s + invoicePaidAmount(i), 0);

  // Pacientes recurrentes
  const repeatPatients = patients.filter((p) => {
    const pAppts = appointments.filter((a) => a.pacienteId === p.id);
    return pAppts.length > 1;
  });
  const retentionRate =
    patients.length > 0
      ? ((repeatPatients.length / patients.length) * 100).toFixed(0)
      : "0";

  return (
    <div className="space-y-6">
      {/* KPIs de Reportes */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Ingresos este mes"
          value={money(monthRevenue)}
          icon={TrendingUp}
          tone="success"
        />
        <KpiCard
          label="Tasa de No-Show"
          value={`${noShowRate}%`}
          icon={Percent}
          tone={Number(noShowRate) > 15 ? "destructive" : "primary"}
        />
        <KpiCard
          label="Doctor mas activo"
          value={topDoctor?.doc.nombre.split(" ")[1] ?? "N/A"}
          icon={UserCheck}
          tone="primary"
        />
        <KpiCard
          label="Tasa de retencion"
          value={`${retentionRate}%`}
          icon={Users}
          tone="success"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Desglose de ingresos por especialidad */}
        <div className="rounded-2xl border bg-card p-6 shadow-soft">
          <h3 className="font-bold text-lg">Ingresos por Especialidad</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Distribucion de facturacion sobre el total recaudado ({money(totalRevenue)})
          </p>
          <div className="mt-6 space-y-4">
            {serviceStats.map(({ srv, revenue, count }) => {
              const pct =
                totalRevenue > 0
                  ? Math.round((revenue / totalRevenue) * 100)
                  : 0;
              return (
                <div key={srv.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold flex items-center gap-2">
                      <ServiceIcon name={srv.icono} className="size-4 text-primary" />
                      {srv.nombre} ({count} consultas)
                    </span>
                    <span className="font-display font-extrabold text-primary">
                      {money(revenue)} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Desglose de estados de citas */}
        <div className="rounded-2xl border bg-card p-6 shadow-soft">
          <h3 className="font-bold text-lg">Distribucion de Citas</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Tasa de efectividad: {completionRate}% completadas
          </p>
          <div className="mt-6 space-y-4">
            {[
              {
                label: "Completadas",
                count: completedAppts.length,
                color: "bg-success text-success-foreground",
                barColor: "bg-success",
              },
              {
                label: "Agendadas / Confirmadas",
                count: appointments.filter((a) =>
                  ["scheduled", "confirmed"].includes(a.estado),
                ).length,
                color: "bg-primary text-primary-foreground",
                barColor: "bg-primary",
              },
              {
                label: "Canceladas",
                count: cancelledAppts.length,
                color: "bg-muted text-muted-foreground",
                barColor: "bg-muted-foreground",
              },
              {
                label: "No asistio (No-Show)",
                count: noShowAppts.length,
                color: "bg-destructive text-destructive-foreground",
                barColor: "bg-destructive",
              },
            ].map((stat) => {
              const pct =
                totalAppts > 0
                  ? Math.round((stat.count / totalAppts) * 100)
                  : 0;
              return (
                <div key={stat.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{stat.label}</span>
                    <span className="font-display font-bold">
                      {stat.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${stat.barColor} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Rendimiento por Doctor */}
      <div className="rounded-2xl border bg-card p-6 shadow-soft">
        <h3 className="font-bold text-lg">Rendimiento del Equipo Medico</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Consultas realizadas e ingresos generados por cada profesional
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {doctorStats.map(({ doc, count, revenue }) => {
            const srv = services.find((s) => s.id === doc.especialidadId);
            return (
              <div
                key={doc.id}
                className="flex items-center gap-3.5 rounded-xl border bg-muted/40 p-4"
              >
                <img
                  src={doc.foto}
                  alt={doc.nombre}
                  className="size-12 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-sm">{doc.nombre}</p>
                  <p className="text-xs text-primary font-medium">
                    {srv?.nombre}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {count} citas · {money(revenue)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─────────────── CONFIGURACION ─────────────── */

function Configuracion({
  onOpenOnboarding,
}: {
  onOpenOnboarding: () => void;
}) {
  const { clinic, services, updateClinic, updateServices, reset } = useStore();
  const [form, setForm] = useState<Clinic>({ ...clinic });
  const [serviceModal, setServiceModal] = useState<{
    open: boolean;
    service?: Service;
    mode: "add" | "edit";
  }>({ open: false, mode: "add" });
  const [resetAlertOpen, setResetAlertOpen] = useState(false);

  const saveClinic = () => {
    if (!form.nombre.trim()) {
      toast.error("El nombre de la clinica es obligatorio");
      return;
    }
    updateClinic(form);
    toast.success("Informacion de la clinica actualizada");
  };

  const deleteService = (id: string) => {
    if (services.length <= 1) {
      toast.error("Debe existir al menos un servicio activo");
      return;
    }
    const filtered = services.filter((s) => s.id !== id);
    updateServices(filtered);
    toast.success("Servicio eliminado");
  };

  return (
    <div className="space-y-8">
      {/* Seccion 1: Datos de la clinica */}
      <div className="rounded-2xl border bg-card p-6 shadow-soft">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
            <Building2 className="size-5" />
          </span>
          <div>
            <h2 className="text-xl font-extrabold">Datos de la Clinica</h2>
            <p className="text-sm text-muted-foreground">
              Informacion visible para los pacientes en la web y los comprobantes.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Nombre de la clinica</Label>
            <Input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Direccion</Label>
            <Input
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Telefono</Label>
            <Input
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Correo electronico</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Horario de apertura</Label>
            <Input
              type="time"
              value={form.apertura}
              onChange={(e) => setForm({ ...form, apertura: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Horario de cierre</Label>
            <Input
              type="time"
              value={form.cierre}
              onChange={(e) => setForm({ ...form, cierre: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={saveClinic}>Guardar Cambios de Clinica</Button>
        </div>
      </div>

      {/* Seccion 2: Servicios y Especialidades */}
      <div className="rounded-2xl border bg-card p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
              <Stethoscope className="size-5" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold">
                Servicios y Especialidades ({services.length})
              </h2>
              <p className="text-sm text-muted-foreground">
                Configura tarifas, tiempos de consulta y catalogo disponible.
              </p>
            </div>
          </div>
          <Button
            onClick={() =>
              setServiceModal({ open: true, mode: "add" })
            }
          >
            <Plus className="size-4" /> Nuevo Servicio
          </Button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <div
              key={s.id}
              className="flex flex-col justify-between rounded-2xl border bg-background p-5 shadow-soft transition-all"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
                    <ServiceIcon name={s.icono} className="size-5" />
                  </span>
                  <span className="font-display font-extrabold text-lg text-primary">
                    {money(s.precio)}
                  </span>
                </div>
                <h3 className="mt-4 font-bold text-base">{s.nombre}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Duracion: {s.duracion} minutos
                </p>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                  {s.descripcion}
                </p>
              </div>

              <div className="mt-4 flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() =>
                    setServiceModal({
                      open: true,
                      mode: "edit",
                      service: s,
                    })
                  }
                >
                  <Pencil className="size-3.5" /> Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive-soft hover:text-destructive"
                  onClick={() => deleteService(s.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Seccion 3: Asistente y Opciones de Demo */}
      <div className="rounded-2xl border bg-card p-6 shadow-soft">
        <h2 className="text-xl font-extrabold">Opciones del Sistema & Demo</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Herramientas de demostracion y restablecimiento del estado local.
        </p>

        <div className="mt-6 flex flex-wrap gap-4">
          <Button
            variant="outline"
            onClick={onOpenOnboarding}
            className="flex items-center gap-2"
          >
            <Sparkles className="size-4 text-primary" />
            Reabrir Asistente de Onboarding
          </Button>

          <Button
            variant="ghost"
            className="text-destructive hover:bg-destructive-soft hover:text-destructive flex items-center gap-2"
            onClick={() => setResetAlertOpen(true)}
          >
            <RotateCcw className="size-4" />
            Restablecer Datos de Demo
          </Button>
        </div>
      </div>

      {/* Dialog para Agregar/Editar Servicio */}
      {serviceModal.open && (
        <ServiceFormDialog
          service={serviceModal.service}
          mode={serviceModal.mode}
          onClose={() =>
            setServiceModal({ open: false, mode: "add" })
          }
        />
      )}

      {/* Confirmacion de Reset */}
      <AlertDialog
        open={resetAlertOpen}
        onOpenChange={setResetAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Restablecer datos de prueba?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion repondra los datos iniciales de demo (doctores, citas,
              pacientes y facturas originales) y reiniciara el estado del onboarding.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                reset();
                toast.success("Datos restablecidos correctamente");
                setResetAlertOpen(false);
              }}
            >
              Si, restablecer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ServiceFormDialog({
  service,
  mode,
  onClose,
}: {
  service?: Service | undefined;
  mode: "add" | "edit";
  onClose: () => void;
}) {
  const { services, updateServices } = useStore();
  const [nombre, setNombre] = useState(service?.nombre ?? "");
  const [duracion, setDuracion] = useState(service?.duracion ?? 30);
  const [precio, setPrecio] = useState(service?.precio ?? 800);
  const [descripcion, setDescripcion] = useState(service?.descripcion ?? "");
  const [icono, setIcono] = useState(service?.icono ?? "Stethoscope");

  const availableIcons = ["Stethoscope", "SmilePlus", "Baby", "Scan", "Apple"];

  const save = () => {
    if (!nombre.trim()) {
      toast.error("El nombre del servicio es obligatorio");
      return;
    }
    if (duracion <= 0) {
      toast.error("La duracion debe ser mayor a 0 minutos");
      return;
    }
    if (precio < 0) {
      toast.error("El precio no puede ser negativo");
      return;
    }

    if (mode === "edit" && service) {
      const updated = services.map((s) =>
        s.id === service.id
          ? {
              ...s,
              nombre: nombre.trim(),
              duracion: Number(duracion),
              precio: Number(precio),
              descripcion: descripcion.trim(),
              icono,
            }
          : s,
      );
      updateServices(updated);
      toast.success("Servicio actualizado");
    } else {
      const newSrv: Service = {
        id: `srv_${Date.now().toString(36)}`,
        nombre: nombre.trim(),
        duracion: Number(duracion),
        precio: Number(precio),
        descripcion: descripcion.trim(),
        icono,
      };
      updateServices([...services, newSrv]);
      toast.success("Nuevo servicio agregado");
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Editar Servicio" : "Nuevo Servicio"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Nombre del servicio</Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Fisioterapia Deportiva"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Duracion (minutos)</Label>
              <Input
                type="number"
                step="5"
                min="10"
                value={duracion}
                onChange={(e) => setDuracion(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Precio (S/)</Label>
              <Input
                type="number"
                step="10"
                min="0"
                value={precio}
                onChange={(e) => setPrecio(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Descripcion</Label>
            <Textarea
              rows={2}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Detalles sobre lo que incluye la sesion o consulta..."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Icono</Label>
            <div className="flex gap-2">
              {availableIcons.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcono(ic)}
                  className={`grid size-10 place-items-center rounded-xl border transition-all ${
                    icono === ic
                      ? "border-primary bg-primary text-primary-foreground shadow-soft"
                      : "bg-muted text-muted-foreground hover:border-primary"
                  }`}
                >
                  <ServiceIcon name={ic} className="size-5" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save}>
            {mode === "edit" ? "Guardar cambios" : "Crear servicio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
