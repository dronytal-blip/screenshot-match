import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";

export interface UserProfile {
  id: string;
  role: Role;
  clinicId: string | null;
  nombre: string;
}

interface SignUpParams {
  email: string;
  password: string;
  nombre: string;
  telefono?: string;
  inviteType?: "doctor" | "patient";
  inviteId?: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  role: Role | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: true; role: Role } | { ok: false; error: string }>;
  signUp: (params: SignUpParams) => Promise<{ ok: true; role: Role } | { ok: false; error: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isValidRole(value: unknown): value is Role {
  return value === "admin" || value === "doctor" || value === "patient";
}

function fallbackProfileFromUser(user: User): UserProfile {
  const meta = user.user_metadata ?? {};
  const rawRole = meta["role"] ?? (meta["invite"] === "doctor" ? "doctor" : "patient");
  const role: Role = isValidRole(rawRole) ? rawRole : "patient";
  const nombre =
    typeof meta["nombre"] === "string" && meta["nombre"].trim()
      ? meta["nombre"].trim()
      : user.email?.split("@")[0] ?? "Usuario";

  return {
    id: user.id,
    role,
    clinicId: typeof meta["clinic_id"] === "string" ? meta["clinic_id"] : null,
    nombre,
  };
}

async function fetchProfileForUser(user: User): Promise<UserProfile> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, role, clinic_id, nombre")
      .eq("id", user.id)
      .maybeSingle();

    if (error || !data) {
      return fallbackProfileFromUser(user);
    }

    const role: Role = isValidRole(data.role)
      ? data.role
      : fallbackProfileFromUser(user).role;

    return {
      id: data.id as string,
      role,
      clinicId: (data.clinic_id as string | null) ?? null,
      nombre:
        typeof data.nombre === "string" && data.nombre.trim()
          ? data.nombre
          : fallbackProfileFromUser(user).nombre,
    };
  } catch {
    return fallbackProfileFromUser(user);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const setStoreRole = useStore((s) => s.setRole);
  const syncFromSupabase = useStore((s) => s.syncFromSupabase);

  const applyProfile = useCallback(
    (prof: UserProfile | null) => {
      setProfile(prof);
      setStoreRole(prof?.role ?? null);
    },
    [setStoreRole],
  );

  const refreshProfile = useCallback(async (): Promise<UserProfile | null> => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (!currentUser) {
      applyProfile(null);
      return null;
    }
    const prof = await fetchProfileForUser(currentUser);
    applyProfile(prof);
    return prof;
  }, [applyProfile]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!mounted) return;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        const prof = await fetchProfileForUser(initialSession.user);
        if (mounted) applyProfile(prof);
        await syncFromSupabase(initialSession.user.id);
      } else {
        applyProfile(null);
        await syncFromSupabase(null);
      }
      if (mounted) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        void fetchProfileForUser(nextSession.user).then(async (prof) => {
          if (mounted) {
            applyProfile(prof);
            await syncFromSupabase(nextSession.user.id);
            setLoading(false);
          }
        });
      } else {
        applyProfile(null);
        void syncFromSupabase(null);
        setLoading(false);
      }
    });

    const realtimeChannel = supabase
      .channel("medios-realtime-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public" },
        () => {
          void useStore.getState().syncFromSupabase();
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      subscription.unsubscribe();
      void supabase.removeChannel(realtimeChannel);
    };
  }, [applyProfile, syncFromSupabase]);

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.user) {
      return {
        ok: false,
        error:
          error?.message === "Invalid login credentials"
            ? "Correo o contrasena incorrectos"
            : error?.message ?? "No se pudo iniciar sesion",
      };
    }

    const prof = await fetchProfileForUser(data.user);
    applyProfile(prof);
    return { ok: true, role: prof.role };
  };

  const signUp: AuthContextValue["signUp"] = async ({
    email,
    password,
    nombre,
    telefono,
    inviteType,
    inviteId,
  }) => {
    const metadata: Record<string, string> = {
      nombre: nombre.trim(),
      role: inviteType === "doctor" ? "doctor" : "patient",
    };
    if (telefono?.trim()) metadata["telefono"] = telefono.trim();
    if (inviteType) metadata["invite"] = inviteType;
    if (inviteId) metadata["invite_id"] = inviteId;

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: metadata,
      },
    });

    if (error || !data.user) {
      return {
        ok: false,
        error: error?.message ?? "No se pudo crear la cuenta",
      };
    }

    const prof = await fetchProfileForUser(data.user);
    applyProfile(prof);
    return { ok: true, role: prof.role };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    applyProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        role: profile?.role ?? null,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}

export function getHomePathForRole(role: Role | null | undefined): "/hub" | "/doctor" | "/patient" | "/auth" {
  if (role === "admin") return "/hub";
  if (role === "doctor") return "/doctor";
  if (role === "patient") return "/patient";
  return "/auth";
}
