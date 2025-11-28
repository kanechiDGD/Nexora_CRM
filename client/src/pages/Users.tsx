import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, UserPlus, Trash2, KeyRound, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import DashboardLayout from "@/components/DashboardLayout";

export default function Users() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");

  // Form state
  const [newUsername, setNewUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"ADMIN" | "CO_ADMIN" | "VENDEDOR">("VENDEDOR");

  const utils = trpc.useUtils();
  const { data: members, isLoading } = trpc.organizations.getMembers.useQuery();

  const updateRoleMutation = trpc.organizations.updateMemberRole.useMutation({
    onSuccess: () => {
      toast.success("Rol actualizado correctamente");
      utils.organizations.getMembers.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMemberMutation = trpc.organizations.deleteMember.useMutation({
    onSuccess: () => {
      toast.success("Miembro eliminado correctamente");
      utils.organizations.getMembers.invalidate();
      setShowDeleteDialog(false);
      setSelectedMember(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const addMemberMutation = trpc.organizations.addMember.useMutation({
    onSuccess: () => {
      toast.success("Miembro agregado correctamente");
      utils.organizations.getMembers.invalidate();
      setShowAddDialog(false);
      setNewUsername("");
      setNewUserPassword("");
      setNewUserRole("VENDEDOR");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetPasswordMutation = trpc.organizations.resetMemberPassword.useMutation({
    onSuccess: (data) => {
      setNewPassword(data.newPassword);
      toast.success("Contraseña reseteada correctamente");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleRoleChange = (memberId: number, newRole: "ADMIN" | "CO_ADMIN" | "VENDEDOR") => {
    updateRoleMutation.mutate({ memberId, newRole });
  };

  const handleDeleteMember = () => {
    if (selectedMember) {
      deleteMemberMutation.mutate({ memberId: selectedMember.id });
    }
  };

  const handleAddMember = () => {
    if (!newUsername || !newUserPassword) {
      toast.error("Por favor completa todos los campos");
      return;
    }
    addMemberMutation.mutate({
      username: newUsername,
      password: newUserPassword,
      role: newUserRole,
    });
  };

  const handleResetPassword = () => {
    if (selectedMember) {
      resetPasswordMutation.mutate({ memberId: selectedMember.id });
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline"; label: string }> = {
      ADMIN: { variant: "default", label: "Administrador" },
      CO_ADMIN: { variant: "secondary", label: "Co-Administrador" },
      VENDEDOR: { variant: "outline", label: "Vendedor" },
    };
    const config = variants[role] || variants.VENDEDOR;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
            <p className="text-muted-foreground">Administra los miembros de tu organización</p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Agregar Usuario
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Miembros de la Organización</CardTitle>
            <CardDescription>
              Lista de todos los usuarios con acceso al sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Fecha de Creación</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members?.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.username}</TableCell>
                      <TableCell>
                        <Select
                          value={member.role}
                          onValueChange={(value) => handleRoleChange(member.id, value as any)}
                          disabled={updateRoleMutation.isPending}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">Administrador</SelectItem>
                            <SelectItem value="CO_ADMIN">Co-Administrador</SelectItem>
                            <SelectItem value="VENDEDOR">Vendedor</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {format(new Date(member.createdAt), "dd/MM/yyyy", { locale: es })}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedMember(member);
                            setShowResetDialog(true);
                            setNewPassword("");
                          }}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedMember(member);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog: Agregar Usuario */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Nuevo Usuario</DialogTitle>
              <DialogDescription>
                Crea un nuevo miembro para tu organización
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="username">Nombre de Usuario</Label>
                <Input
                  id="username"
                  placeholder="usuario@organizacion.internal"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <Select value={newUserRole} onValueChange={(value: any) => setNewUserRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="CO_ADMIN">Co-Administrador</SelectItem>
                    <SelectItem value="VENDEDOR">Vendedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddMember} disabled={addMemberMutation.isPending}>
                {addMemberMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Agregando...
                  </>
                ) : (
                  "Agregar Usuario"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Eliminar Usuario */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar Usuario</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que deseas eliminar a <strong>{selectedMember?.username}</strong>?
                Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteMember}
                disabled={deleteMemberMutation.isPending}
              >
                {deleteMemberMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  "Eliminar"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Resetear Contraseña */}
        <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resetear Contraseña</DialogTitle>
              <DialogDescription>
                Genera una nueva contraseña temporal para <strong>{selectedMember?.username}</strong>
              </DialogDescription>
            </DialogHeader>
            {newPassword ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">Nueva contraseña generada:</p>
                    <div className="bg-muted p-3 rounded-md font-mono text-lg">
                      {newPassword}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Copia esta contraseña y entrégala al usuario. No podrás verla nuevamente.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <p>Se generará una nueva contraseña temporal para este usuario.</p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowResetDialog(false);
                setNewPassword("");
                setSelectedMember(null);
              }}>
                Cerrar
              </Button>
              {!newPassword && (
                <Button
                  onClick={handleResetPassword}
                  disabled={resetPasswordMutation.isPending}
                >
                  {resetPasswordMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    "Generar Nueva Contraseña"
                  )}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
