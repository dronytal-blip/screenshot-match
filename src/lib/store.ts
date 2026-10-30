import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Appointment, ApptStatus, Clinic, Doctor, Invoice, Patient, PayMethod, Role, Service } from "./types";
import { seedAppointments, seedClinic, seedDoctors, seedInvoices, seedPatients, seedServices } from "./seed";
import { availableSlots, canTransition } from "./logic";
import { todayISO } from "./dates";

export const CURRENT_DOCTOR = "doc_01";
export const CURRENT_PATIENT = "pac_01";

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const nowTs = () => new Date().toISOString();

type Result = { ok: true; id?: string } | { ok: false; error: string };

interface State {
  clinic: Clinic;
  services: Service[];
  doctors: Doctor[];
  patients: Patient[];
  appointments: Appointment[];
  invoices: Invoice[];
  role: Role | null;
  onboardingCompleted: boolean;
  hydrated: boolean;
  setRole: (r: Role | null) => void;
  reset: () => void;
  completeOnboarding: () => void;
  transition: (id: string, to: ApptStatus) => Result;
  createAppointment: (d: { pacienteId: string; doctorId: string; servicioId: string; fecha: string; hora: string; motivo: string }) => Result;
  reschedule: (id: string, fecha: string, hora: string) => Result;
  updateNotes: (id: string, notas: string) => void;
  charge: (citaId: string, monto: number, metodo: PayMethod, notas: string) => Result;
  payInvoice: (id: string, metodo: PayMethod) => void;
  upsertPatient: (d: Omit<Patient, "id" | "createdAt">) => string;
  addDoctor: (d: Omit<Doctor, "id" | "color">) => void;
  updateDoctor: (id: string, d: Partial<Doctor>) => void;
  updateClinic: (c: Clinic) => void;
  updateServices: (s: Service[]) => void;
}

const PALETTE = ["oklch(0.6 0.15 200)", "oklch(0.55 0.18 290)", "oklch(0.62 0.16 100)", "oklch(0.6 0.2 20)"];

