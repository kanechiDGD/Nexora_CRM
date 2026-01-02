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
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ManageClaimStatusesDialogProps {
  trigger?: React.ReactNode;
}

export function ManageClaimStatusesDialog({ trigger }: ManageClaimStatusesDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusDisplayName, setNewStatusDisplayName] = useState("");

  const utils = trpc.useUtils();

  const formatStatusName = (displayName: string) =>
    displayName.trim().toUpperCase().replace(/\s+/g, "_");
  
  // Query para obtener estados personalizados
  const { data: customStatuses = [], isLoading } = trpc.customClaimStatuses.list.useQuery(
    undefined,
    { enabled: open }
  );

  // Mutation para crear nuevo estado
  const createMutation = trpc.customClaimStatuses.create.useMutation({
    onSuccess: () => {
      toast.success(t('claimStatusManager.createSuccess'));
      setNewStatusName("");
      setNewStatusDisplayName("");
      utils.customClaimStatuses.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || t('claimStatusManager.createError'));
    },
  });

  // Mutation para eliminar estado
  const deleteMutation = trpc.customClaimStatuses.delete.useMutation({
    onSuccess: () => {
      toast.success(t('claimStatusManager.deleteSuccess'));
      utils.customClaimStatuses.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || t('claimStatusManager.deleteError'));
    },
  });

  const handleCreate = () => {
    const displayName = newStatusDisplayName.trim();
    if (!displayName) {
      toast.error(t('claimStatusManager.missingFields'));
      return;
    }

    createMutation.mutate({
      name: formatStatusName(displayName),
      displayName,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm(t('claimStatusManager.deleteConfirm'))) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button type="button" variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            {t('claimStatusManager.triggerLabel')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('claimStatusManager.title')}</DialogTitle>
          <DialogDescription>
            {t('claimStatusManager.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Formulario para agregar nuevo estado */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="statusName">{t('claimStatusManager.fields.internalName.label')}</Label>
                    <Input
                      id="statusName"
                      placeholder={t('claimStatusManager.fields.internalName.placeholder')}
                      value={newStatusName}
                      readOnly
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('claimStatusManager.fields.internalName.help')}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="statusDisplayName">{t('claimStatusManager.fields.displayName.label')}</Label>
                    <Input
                      id="statusDisplayName"
                      placeholder={t('claimStatusManager.fields.displayName.placeholder')}
                      value={newStatusDisplayName}
                      onChange={(e) => {
                        const displayName = e.target.value;
                        setNewStatusDisplayName(displayName);
                        setNewStatusName(formatStatusName(displayName));
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('claimStatusManager.fields.displayName.help')}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleCreate}
                  disabled={createMutation.isPending || !newStatusDisplayName.trim()}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('claimStatusManager.addButton')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de estados personalizados existentes */}
          <div className="space-y-2">
            <Label>{t('claimStatusManager.customStatusesTitle')}</Label>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
            ) : customStatuses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('claimStatusManager.emptyCustomStatuses')}
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
            <Label>{t('claimStatusManager.defaultStatusesTitle')}</Label>
            <div className="space-y-2">
              {[
                { name: "NO_SOMETIDA", displayName: t('dashboard.claimStatus.status.NO_SOMETIDA') },
                { name: "SOMETIDA", displayName: t('dashboard.claimStatus.status.SOMETIDA') },
                { name: "AJUSTACION_PROGRAMADA", displayName: t('dashboard.claimStatus.status.AJUSTACION_PROGRAMADA') },
                { name: "AJUSTACION_TERMINADA", displayName: t('dashboard.claimStatus.status.AJUSTACION_TERMINADA') },
                { name: "EN_PROCESO", displayName: t('dashboard.claimStatus.status.EN_PROCESO') },
                { name: "APROVADA", displayName: t('dashboard.claimStatus.status.APROVADA') },
                { name: "RECHAZADA", displayName: t('dashboard.claimStatus.status.RECHAZADA') },
                { name: "CERRADA", displayName: t('dashboard.claimStatus.status.CERRADA') },
              ].map((status) => (
                <Card key={status.name} className="bg-muted/50">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{status.displayName}</p>
                      <p className="text-sm text-muted-foreground">{status.name}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{t('claimStatusManager.defaultLabel')}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
