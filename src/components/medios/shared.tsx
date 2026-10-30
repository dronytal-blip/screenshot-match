import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Apple, Baby, HeartPulse, RotateCcw, Scan, SmilePlus, Stethoscope, LogOut, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import type { ApptStatus, Doctor, InvoiceStatus, PayMethod } from "@/lib/types";
import { availableSlots } from "@/lib/logic";
import { addDays, parseISO, toISODate, todayISO, money } from "@/lib/dates";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const ICONS: Record<string, LucideIcon> = { Stethoscope, SmilePlus, Baby, Scan, Apple };
export function ServiceIcon({ name, className }: { name: string; className?: string }) {
  const I = ICONS[name] ?? Stethoscope;
  return <I className={className} />;
}

const STATUS: Record<ApptStatus, { label: string; cls: string }> = {
  scheduled: { label: "Agendada", cls: "bg-primary-soft text-primary" },
  confirmed: { label: "Confirmada", cls: "bg-primary-deep text-primary-foreground" },
  in_progress: { label: "En consulta", cls: "bg-warning-soft text-warning" },
  completed: { label: "Completada", cls: "bg-success-soft text-success" },
  cancelled: { label: "Cancelada", cls: "bg-muted text-muted-foreground" },
  no_show: { label: "No asistio", cls: "bg-destructive-soft text-destructive" },
};
export const statusLabel = (s: ApptStatus) => STATUS[s].label;

export function StatusBadge({ status }: { status: ApptStatus }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS[status].cls)}>{STATUS[status].label}</span>;
}

const INV: Record<InvoiceStatus, { label: string; cls: string }> = {
  paid: { label: "Pagado", cls: "bg-success-soft text-success" },
  pending: { label: "Pendiente", cls: "bg-warning-soft text-warning" },
  cancelled: { label: "Cancelado", cls: "bg-destructive-soft text-destructive" },
};
export function InvoiceBadge({ status }: { status: InvoiceStatus }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", INV[status].cls)}>{INV[status].label}</span>;
}

export function Logo({ light }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="grid size-9 place-items-center rounded-xl bg-hero text-primary-foreground shadow-lift">
        <HeartPulse className="size-5" />
      </span>
      <span className={cn("font-display text-lg font-extrabold tracking-tight", light ? "text-primary-foreground" : "text-foreground")}>
        Medi<span className={light ? "" : "text-primary"}>OS</span>
      </span>
    </Link>
  );
}

/** Rehydrates the persisted store on the client and renders children only afterwards. */
export function Hydrated({ children }: { children: ReactNode }) {
  const hydrated = useStore((s) => s.hydrated);
  useEffect(() => {
    if (!useStore.getState().hydrated) void useStore.persist.rehydrate();
  }, []);
  if (!hydrated)
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  return <>{children}</>;
}

export function ResetButton({ compact }: { compact?: boolean }) {
  const reset = useStore((s) => s.reset);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        reset();
        toast.success("Datos de demo restablecidos");
      }}
    >
      <RotateCcw className="size-4" />
      {!compact && <span className="hidden sm:inline">Reset demo</span>}
    </Button>
  );
}

export function LogoutButton() {
  const nav = useNavigate();
  const setRole = useStore((s) => s.setRole);
  return (
    <Button variant="ghost" size="sm" onClick={() => { setRole(null); nav({ to: "/auth" }); }}>
      <LogOut className="size-4" /> <span className="hidden sm:inline">Salir</span>
    </Button>
  );
}

export function TopBar({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-4">
          <Logo />
          <div className="hidden border-l pl-4 sm:block">
            <p className="text-sm font-semibold leading-tight">{title}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ResetButton />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}

/** Horizontal, swipeable tab bar. */
export function TabBar<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; icon?: LucideIcon }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="no-scrollbar -mx-4 flex snap-x gap-1 overflow-x-auto border-b px-4">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "flex shrink-0 snap-start items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
            value === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {t.icon && <t.icon className="size-4" />}
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Adds horizontal swipe on touch devices to move between tabs. */
export function useSwipeTabs<T extends string>(tabs: T[], value: T, onChange: (t: T) => void) {
  const [x, setX] = useState<number | null>(null);
  return {
    onTouchStart: (e: React.TouchEvent) => setX(e.touches[0]!.clientX),
    onTouchEnd: (e: React.TouchEvent) => {
      if (x === null) return;
      const dx = e.changedTouches[0]!.clientX - x;
      const i = tabs.indexOf(value);
      if (dx < -60 && i < tabs.length - 1) onChange(tabs[i + 1]!);
      if (dx > 60 && i > 0) onChange(tabs[i - 1]!);
      setX(null);
    },
  };
}