const fresh = () => ({
  clinic: seedClinic(),
  services: seedServices(),
  doctors: seedDoctors(),
  patients: seedPatients(),
  appointments: seedAppointments(),
  invoices: seedInvoices(),
});

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...fresh(),
      role: null,
      onboardingCompleted: false,
      hydrated: false,
      setRole: (role) => set({ role }),
      reset: () => set({ ...fresh(), onboardingCompleted: false }),
      completeOnboarding: () => set({ onboardingCompleted: true }),

      transition: (id, to) => {
        const a = get().appointments.find((x) => x.id === id);
        if (!a) return { ok: false, error: "Cita no encontrada" };
        if (!canTransition(a.estado, to)) return { ok: false, error: `Transicion invalida: ${a.estado} → ${to}` };
        if (to === "in_progress") {
          const busy = get().appointments.some((x) => x.doctorId === a.doctorId && x.estado === "in_progress");
          if (busy) return { ok: false, error: "Ya hay una consulta en curso" };
        }
        const events: { tipo: string; timestamp: string }[] = [{ tipo: to, timestamp: nowTs() }];
        let invoices = get().invoices;
        if (to === "completed" && !invoices.some((i) => i.citaId === id && i.estado !== "cancelled")) {
          const srv = get().services.find((s) => s.id === a.servicioId);
          invoices = [
            ...invoices,
            { id: uid("inv"), citaId: id, pacienteId: a.pacienteId, monto: srv?.precio ?? 0, estado: "pending", metodo: null, fechaPago: null, fecha: todayISO(), notas: "" },
          ];
          events.push({ tipo: "invoice_created", timestamp: nowTs() });
        }
        if (to === "cancelled") {
          invoices = invoices.map((i) => (i.citaId === id && i.estado === "pending" ? { ...i, estado: "cancelled" } : i));
        }
        set({
          invoices,
          appointments: get().appointments.map((x) => (x.id === id ? { ...x, estado: to, eventos: [...x.eventos, ...events] } : x)),
        });
        return { ok: true };
      },

      createAppointment: (d) => {
        const { doctors, services, appointments } = get();
        const doc = doctors.find((x) => x.id === d.doctorId);
        const srv = services.find((x) => x.id === d.servicioId);
        if (!doc || !srv || !d.pacienteId) return { ok: false, error: "Faltan datos de la cita" };
        if (!availableSlots(doc, d.fecha, srv.duracion, appointments).includes(d.hora))
          return { ok: false, error: "Horario no disponible" };
        const id = uid("apt");
        set({
          appointments: [
            ...appointments,
            { id, ...d, duracion: srv.duracion, estado: "scheduled", notas: "", eventos: [{ tipo: "created", timestamp: nowTs() }] },
          ],
        });
        return { ok: true, id };
      },

      reschedule: (id, fecha, hora) => {
        const { appointments, doctors } = get();
        const a = appointments.find((x) => x.id === id);
        const doc = a && doctors.find((x) => x.id === a.doctorId);
        if (!a || !doc) return { ok: false, error: "Cita no encontrada" };
        if (!availableSlots(doc, fecha, a.duracion, appointments, new Date(), id).includes(hora))
          return { ok: false, error: "Horario no disponible" };
        set({
          appointments: appointments.map((x) =>
            x.id === id ? { ...x, fecha, hora, estado: "scheduled", eventos: [...x.eventos, { tipo: "rescheduled", timestamp: nowTs() }] } : x,
          ),
        });
        return { ok: true };
      },

      updateNotes: (id, notas) =>
        set({
          appointments: get().appointments.map((x) => {
            if (x.id !== id) return x;
            const had = x.eventos.some((e) => e.tipo === "notes_added");
            return { ...x, notas, eventos: had ? x.eventos : [...x.eventos, { tipo: "notes_added", timestamp: nowTs() }] };
          }),
        }),

      charge: (citaId, monto, metodo, notas) => {
        const a = get().appointments.find((x) => x.id === citaId);
        if (!a) return { ok: false, error: "Cita no encontrada" };
        if (monto <= 0) return { ok: false, error: "Monto invalido" };
        const existing = get().invoices.find((i) => i.citaId === citaId && i.estado !== "cancelled");
        if (existing?.estado === "paid") return { ok: false, error: "Esta consulta ya fue cobrada" };
        const paid = { monto, metodo, notas, estado: "paid" as const, fechaPago: todayISO() };
        set({
          invoices: existing
            ? get().invoices.map((i) => (i.id === existing.id ? { ...i, ...paid } : i))
            : [...get().invoices, { id: uid("inv"), citaId, pacienteId: a.pacienteId, fecha: todayISO(), ...paid }],
          appointments: existing
            ? get().appointments
            : get().appointments.map((x) => (x.id === citaId ? { ...x, eventos: [...x.eventos, { tipo: "invoice_created", timestamp: nowTs() }] } : x)),
        });
        return { ok: true };
      },

      payInvoice: (id, metodo) =>
        set({ invoices: get().invoices.map((i) => (i.id === id ? { ...i, estado: "paid", metodo, fechaPago: todayISO() } : i)) }),

      upsertPatient: (d) => {
        const found = get().patients.find((p) => p.telefono === d.telefono);
        if (found) return found.id;
        const id = uid("pac");
        set({ patients: [...get().patients, { ...d, id, createdAt: todayISO() }] });
        return id;
      },

      addDoctor: (d) => {
        const n = get().doctors.length;
        set({ doctors: [...get().doctors, { ...d, id: uid("doc"), color: PALETTE[n % PALETTE.length]! }] });
      },
      updateDoctor: (id, d) => set({ doctors: get().doctors.map((x) => (x.id === id ? { ...x, ...d } : x)) }),
      updateClinic: (clinic) => set({ clinic }),
      updateServices: (services) => set({ services }),
    }),
    {
      name: "medios-store",
      skipHydration: true,
      partialize: ({ hydrated: _h, ...rest }) => rest,
      onRehydrateStorage: () => () => useStore.setState({ hydrated: true }),
    },
  ),
);

// helpers
export const useLookup = () => {
  const { doctors, patients, services } = useStore();
  return {
    doctor: (id: string) => doctors.find((d) => d.id === id),
    patient: (id: string) => patients.find((p) => p.id === id),
    service: (id: string) => services.find((s) => s.id === id),
  };
};
