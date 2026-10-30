import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shield, Stethoscope, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Hydrated, Logo } from "@/components/medios/shared";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — MediOS" },
      { name: "description", content: "Accede a MediOS como administrador, doctor o paciente." },
      { property: "og:title", content: "Entrar — MediOS" },
      { property: "og:description", content: "Accede a tu panel de MediOS." },
    ],
  }),
  component: () => <Hydrated><Auth /></Hydrated>,
});

const ROLES: { id: Role; icon: typeof Shield; t: string; d: string; who: string }[] = [
  { id: "admin", icon: Shield, t: "Admin", d: "Gestiona la clinica", who: "Gestor de la clinica" },
  { id: "doctor", icon: Stethoscope, t: "Doctor", d: "Atiende pacientes", who: "Dra. Sofia Martinez" },
  { id: "patient", icon: User, t: "Paciente", d: "Agenda y consulta", who: "Maria Garcia" },
];

function Auth() {
  const [role, setRoleLocal] = useState<Role>("admin");
  const setRole = useStore((s) => s.setRole);
  const nav = useNavigate();
  const enter = () => {
    setRole(role);
    toast.success("Sesion iniciada");
    nav({ to: role === "admin" ? "/hub" : role === "doctor" ? "/doctor" : "/patient" });
  };
  return (
    <div className="grid min-h-screen place-items-center bg-primary-soft px-4 py-10">
      <div className="w-full max-w-2xl rounded-3xl border bg-card p-8 shadow-lift md:p-10">
        <Logo />
        <h1 className="mt-6 text-2xl font-extrabold">Bienvenido de vuelta</h1>
        <p className="text-muted-foreground">Elige con que perfil quieres entrar (demo).</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {ROLES.map((r) => (
            <button key={r.id} onClick={() => setRoleLocal(r.id)} className={cn("rounded-2xl border-2 p-5 text-left transition-all", role === r.id ? "border-primary bg-primary-soft" : "hover:border-primary/40")}>
              <span className={cn("grid size-11 place-items-center rounded-xl", role === r.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}><r.icon className="size-5" /></span>
              <p className="mt-4 font-bold">{r.t}</p>
              <p className="text-sm text-muted-foreground">{r.d}</p>
              <p className="mt-2 text-xs text-muted-foreground">{r.who}</p>
            </button>
          ))}
        </div>
        <Button onClick={enter} size="lg" className="mt-6 h-12 w-full rounded-xl text-base">Entrar</Button>
      </div>
    </div>
  );
}