export function EmptyState({ icon: I, title, action }: { icon: LucideIcon; title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-card p-12 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-primary-soft text-primary"><I className="size-6" /></span>
      <p className="font-medium text-muted-foreground">{title}</p>
      {action}
    </div>
  );
}

/** Calendar + time slots picker for one doctor. */
export function SlotPicker({ doctor, duracion, fecha, hora, onChange, excludeId }: {
  doctor: Doctor; duracion: number; fecha: string | null; hora: string | null; onChange: (fecha: string, hora: string | null) => void; excludeId?: string;
}) {
  const appts = useStore((s) => s.appointments);
  const today = todayISO();
  const maxDate = addDays(today, 60);
  const slots = useMemo(() => (fecha ? availableSlots(doctor, fecha, duracion, appts, new Date(), excludeId) : []), [doctor, fecha, duracion, appts, excludeId]);
  return (
    <div className="grid gap-6 md:grid-cols-[auto_1fr]">
      <div className="rounded-2xl border bg-card p-2 shadow-soft">
        <Calendar
          mode="single"
          selected={fecha ? parseISO(fecha) : undefined}
          onSelect={(d) => d && onChange(toISODate(d), null)}
          disabled={(d) => {
            const iso = toISODate(d);
            if (iso < today || iso > maxDate) return true;
            return availableSlots(doctor, iso, duracion, appts, new Date(), excludeId).length === 0;
          }}
        />
      </div>
      <div>
        <p className="mb-3 text-sm font-semibold text-muted-foreground">{fecha ? "Horarios disponibles" : "Selecciona un dia"}</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map((s) => (
            <button
              key={s}
              onClick={() => onChange(fecha!, s)}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all hover:border-primary hover:text-primary",
                hora === s ? "border-primary bg-primary text-primary-foreground hover:text-primary-foreground" : "bg-card",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ChargeDialog({ citaId, open, onOpenChange }: { citaId: string | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { appointments, services, charge, invoices } = useStore();
  const a = appointments.find((x) => x.id === citaId);
  const srv = a && services.find((s) => s.id === a.servicioId);
  const existing = invoices.find((i) => i.citaId === citaId && i.estado !== "cancelled");
  const [monto, setMonto] = useState(0);
  const [metodo, setMetodo] = useState<PayMethod>("efectivo");
  const [notas, setNotas] = useState("");
  useEffect(() => {
    if (open) { setMonto(existing?.monto ?? srv?.precio ?? 0); setMetodo("efectivo"); setNotas(""); }
  }, [open, srv, existing]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Cobro rapido</DialogTitle></DialogHeader>
        {existing?.estado === "paid" ? (
          <p className="text-sm text-muted-foreground">Esta consulta ya fue cobrada ({money(existing.monto)}).</p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{srv?.nombre}</p>
            <div className="space-y-1.5"><Label>Monto (MXN)</Label><Input type="number" value={monto} onChange={(e) => setMonto(Number(e.target.value))} /></div>
            <div className="space-y-1.5">
              <Label>Metodo de pago</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["efectivo", "tarjeta", "transferencia"] as PayMethod[]).map((m) => (
                  <button key={m} onClick={() => setMetodo(m)} className={cn("rounded-xl border px-2 py-2.5 text-sm font-semibold capitalize transition-colors", metodo === m ? "border-primary bg-primary-soft text-primary" : "hover:border-primary")}>{m}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5"><Label>Notas (opcional)</Label><Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} /></div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          {existing?.estado !== "paid" && (
            <Button onClick={() => {
              if (!citaId) return;
              const r = charge(citaId, monto, metodo, notas);
              if (r.ok) { toast.success(`Cobro de ${money(monto)} registrado`); onOpenChange(false); } else toast.error(r.error);
            }}>Confirmar Cobro</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function KpiCard({ label, value, icon: I, tone = "primary" }: { label: string; value: ReactNode; icon: LucideIcon; tone?: "primary" | "success" | "destructive" | "warning" }) {
  const tones = { primary: "bg-primary-soft text-primary", success: "bg-success-soft text-success", destructive: "bg-destructive-soft text-destructive", warning: "bg-warning-soft text-warning" };
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className={cn("grid size-9 place-items-center rounded-xl", tones[tone])}><I className="size-4" /></span>
      </div>
      <p className="mt-3 font-display text-2xl font-extrabold">{value}</p>
    </div>
  );
}
