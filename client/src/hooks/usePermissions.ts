import { trpc } from "@/lib/trpc";

export function usePermissions() {
  const { data: membership } = trpc.organizations.checkMembership.useQuery();
  
  const role = membership?.member?.role || "VENDEDOR";
  
  const isAdmin = role === "ADMIN";
  const isCoAdmin = role === "CO_ADMIN";
  const isVendedor = role === "VENDEDOR";
  
  // Permisos específicos
  const canEdit = isAdmin || isCoAdmin;
  const canDelete = isAdmin || isCoAdmin;
  const canManageUsers = isAdmin;
  const canManageOrganization = isAdmin;
  
  return {
    role,
    isAdmin,
    isCoAdmin,
    isVendedor,
    canEdit,
    canDelete,
    canManageUsers,
    canManageOrganization,
  };
}
