import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ManageClaimStatusesDialogProps {
  trigger?: React.ReactNode;
}

export function ManageClaimStatusesDialog({ trigger }: ManageClaimStatusesDialogProps) {
  const [open, setOpen] = useState(false);
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusDisplayName, setNewStatusDisplayName] = useState("");

  const utils = trpc.useUtils();
  
  // Query para obtener estados personalizados
  const { data: customStatuses = [], isLoading } = trpc.customClaimStatuses.list.useQuery(
    undefined,
    { enabled: open }
  );

  // Mutation para crear nuevo estado
  const createMutation = trpc.customClaimStatuses.create.useMutation({
    onSuccess: () => {
      toast.success("Estado creado exitosamente");
      setNewStatusName("");
      setNewStatusDisplayName("");
      utils.customClaimStatuses.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Error al crear estado");
    },
  });

  // Mutation para eliminar estado
  const deleteMutation = trpc.customClaimStatuses.delete.useMutation({
    onSuccess: () => {
      toast.success("Estado eliminado exitosamente");
      utils.customClaimStatuses.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar estado");
    },
  });

  const handleCreate = () => {
    if (!newStatusName.trim() || !newStatusDisplayName.trim()) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    createMutation.mutate({
      name: newStatusName.trim().toUpperCase().replace(/\s+/g, "_"),
      displayName: newStatusDisplayName.trim(),
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Estás seguro de eliminar este estado? Esta acción no se puede deshacer.")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button type="button" variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Gestionar Estados
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestionar Estados de Reclamo</DialogTitle>
          <DialogDescription>
            Agrega o elimina estados personalizados para el dropdown de Estado del Reclamo.
            Solo ADMIN y CO_ADMIN pueden gestionar estos estados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Formulario para agregar nuevo estado */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="statusName">Nombre Interno (sin espacios)</Label>
                    <Input
                      id="statusName"
                      placeholder="ej: EN_REVISION"
                      value={newStatusName}
                      onChange={(e) => setNewStatusName(e.target.value.toUpperCase().replace(/\s+/g, "_"))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Se usará en la base de datos
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="statusDisplayName">Nombre para Mostrar</Label>
                    <Input
                      id="statusDisplayName"
                      placeholder="ej: En Revisión"
                      value={newStatusDisplayName}
                      onChange={(e) => setNewStatusDisplayName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Se mostrará en el dropdown
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleCreate}
                  disabled={createMutation.isPending || !newStatusName.trim() || !newStatusDisplayName.trim()}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Estado
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de estados personalizados existentes */}
          <div className="space-y-2">
            <Label>Estados Personalizados Existentes</Label>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : customStatuses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay estados personalizados. Agrega uno arriba.
              </p>
            ) : (
              <div className="space-y-2">
                {customStatuses.map((status: any) => (
                  <Card key={status.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">{status.displayName}</p>
                        <p className="text-sm text-muted-foreground">{status.name}</p>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(status.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Estados predeterminados (solo informativo) */}
          <div className="space-y-2">
            <Label>Estados Predeterminados (No se pueden eliminar)</Label>
            <div className="space-y-2">
              {[
                { name: "NO_SOMETIDA", displayName: "No Sometida" },
                { name: "EN_PROCESO", displayName: "En Proceso" },
                { name: "APROVADA", displayName: "Aprobada" },
                { name: "RECHAZADA", displayName: "Rechazada" },
                { name: "CERRADA", displayName: "Cerrada" },
              ].map((status) => (
                <Card key={status.name} className="bg-muted/50">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{status.displayName}</p>
                      <p className="text-sm text-muted-foreground">{status.name}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">Predeterminado</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
