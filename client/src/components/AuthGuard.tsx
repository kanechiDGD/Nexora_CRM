import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  const { data: membership, isLoading: membershipLoading } = trpc.organizations.checkMembership.useQuery(
    undefined,
    {
      enabled: !!user, // Solo ejecutar si el usuario está autenticado
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    // Si no está autenticado, redirigir a login
    if (!authLoading && !user) {
      setLocation("/login");
      return;
    }

    // Si está autenticado pero no tiene organización, redirigir a onboarding
    if (!membershipLoading && membership && !membership.hasMembership) {
      setLocation("/onboarding");
      return;
    }
  }, [user, authLoading, membership, membershipLoading, setLocation]);

  // Mostrar loader mientras se verifica la autenticación y membership
  if (authLoading || membershipLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado o no tiene organización, no renderizar children
  // (la redirección se maneja en useEffect)
  if (!user || !membership?.hasMembership) {
    return null;
  }

  // Usuario autenticado y con organización: renderizar contenido
  return <>{children}</>;
}
