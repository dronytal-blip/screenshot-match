import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getHomePathForRole, useAuth } from "@/contexts/AuthContext";
import type { Role } from "@/lib/types";

interface ProtectedRouteProps {
  allowedRoles: Role[];
  children: ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!user || !role) {
      void navigate({ to: "/auth", replace: true });
      return;
    }

    if (!allowedRoles.includes(role)) {
      void navigate({ to: getHomePathForRole(role), replace: true });
    }
  }, [loading, user, role, allowedRoles, navigate]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user || !role || !allowedRoles.includes(role)) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
