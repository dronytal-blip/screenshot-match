import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Shield,
  Stethoscope,
  User,
  Mail,
  Lock,
  Phone,
  Sparkles,
  Loader2,
  UserPlus,
  LogIn,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Hydrated, Logo } from "@/components/medios/shared";
import { getHomePathForRole, useAuth } from "@/contexts/AuthContext";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AuthSearch {
  invite?: "doctor" | "patient" | undefined;
  id?: string | undefined;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    invite:
      search["invite"] === "doctor" || search["invite"] === "patient"
        ? search["invite"]
        : undefined,
    id: typeof search["id"] === "string" ? search["id"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar — MediOS" },
      {
        name: "description",
        content: "Accede a MediOS como administrador, doctor o paciente.",
      },
      { property: "og:title", content: "Entrar — MediOS" },
      { property: "og:description", content: "Accede a tu panel de MediOS." },
    ],
  }),
  component: () => (
    <Hydrated>
      <Auth />
    </Hydrated>
  ),
});

const DEMO_USERS: {
  role: Role;
  icon: typeof Shield;
  title: string;
  subtitle: string;
  who: string;
  email: string;
}[] = [
  {
    role: "admin",
    icon: Shield,
    title: "Admin",
    subtitle: "Gestiona la clinica",
    who: "admin@medios.demo",
    email: "admin@medios.demo",
  },
  {
    role: "doctor",
    icon: Stethoscope,
    title: "Doctor",
    subtitle: "Atiende pacientes",
    who: "Dra. Sofia Martinez",
    email: "sofia@medios.demo",
  },
  {
    role: "patient",
    icon: User,
    title: "Paciente",
    subtitle: "Agenda y consulta",
    who: "Maria Garcia",
    email: "maria@medios.demo",
  },
];

function Auth() {
  const { invite, id: inviteId } = Route.useSearch();
  const isInvite = Boolean(invite && inviteId);

  const [mode, setMode] = useState<"login" | "signup">(
    isInvite ? "signup" : "login",
  );
  const [email, setEmail] = useState("admin@medios.demo");
  const [password, setPassword] = useState("demo1234");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { user, role, loading, signIn, signUp } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (isInvite) {
      setMode("signup");
      setEmail("");
      setPassword("");
    }
  }, [isInvite]);

  useEffect(() => {
    if (!loading && user && role && !isInvite) {
      void nav({ to: getHomePathForRole(role), replace: true });
    }
  }, [loading, user, role, isInvite, nav]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Ingresa tu correo y contrasena");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        const res = await signIn(email, password);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success("Sesion iniciada");
        void nav({ to: getHomePathForRole(res.role) });
      } else {
        if (nombre.trim().length < 2) {
          toast.error("Ingresa tu nombre completo");
          return;
        }
        if (password.length < 6) {
          toast.error("La contrasena debe tener al menos 6 caracteres");
          return;
        }
        const signUpArgs: Parameters<typeof signUp>[0] = {
          email,
          password,
          nombre,
        };
        if (telefono.trim()) signUpArgs.telefono = telefono.trim();
        if (invite) signUpArgs.inviteType = invite;
        if (inviteId) signUpArgs.inviteId = inviteId;

        const res = await signUp(signUpArgs);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success(
          isInvite
            ? "Cuenta vinculada correctamente"
            : "Cuenta creada con exito",
        );
        void nav({ to: getHomePathForRole(res.role) });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setMode("login");
    setEmail(demoEmail);
    setPassword("demo1234");
    setSubmitting(true);
    try {
      const res = await signIn(demoEmail, "demo1234");
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Sesion demo iniciada");
      void nav({ to: getHomePathForRole(res.role) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-primary-soft px-4 py-10">
      <div className="w-full max-w-2xl rounded-3xl border bg-card p-8 shadow-lift md:p-10">
        <div className="flex items-center justify-between gap-4">
          <Logo />
          {!isInvite && (
            <div className="inline-flex rounded-xl bg-muted p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                  mode === "login"
                    ? "bg-card text-primary shadow-soft"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <LogIn className="size-3.5" /> Iniciar sesion
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  if (email.endsWith("@medios.demo")) {
                    setEmail("");
                    setPassword("");
                  }
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                  mode === "signup"
                    ? "bg-card text-primary shadow-soft"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <UserPlus className="size-3.5" /> Registrarse
              </button>
            </div>
          )}
        </div>

        {isInvite && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-primary-soft p-4 text-sm text-primary">
            <Sparkles className="size-5 shrink-0" />
            <div>
              <p className="font-bold">
                Invitacion para unirte como{" "}
                {invite === "doctor" ? "Doctor(a)" : "Paciente"}
              </p>
              <p className="text-xs text-primary/80">
                Completa tu registro para vincular tu perfil automaticamente.
              </p>
            </div>
          </div>
        )}

        <h1 className="mt-6 text-2xl font-extrabold">
          {mode === "login"
            ? "Bienvenido de vuelta"
            : isInvite
              ? "Activa tu cuenta en la clinica"
              : "Crea tu cuenta de paciente"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {mode === "login"
            ? "Ingresa con tu correo y contrasena o usa un acceso rapido de demo."
            : "Agenda y consulta tus citas e historial medico en linea."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nombre completo</Label>
                <Input
                  placeholder="Ej: Maria Garcia"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Telefono (10 digitos)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="5512345678"
                    inputMode="numeric"
                    value={telefono}
                    onChange={(e) =>
                      setTelefono(
                        e.target.value.replace(/\D/g, "").slice(0, 10),
                      )
                    }
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Correo electronico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  className="pl-9"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Contrasena</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  className="pl-9"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="mt-2 h-12 w-full rounded-xl text-base"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Procesando...
              </>
            ) : mode === "login" ? (
              "Entrar"
            ) : (
              "Crear cuenta"
            )}
          </Button>
        </form>

        {!isInvite && (
          <div className="mt-8 border-t pt-6">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Acceso rapido de demostracion (1 clic · password: demo1234)
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {DEMO_USERS.map((d) => (
                <button
                  key={d.role}
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDemoLogin(d.email)}
                  className={cn(
                    "rounded-2xl border-2 p-4 text-left transition-all hover:border-primary",
                    email === d.email && mode === "login"
                      ? "border-primary bg-primary-soft"
                      : "border-border",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-10 place-items-center rounded-xl",
                      email === d.email && mode === "login"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <d.icon className="size-5" />
                  </span>
                  <p className="mt-3 font-bold text-sm">{d.title}</p>
                  <p className="text-xs text-muted-foreground">{d.subtitle}</p>
                  <p className="mt-1.5 truncate font-mono text-[11px] text-primary">
                    {d.email}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
