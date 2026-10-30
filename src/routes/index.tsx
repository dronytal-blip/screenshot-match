import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Lock, MapPin, Phone, Mail, Sparkles, FileX, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo, ServiceIcon } from "@/components/medios/shared";
import { IMG, seedClinic, seedDoctors, seedServices } from "@/lib/seed";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MediOS — Tu clinica. Tus datos. Tu sistema." },
      { name: "description", content: "Agenda tu cita en Clinica MediOS Demo: medicina general, odontologia, pediatria, dermatologia y nutricion." },
      { property: "og:title", content: "MediOS — Tu clinica. Tus datos. Tu sistema." },
      { property: "og:description", content: "Agenda tu cita medica en linea en minutos." },
      { property: "og:image", content: IMG.hero },
      { name: "twitter:image", content: IMG.hero },
    ],
  }),
  component: Landing,
});

const TESTIMONIOS = [
  { foto: IMG.t1, nombre: "Gabriela Ruiz", texto: "Agende en dos minutos desde mi celular y me llego el recordatorio. Cero filas." },
  { foto: IMG.t2, nombre: "Miguel Ortega", texto: "El Dr. Herrera fue muy profesional. La clinica es moderna y puntual." },
  { foto: IMG.t3, nombre: "Daniela Flores", texto: "Llevo a mis hijos con la Dra. Lopez. Tengo todo su historial a la mano." },
];

function Landing() {
  const services = seedServices();
  const doctors = seedDoctors();
  const clinic = seedClinic();
  const spec = (id: string) => services.find((s) => s.id === id)?.nombre;
  return (
    <div className="min-h-screen">
      <nav className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4">
          <Logo light />
          <div className="flex gap-2">
            <Button asChild variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"><Link to="/auth">Iniciar sesion</Link></Button>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden bg-hero text-primary-foreground">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-32 md:grid-cols-2 md:pb-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 text-sm font-medium"><Sparkles className="size-4" /> {clinic.nombre}</span>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] md:text-6xl">Tu clinica.<br />Tus datos.<br />Tu sistema.</h1>
            <p className="mt-6 max-w-md text-lg text-primary-foreground/80">Atencion medica cercana con la agenda mas simple. Reserva tu cita en menos de un minuto.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-14 rounded-2xl bg-card px-8 text-base font-bold text-primary shadow-lift hover:bg-card/90">
                <Link to="/booking">Agendar Cita <ArrowRight className="size-5" /></Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <img src={IMG.hero} alt="Clinica moderna" className="aspect-[4/3] w-full rounded-3xl object-cover shadow-2xl" />
            <div className="absolute -bottom-6 -left-6 hidden rounded-2xl bg-card p-4 text-foreground shadow-lift md:block">
              <p className="text-xs text-muted-foreground">Pacientes satisfechos</p>
              <p className="flex items-center gap-1 font-display text-2xl font-extrabold">4.9 <Star className="size-5 fill-warning text-warning" /></p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-3xl font-extrabold">Especialidades</h2>
        <p className="mt-2 text-muted-foreground">Todo lo que tu familia necesita en un solo lugar.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {services.map((s) => (
            <div key={s.id} className="rounded-2xl border bg-card p-6 shadow-soft transition-transform hover:-translate-y-1">
              <span className="grid size-12 place-items-center rounded-xl bg-primary-soft text-primary"><ServiceIcon name={s.icono} className="size-6" /></span>
              <h3 className="mt-4 font-bold">{s.nombre}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.descripcion}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-card py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-extrabold">Nuestros doctores</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {doctors.map((d) => (
              <div key={d.id} className="overflow-hidden rounded-2xl border bg-background shadow-soft">
                <img src={d.foto} alt={d.nombre} className="aspect-square w-full object-cover" loading="lazy" />
                <div className="p-5">
                  <h3 className="font-bold">{d.nombre}</h3>
                  <p className="text-sm font-medium text-primary">{spec(d.especialidadId)}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{d.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-3xl font-extrabold">Por que MediOS</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            { i: Lock, t: "Tus datos son tuyos", d: "Exporta tu informacion cuando quieras, sin cargos ocultos." },
            { i: FileX, t: "Sin contratos", d: "Sin plazos forzosos ni costos por doctor. Usalo mientras te sirva." },
            { i: Sparkles, t: "Simple de usar", d: "Disenado para que el doctor vea mas pacientes y menos pantallas." },
          ].map(({ i: I, t, d }) => (
            <div key={t} className="rounded-2xl border bg-card p-8 shadow-soft">
              <I className="size-8 text-primary" />
              <h3 className="mt-4 text-lg font-bold">{t}</h3>
              <p className="mt-2 text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-primary-soft py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-extrabold">Lo que dicen nuestros pacientes</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {TESTIMONIOS.map((t) => (
              <div key={t.nombre} className="rounded-2xl bg-card p-6 shadow-soft">
                <p className="text-foreground/80">"{t.texto}"</p>
                <div className="mt-5 flex items-center gap-3">
                  <img src={t.foto} alt={t.nombre} className="size-11 rounded-full object-cover" loading="lazy" />
                  <p className="font-semibold">{t.nombre}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-primary-deep py-12 text-primary-foreground">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-3">
          <div><Logo light /><p className="mt-3 text-sm text-primary-foreground/70">MediOS - Tu clinica. Tus datos. Tu sistema.</p></div>
          <div className="space-y-2 text-sm text-primary-foreground/80">
            <p className="flex items-center gap-2"><MapPin className="size-4" />{clinic.direccion}</p>
            <p className="flex items-center gap-2"><Phone className="size-4" />{clinic.telefono}</p>
            <p className="flex items-center gap-2"><Mail className="size-4" />{clinic.email}</p>
          </div>
          <div className="text-sm text-primary-foreground/80">
            <p className="font-semibold text-primary-foreground">Horario</p>
            <p>Lunes a Viernes {clinic.apertura} - {clinic.cierre}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
