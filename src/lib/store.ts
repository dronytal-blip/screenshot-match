import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Appointment,
  ApptStatus,
  Clinic,
  Doctor,
  Invoice,
  OdontogramData,
  Patient,
  PayMethod,
  Role,
  Service,
} from "./types";
import {
  seedAppointments,
  seedClinic,
  seedDoctors,
  seedInvoices,
  seedPatients,
  seedServices,
} from "./seed";
import { availableSlots, canTransition } from "./logic";
import { todayISO } from "./dates";
import { supabase } from "./supabase";
import {
  cancelInvoiceDb,
  createAppointmentDb,
  createDoctorDb,
  createPatientDb,
  deleteDoctorDb,
  deletePatientDb,
  fetchAppointments,
  fetchClinic,
  fetchDoctors,
  fetchInvoices,
  fetchPatients,
  fetchServices,
  isUuid,
  newUuid,
  rescheduleAppointmentDb,
  syncServicesDb,
  transitionAppointmentDb,
  updateAppointmentNotesDb,
  updateAppointmentOdontogramaDb,
  updateClinicDb,
  updateDoctorDb,
  updateInvoicePaymentDb,
  updatePatientDb,
  upsertInvoiceDb,
} from "./api";

export const CURRENT_DOCTOR = "doc_01";
export const CURRENT_PATIENT = "pac_01";

