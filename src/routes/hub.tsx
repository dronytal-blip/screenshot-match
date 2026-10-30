import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/medios/shared";

export const Route = createFileRoute("/hub")({
  head: () => ({
    meta: [
      { title: "Panel de administracion — FisioKITS" },
      { name: "description", content: "Panel de administracion de la clinica FisioKITS." },
      { property: "og:title", content: "Panel de administracion — FisioKITS" },
      { property: "og:description", content: "Gestiona tu clinica desde un solo lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Hub,
});

function Hub() {
  return (
    <div className="grid min-h-screen place-items-center bg-primary-soft px-4">
      <div className="w-full max-w-lg rounded-3xl border bg-card p-8 text-center shadow-lift">
        <div className="flex justify-center"><Logo /></div>
        <h1 className="mt-6 text-2xl font-extrabold">Panel de administracion</h1>
        <p className="mt-2 text-muted-foreground">Proximamente: dashboard, agenda, doctores, pacientes, cobros, reportes y configuracion.</p>
        <Button asChild className="mt-6 rounded-xl"><Link to="/">Volver al inicio</Link></Button>
      </div>
    </div>
  );
}
