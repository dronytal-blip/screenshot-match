import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Hydrated, Logo, ServiceIcon, SlotPicker } from "@/components/medios/shared";
import { useStore } from "@/lib/store";
import { availableSlots } from "@/lib/logic";
import { addDays, fmtDate, fmtDateLong, money, todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/booking")({
  head: () => ({
    meta: [
      { title: "Agendar cita — MediOS" },
      { name: "description", content: "Elige especialidad, doctor y horario para tu cita en Clinica MediOS Demo." },
      { property: "og:title", content: "Agendar cita — MediOS" },
      { property: "og:description", content: "Reserva tu cita medica en linea paso a paso." },
    ],
  }),
  component: () => <Hydrated><Booking /></Hydrated>,
});

const STEPS = ["Especialidad", "Doctor", "Fecha y hora", "Tus datos", "Confirmar"];

function Booking() {
  const { services, doctors, appointments, role, patients, upsertPatient, createAppointment } = useStore();
  const me = role === "patient" ? patients.find((p) => p.id === "pac_01") : undefined;
  const [step, setStep] = useState(0);
  const [srvId, setSrv] = useState<string | null>(null);
  const [docId, setDoc] = useState<string | null>(null);
  const [fecha, setFecha] = useState<string | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [form, setForm] = useState({ nombre: me?.nombre ?? "", telefono: me?.telefono ?? "", email: me?.email ?? "", motivo: "" });
  const [done, setDone] = useState(false);
  const srv = services.find((s) => s.id === srvId);
  const doc = doctors.find((d) => d.id === docId);
  const docsFor = doctors.filter((d) => d.activo && d.especialidadId === srvId);

  const nextSlots = useMemo(() => {
    const map: Record<string, string[]> = {};
    if (!srv) return map;
    for (const d of docsFor) {
      const out: string[] = [];
      for (let i = 0; i < 30 && out.length < 3; i++) {
        const f = addDays(todayISO(), i);
        for (const h of availableSlots(d, f, srv.duracion, appointments)) { if (out.length < 3) out.push(`${fmtDate(f)} · ${h}`); }
      }
      map[d.id] = out;
    }
    return map;
  }, [srv, docsFor, appointments]);

  const formOk = form.nombre.trim().length > 2 && /^\d{10}$/.test(form.telefono) && /\S+@\S+\.\S+/.test(form.email) && form.motivo.trim().length > 2;

  const confirm = () => {
    if (!srv || !doc || !fecha || !hora) return;
    const pid = me?.id ?? upsertPatient({ nombre: form.nombre.trim(), telefono: form.telefono, email: form.email, nacimiento: "1990-01-01" });
    const r = createAppointment({ pacienteId: pid, doctorId: doc.id, servicioId: srv.id, fecha, hora, motivo: form.motivo.trim() });
    if (r.ok) { toast.success("Cita confirmada", { description: "Te enviaremos un recordatorio 24h antes." }); setDone(true); }
    else toast.error(r.error);
  };

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Logo />
          <Button asChild variant="ghost" size="sm"><Link to={role === "patient" ? "/patient" : "/"}>Salir</Link></Button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">
        {!done && (
          <div className="mb-8">
            <div className="flex justify-between text-xs font-semibold text-muted-foreground">
              {STEPS.map((s, i) => <span key={s} className={cn("hidden sm:block", i <= step && "text-primary")}>{i + 1}. {s}</span>)}
              <span className="text-primary sm:hidden">Paso {step + 1} de 5 · {STEPS[step]}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${((step + 1) / 5) * 100}%` }} /></div>
          </div>
        )}

        {done && srv && doc && fecha && hora ? (
          <div className="fade-in-tab mx-auto max-w-md rounded-3xl border bg-card p-8 text-center shadow-soft">
            <CheckCircle2 className="mx-auto size-16 text-success" />
            <h1 className="mt-4 text-2xl font-extrabold">Tu cita esta agendada</h1>
            <p className="mt-1 text-muted-foreground">Te esperamos, {form.nombre.split(" ")[0]}.</p>
            <Summary srv={srv.nombre} precio={srv.precio} doc={doc.nombre} foto={doc.foto} fecha={fecha} hora={hora} motivo={form.motivo} />
            <div className="mt-6 flex flex-col gap-2">
              {role === "patient" && <Button asChild><Link to="/patient">Ver mis citas</Link></Button>}
              <Button asChild variant="outline"><Link to="/">Volver al inicio</Link></Button>
            </div>
          </div>
        ) : (
          <div key={step} className="fade-in-tab">
            {step > 0 && <Button variant="ghost" size="sm" className="mb-4" onClick={() => setStep(step - 1)}><ArrowLeft className="size-4" /> Atras</Button>}
            {step === 0 && (
              <>
                <h1 className="mb-6 text-2xl font-extrabold">Que especialidad necesitas?</h1>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {services.map((s) => (
                    <button key={s.id} onClick={() => { setSrv(s.id); setDoc(null); setFecha(null); setHora(null); setStep(1); }} className="rounded-2xl border bg-card p-6 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary">
                      <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary"><ServiceIcon name={s.icono} className="size-7" /></span>
                      <p className="mt-4 text-lg font-bold">{s.nombre}</p>
                      <p className="text-sm text-muted-foreground">{s.duracion} min · {money(s.precio)}</p>
                    </button>
                  ))}
                </div>
              </>
            )}
            {step === 1 && (
              <>
                <h1 className="mb-6 text-2xl font-extrabold">Elige a tu doctor</h1>
                {docsFor.length === 0 ? <p className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">No hay doctores disponibles para esta especialidad por ahora.</p> : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {docsFor.map((d) => (
                      <button key={d.id} onClick={() => { setDoc(d.id); setFecha(null); setHora(null); setStep(2); }} className="flex gap-4 rounded-2xl border bg-card p-4 text-left shadow-soft transition-all hover:border-primary">
                        <img src={d.foto} alt={d.nombre} className="size-20 rounded-xl object-cover" />
                        <div className="min-w-0">
                          <p className="font-bold">{d.nombre}</p>
                          <p className="text-sm text-primary">{srv?.nombre}</p>
                          <div className="mt-2 flex flex-wrap gap-1">{(nextSlots[d.id] ?? []).map((s) => <span key={s} className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">{s}</span>)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            {step === 2 && doc && srv && (
              <>
                <h1 className="mb-6 text-2xl font-extrabold">Elige fecha y hora</h1>
                <SlotPicker doctor={doc} duracion={srv.duracion} fecha={fecha} hora={hora} onChange={(f, h) => { setFecha(f); setHora(h); }} />
                <Button className="mt-6" disabled={!fecha || !hora} onClick={() => setStep(3)}>Continuar</Button>
              </>
            )}
            {step === 3 && (
              <div className="max-w-lg">
                <h1 className="mb-6 text-2xl font-extrabold">Tus datos</h1>
                <div className="space-y-4">
                  <div className="space-y-1.5"><Label>Nombre completo</Label><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Telefono (10 digitos)</Label><Input value={form.telefono} inputMode="numeric" onChange={(e) => setForm({ ...form, telefono: e.target.value.replace(/\D/g, "").slice(0, 10) })} /></div>
                  <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Motivo de consulta</Label><Textarea rows={3} maxLength={200} value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} /></div>
                  <Button disabled={!formOk} onClick={() => setStep(4)}>Continuar</Button>
                </div>
              </div>
            )}
            {step === 4 && srv && doc && fecha && hora && (
              <div className="mx-auto max-w-md rounded-3xl border bg-card p-8 shadow-soft">
                <h1 className="text-2xl font-extrabold">Confirma tu cita</h1>
                <Summary srv={srv.nombre} precio={srv.precio} doc={doc.nombre} foto={doc.foto} fecha={fecha} hora={hora} motivo={form.motivo} paciente={form.nombre} />
                <Button size="lg" className="mt-6 w-full" onClick={confirm}>Confirmar Cita</Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Summary(p: { srv: string; precio: number; doc: string; foto: string; fecha: string; hora: string; motivo: string; paciente?: string }) {
  return (
    <div className="mt-6 space-y-3 rounded-2xl bg-muted p-5 text-left text-sm">
      <div className="flex items-center gap-3"><img src={p.foto} alt="" className="size-12 rounded-xl object-cover" /><div><p className="font-bold">{p.doc}</p><p className="text-primary">{p.srv}</p></div></div>
      <Row k="Fecha" v={fmtDateLong(p.fecha)} />
      <Row k="Hora" v={p.hora} />
      {p.paciente && <Row k="Paciente" v={p.paciente} />}
      <Row k="Motivo" v={p.motivo} />
      <Row k="Precio" v={money(p.precio)} />
    </div>
  );
}
const Row = ({ k, v }: { k: string; v: string }) => <div className="flex justify-between gap-4"><span className="text-muted-foreground">{k}</span><span className="text-right font-semibold">{v}</span></div>;