const uid = (p: string, live: boolean) =>
  live
    ? newUuid()
    : `${p}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const nowTs = () => new Date().toISOString();

type Result = { ok: true; id?: string } | { ok: false; error: string };

interface State {
  clinicId: string | null;
  clinic: Clinic;
  services: Service[];
  doctors: Doctor[];
  patients: Patient[];
  appointments: Appointment[];
  invoices: Invoice[];
  role: Role | null;
  currentDoctorId: string;
  currentPatientId: string;
  onboardingCompleted: boolean;
  hydrated: boolean;
  supabaseSynced: boolean;
  syncing: boolean;
  setRole: (r: Role | null) => void;
  setCurrentDoctor: (doctorId: string) => void;
  syncFromSupabase: (userId?: string | null) => Promise<void>;
  reset: () => void;
  completeOnboarding: () => void;
  transition: (id: string, to: ApptStatus) => Result;
  createAppointment: (d: {
    pacienteId: string;
    doctorId: string;
    servicioId: string;
    fecha: string;
    hora: string;
    motivo: string;
  }) => Result;
  reschedule: (id: string, fecha: string, hora: string) => Result;
  updateNotes: (id: string, notas: string) => void;
  updateOdontograma: (id: string, odontograma: OdontogramData) => void;
  charge: (
    citaId: string,
    monto: number,
    metodo: PayMethod,
    notas: string,
    abono?: number,
  ) => Result;
  payInvoice: (id: string, metodo: PayMethod, abono?: number) => Result;
  createManualInvoice: (d: {
    pacienteId: string;
    citaId?: string | undefined;
    monto: number;
    adelanto?: number | undefined;
    metodo: PayMethod | null;
    notas: string;
  }) => Result;
  cancelInvoice: (id: string) => void;
  upsertPatient: (d: Omit<Patient, "id" | "createdAt">) => string;
  addPatient: (d: Omit<Patient, "id" | "createdAt">) => string;
  updatePatient: (
    id: string,
    d: Partial<Omit<Patient, "id" | "createdAt">>,
  ) => void;
  deletePatient: (id: string) => void;
  addDoctor: (d: Omit<Doctor, "id" | "color">) => void;
  updateDoctor: (id: string, d: Partial<Doctor>) => void;
  deleteDoctor: (id: string) => void;
  updateClinic: (c: Clinic) => void;
  updateServices: (s: Service[]) => void;
}

const PALETTE = [
  "oklch(0.6 0.15 200)",
  "oklch(0.55 0.18 290)",
  "oklch(0.62 0.16 100)",
  "oklch(0.6 0.2 20)",
];

const fresh = () => ({
  clinicId: null as string | null,
  clinic: seedClinic(),
  services: seedServices(),
  doctors: seedDoctors(),
  patients: seedPatients(),
  appointments: seedAppointments(),
  invoices: seedInvoices(),
  currentDoctorId: CURRENT_DOCTOR,
  currentPatientId: CURRENT_PATIENT,
});

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...fresh(),
      role: null,
      onboardingCompleted: false,
      hydrated: false,
      supabaseSynced: false,
      syncing: false,
      setRole: (role) => set({ role }),
      setCurrentDoctor: (currentDoctorId) => set({ currentDoctorId }),

      syncFromSupabase: async (explicitUserId) => {
        if (get().syncing) return;
        set({ syncing: true });
        try {
          let uidUser = explicitUserId;
          if (uidUser === undefined) {
            const {
              data: { session },
            } = await supabase.auth.getSession();
            uidUser = session?.user?.id ?? null;
          }

          const clinicData = await fetchClinic();
          if (!clinicData) {
            set({ syncing: false });
            return;
          }

          const cId = clinicData.id;
          const [servicesData, doctorsData, patientsData, apptsData, invData] =
            await Promise.all([
              fetchServices(cId),
              fetchDoctors(cId),
              fetchPatients(cId),
              fetchAppointments(cId).catch(() => [] as Appointment[]),
              fetchInvoices().catch(() => [] as Invoice[]),
            ]);

          const matchedDoc =
            (uidUser
              ? doctorsData.find((d) => d.userId === uidUser)
              : undefined) ??
            doctorsData.find(
              (d) => d.id === "c0000000-0000-4000-8000-000000000001",
            ) ??
            doctorsData[0];

          const matchedPac =
            (uidUser
              ? patientsData.find((p) => p.userId === uidUser)
              : undefined) ??
            patientsData.find(
              (p) => p.id === "d0000000-0000-4000-8000-000000000001",
            ) ??
            patientsData[0];

          const { id: _ignoreId, ...clinicFields } = clinicData;

          set({
            clinicId: cId,
            clinic: clinicFields,
            services: servicesData.length > 0 ? servicesData : get().services,
            doctors:
              doctorsData.length > 0
                ? doctorsData.map(({ userId: _u, ...rest }) => rest)
                : get().doctors,
            patients:
              patientsData.length > 0
                ? patientsData.map(({ userId: _u, ...rest }) => rest)
                : get().patients,
            appointments: apptsData,
            invoices: invData,
            currentDoctorId: matchedDoc?.id ?? CURRENT_DOCTOR,
            currentPatientId: matchedPac?.id ?? CURRENT_PATIENT,
            supabaseSynced: true,
            syncing: false,
          });
        } catch (err) {
          console.error("[MediOS] Error sincronizando con Supabase:", err);
          set({ syncing: false });
        }
      },

      reset: () => {
        const wasLive = isUuid(get().clinicId);
        if (wasLive) {
          void get().syncFromSupabase();
        } else {
          set({ ...fresh(), onboardingCompleted: false });
        }
      },

      completeOnboarding: () => set({ onboardingCompleted: true }),

      transition: (id, to) => {
        const a = get().appointments.find((x) => x.id === id);
        if (!a) return { ok: false, error: "Cita no encontrada" };
        if (!canTransition(a.estado, to))
          return {
            ok: false,
            error: `Transicion invalida: ${a.estado} → ${to}`,
          };
        if (to === "in_progress") {
          const busy = get().appointments.some(
            (x) => x.doctorId === a.doctorId && x.estado === "in_progress",
          );
          if (busy) return { ok: false, error: "Ya hay una consulta en curso" };
        }
        const live = isUuid(get().clinicId);
        const events: { tipo: string; timestamp: string }[] = [
          { tipo: to, timestamp: nowTs() },
        ];
        let invoices = get().invoices;
        let autoInvoice: {
          id: string;
          pacienteId: string;
          monto: number;
          fecha: string;
        } | null = null;

        if (
          to === "completed" &&
          !invoices.some((i) => i.citaId === id && i.estado !== "cancelled")
        ) {
          const srv = get().services.find((s) => s.id === a.servicioId);
          const invId = uid("inv", live);
          const monto = srv?.precio ?? 0;
          const fecha = todayISO();
          autoInvoice = {
            id: invId,
            pacienteId: a.pacienteId,
            monto,
            fecha,
          };
          invoices = [
            ...invoices,
            {
              id: invId,
              citaId: id,
              pacienteId: a.pacienteId,
              monto,
              adelanto: 0,
              estado: "pending",
              metodo: null,
              fechaPago: null,
              fecha,
              notas: "",
            },
          ];
          events.push({ tipo: "invoice_created", timestamp: nowTs() });
        }
        if (to === "cancelled") {
          invoices = invoices.map((i) =>
            i.citaId === id && i.estado === "pending"
              ? { ...i, estado: "cancelled" }
              : i,
          );
        }
        set({
          invoices,
          appointments: get().appointments.map((x) =>
            x.id === id
              ? { ...x, estado: to, eventos: [...x.eventos, ...events] }
              : x,
          ),
        });

        if (live && isUuid(id)) {
          void transitionAppointmentDb(id, to, autoInvoice).catch((err) => {
            console.error("[MediOS] Error en transitionAppointmentDb:", err);
            void get().syncFromSupabase();
          });
        }
        return { ok: true };
      },

      createAppointment: (d) => {
        const { doctors, services, appointments, clinicId } = get();
        const doc = doctors.find((x) => x.id === d.doctorId);
        const srv = services.find((x) => x.id === d.servicioId);
        if (!doc || !srv || !d.pacienteId)
          return { ok: false, error: "Faltan datos de la cita" };
        if (
          !availableSlots(doc, d.fecha, srv.duracion, appointments).includes(
            d.hora,
          )
        )
          return { ok: false, error: "Horario no disponible" };

        const live = isUuid(clinicId);
        const id = uid("apt", live);
        const newAppt: Appointment = {
          id,
          ...d,
          duracion: srv.duracion,
          estado: "scheduled",
          notas: "",
          eventos: [{ tipo: "created", timestamp: nowTs() }],
        };

        set({
          appointments: [...appointments, newAppt],
        });

        if (live && clinicId && isUuid(d.pacienteId) && isUuid(d.doctorId) && isUuid(d.servicioId)) {
          void createAppointmentDb(clinicId, newAppt).catch((err) => {
            console.error("[MediOS] Error en createAppointmentDb:", err);
            void get().syncFromSupabase();
          });
        }
        return { ok: true, id };
      },

      reschedule: (id, fecha, hora) => {
        const { appointments, doctors, clinicId } = get();
        const a = appointments.find((x) => x.id === id);
        const doc = a && doctors.find((x) => x.id === a.doctorId);
        if (!a || !doc) return { ok: false, error: "Cita no encontrada" };
        if (
          !availableSlots(
            doc,
            fecha,
            a.duracion,
            appointments,
            new Date(),
            id,
          ).includes(hora)
        )
          return { ok: false, error: "Horario no disponible" };
        set({
          appointments: appointments.map((x) =>
            x.id === id
              ? {
                  ...x,
                  fecha,
                  hora,
                  estado: "scheduled",
                  eventos: [
                    ...x.eventos,
                    { tipo: "rescheduled", timestamp: nowTs() },
                  ],
                }
              : x,
          ),
        });

        if (isUuid(clinicId) && isUuid(id)) {
          void rescheduleAppointmentDb(id, fecha, hora).catch((err) => {
            console.error("[MediOS] Error en rescheduleAppointmentDb:", err);
            void get().syncFromSupabase();
          });
        }
        return { ok: true };
      },

      updateNotes: (id, notas) => {
        const current = get().appointments.find((x) => x.id === id);
        const hadEvent = current?.eventos.some((e) => e.tipo === "notes_added") ?? false;

        set({
          appointments: get().appointments.map((x) => {
            if (x.id !== id) return x;
            const had = x.eventos.some((e) => e.tipo === "notes_added");
            return {
              ...x,
              notas,
              eventos: had
                ? x.eventos
                : [...x.eventos, { tipo: "notes_added", timestamp: nowTs() }],
            };
          }),
        });

        if (isUuid(get().clinicId) && isUuid(id)) {
          void updateAppointmentNotesDb(id, notas, !hadEvent).catch((err) => {
            console.error("[MediOS] Error en updateAppointmentNotesDb:", err);
          });
        }
      },

      updateOdontograma: (id, odontograma) => {
        set({
          appointments: get().appointments.map((x) =>
            x.id === id ? { ...x, odontograma } : x,
          ),
        });

        if (isUuid(get().clinicId) && isUuid(id)) {
          void updateAppointmentOdontogramaDb(id, odontograma).catch((err) => {
            console.error(
              "[MediOS] Error en updateAppointmentOdontogramaDb:",
              err,
            );
          });
        }
      },

      charge: (citaId, monto, metodo, notas, abono) => {
        const a = get().appointments.find((x) => x.id === citaId);
        if (!a) return { ok: false, error: "Cita no encontrada" };
        if (monto <= 0) return { ok: false, error: "Monto invalido" };
        const existing = get().invoices.find(
          (i) => i.citaId === citaId && i.estado !== "cancelled",
        );
        if (existing?.estado === "paid")
          return { ok: false, error: "Esta consulta ya fue cobrada" };

        const live = isUuid(get().clinicId);
        const prevAdelanto = existing?.adelanto ?? 0;
        const abonoVal =
          abono !== undefined ? Math.max(0, abono) : monto - prevAdelanto;
        const nuevoAdelanto = Math.min(monto, prevAdelanto + abonoVal);
        const isPaid = nuevoAdelanto >= monto;

        const updatedFields = {
          monto,
          adelanto: nuevoAdelanto,
          metodo,
          notas,
          estado: (isPaid ? "paid" : "pending") as "paid" | "pending",
          fechaPago: isPaid ? todayISO() : null,
        };

        const targetInvoice: Invoice = existing
          ? { ...existing, ...updatedFields }
          : {
              id: uid("inv", live),
              citaId,
              pacienteId: a.pacienteId,
              fecha: todayISO(),
              ...updatedFields,
            };

        set({
          invoices: existing
            ? get().invoices.map((i) =>
                i.id === existing.id ? targetInvoice : i,
              )
            : [...get().invoices, targetInvoice],
          appointments: existing
            ? get().appointments
            : get().appointments.map((x) =>
                x.id === citaId
                  ? {
                      ...x,
                      eventos: [
                        ...x.eventos,
                        { tipo: "invoice_created", timestamp: nowTs() },
                      ],
                    }
                  : x,
              ),
        });

        if (live && isUuid(targetInvoice.id) && isUuid(targetInvoice.pacienteId)) {
          void upsertInvoiceDb(targetInvoice).catch((err) => {
            console.error("[MediOS] Error en upsertInvoiceDb:", err);
            void get().syncFromSupabase();
          });
        }
        return { ok: true };
      },

      payInvoice: (id, metodo, abono) => {
        const inv = get().invoices.find((i) => i.id === id);
        if (!inv) return { ok: false, error: "Factura no encontrada" };
        if (inv.estado === "paid")
          return { ok: false, error: "Esta factura ya esta pagada" };

        const prevAdelanto = inv.adelanto ?? 0;
        const remaining = Math.max(0, inv.monto - prevAdelanto);
        const amountToApply = abono !== undefined ? abono : remaining;
        if (amountToApply <= 0)
          return { ok: false, error: "El monto a abonar debe ser mayor a 0" };
        if (amountToApply > remaining)
          return { ok: false, error: "El abono supera el saldo pendiente" };

        const nuevoAdelanto = prevAdelanto + amountToApply;
        const isPaid = nuevoAdelanto >= inv.monto;
        const nextEstado: "paid" | "pending" = isPaid ? "paid" : "pending";
        const nextFechaPago = isPaid ? todayISO() : inv.fechaPago;

        set({
          invoices: get().invoices.map((i) =>
            i.id === id
              ? {
                  ...i,
                  adelanto: nuevoAdelanto,
                  estado: nextEstado,
                  metodo,
                  fechaPago: nextFechaPago,
                }
              : i,
          ),
        });

        if (isUuid(get().clinicId) && isUuid(id)) {
          void updateInvoicePaymentDb({
            id,
            adelanto: nuevoAdelanto,
            estado: nextEstado,
            metodo,
            fechaPago: nextFechaPago,
          }).catch((err) => {
            console.error("[MediOS] Error en updateInvoicePaymentDb:", err);
            void get().syncFromSupabase();
          });
        }
        return { ok: true };
      },

      createManualInvoice: (d) => {
        if (!d.pacienteId)
          return { ok: false, error: "Selecciona un paciente" };
        if (d.monto <= 0)
          return { ok: false, error: "El monto total debe ser mayor a 0" };
        const live = isUuid(get().clinicId);
        const adelanto = Math.min(d.monto, Math.max(0, d.adelanto ?? 0));
        const isPaid = adelanto >= d.monto;
        const id = uid("inv", live);
        const newInv: Invoice = {
          id,
          citaId: d.citaId ?? "",
          pacienteId: d.pacienteId,
          monto: d.monto,
          adelanto,
          estado: isPaid ? "paid" : "pending",
          metodo: adelanto > 0 || isPaid ? d.metodo : null,
          fechaPago: isPaid ? todayISO() : null,
          fecha: todayISO(),
          notas: d.notas.trim(),
        };

        set({
          invoices: [newInv, ...get().invoices],
        });

        if (live && isUuid(id) && isUuid(d.pacienteId)) {
          void upsertInvoiceDb(newInv).catch((err) => {
            console.error("[MediOS] Error en createManualInvoice:", err);
            void get().syncFromSupabase();
          });
        }
        return { ok: true, id };
      },

      cancelInvoice: (id) => {
        set({
          invoices: get().invoices.map((i) =>
            i.id === id ? { ...i, estado: "cancelled" } : i,
          ),
        });
        if (isUuid(get().clinicId) && isUuid(id)) {
          void cancelInvoiceDb(id).catch((err) => {
            console.error("[MediOS] Error en cancelInvoiceDb:", err);
            void get().syncFromSupabase();
          });
        }
      },

      upsertPatient: (d) => {
        const found = get().patients.find((p) => p.telefono === d.telefono);
        if (found) return found.id;
        return get().addPatient(d);
      },

      addPatient: (d) => {
        const { clinicId, patients } = get();
        const live = isUuid(clinicId);
        const id = uid("pac", live);
        const newPatient: Patient = { ...d, id, createdAt: todayISO() };
        set({
          patients: [...patients, newPatient],
        });

        if (live && clinicId) {
          void createPatientDb(clinicId, newPatient).catch((err) => {
            console.error("[MediOS] Error en createPatientDb:", err);
            void get().syncFromSupabase();
          });
        }
        return id;
      },

      updatePatient: (id, d) => {
        set({
          patients: get().patients.map((x) =>
            x.id === id ? { ...x, ...d } : x,
          ),
        });
        if (isUuid(get().clinicId) && isUuid(id)) {
          void updatePatientDb(id, d).catch((err) => {
            console.error("[MediOS] Error en updatePatientDb:", err);
            void get().syncFromSupabase();
          });
        }
      },

      deletePatient: (id) => {
        set({
          patients: get().patients.filter((x) => x.id !== id),
          appointments: get().appointments.filter((a) => a.pacienteId !== id),
          invoices: get().invoices.filter((i) => i.pacienteId !== id),
        });
        if (isUuid(get().clinicId) && isUuid(id)) {
          void deletePatientDb(id).catch((err) => {
            console.error("[MediOS] Error en deletePatientDb:", err);
            void get().syncFromSupabase();
          });
        }
      },

      addDoctor: (d) => {
        const { doctors, clinicId } = get();
        const live = isUuid(clinicId);
        const n = doctors.length;
        const newDoc: Doctor = {
          ...d,
          id: uid("doc", live),
          color: PALETTE[n % PALETTE.length]!,
        };
        set({
          doctors: [...doctors, newDoc],
        });
        if (live && clinicId) {
          void createDoctorDb(clinicId, newDoc).catch((err) => {
            console.error("[MediOS] Error en createDoctorDb:", err);
            void get().syncFromSupabase();
          });
        }
      },

      updateDoctor: (id, d) => {
        set({
          doctors: get().doctors.map((x) =>
            x.id === id ? { ...x, ...d } : x,
          ),
        });
        if (isUuid(get().clinicId) && isUuid(id)) {
          void updateDoctorDb(id, d).catch((err) => {
            console.error("[MediOS] Error en updateDoctorDb:", err);
            void get().syncFromSupabase();
          });
        }
      },

      deleteDoctor: (id) => {
        set({
          doctors: get().doctors.filter((x) => x.id !== id),
          appointments: get().appointments.filter((a) => a.doctorId !== id),
        });
        if (isUuid(get().clinicId) && isUuid(id)) {
          void deleteDoctorDb(id).catch((err) => {
            console.error("[MediOS] Error en deleteDoctorDb:", err);
            void get().syncFromSupabase();
          });
        }
      },

      updateClinic: (clinic) => {
        set({ clinic });
        const clinicId = get().clinicId;
        if (isUuid(clinicId) && clinicId) {
          void updateClinicDb(clinicId, clinic).catch((err) => {
            console.error("[MediOS] Error en updateClinicDb:", err);
            void get().syncFromSupabase();
          });
        }
      },

      updateServices: (services) => {
        const clinicId = get().clinicId;
        const live = isUuid(clinicId);
        const normalized = live
          ? services.map((s) => (isUuid(s.id) ? s : { ...s, id: newUuid() }))
          : services;
        set({ services: normalized });
        if (live && clinicId) {
          void syncServicesDb(clinicId, normalized).catch((err) => {
            console.error("[MediOS] Error en syncServicesDb:", err);
            void get().syncFromSupabase();
          });
        }
      },
    }),
    {
      name: "medios-store",
      skipHydration: true,
      partialize: ({ hydrated: _h, syncing: _s, ...rest }) => rest,
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
