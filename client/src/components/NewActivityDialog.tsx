import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Plus, Check, ChevronsUpDown } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type NewActivityDialogProps = {
  clientId?: string | null;
  clientName?: string;
  hideClientSelect?: boolean;
  defaultActivityType?: string;
  openOnMount?: boolean;
  hideTrigger?: boolean;
};

export function NewActivityDialog({
  clientId = null,
  clientName = "",
  hideClientSelect = false,
  defaultActivityType,
  openOnMount = false,
  hideTrigger = false,
}: NewActivityDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [formData, setFormData] = useState({
    activityType: (defaultActivityType || "LLAMADA") as
      | "LLAMADA"
      | "CORREO"
      | "VISITA"
      | "NOTA"
      | "DOCUMENTO"
      | "CAMBIO_ESTADO"
      | "AJUSTACION_REALIZADA"
      | "SCOPE_SOLICITADO"
      | "SCOPE_RECIBIDO"
      | "SCOPE_ENVIADO"
      | "RESPUESTA_FAVORABLE"
      | "RESPUESTA_NEGATIVA"
      | "INICIO_APPRAISAL"
      | "CARTA_APPRAISAL_ENVIADA"
      | "RELEASE_LETTER_REQUERIDA"
      | "ITEL_SOLICITADO"
      | "REINSPECCION_SOLICITADA",
    subject: "",
    description: "",
    clientId: clientId as string | null,
    clientName,
  });

  const { data: clients } = trpc.clients.list.useQuery();
  const utils = trpc.useUtils();
  const createActivity = trpc.activityLogs.create.useMutation({
    onSuccess: () => {
      toast.success(t('activityDialog.new.success'));
      utils.activityLogs.getRecent.invalidate();
      if (formData.clientId) {
        utils.activityLogs.getByClientId.invalidate({ clientId: formData.clientId });
      }
      setOpen(false);
      setFormData({
        activityType: (defaultActivityType || "LLAMADA") as typeof formData.activityType,
        subject: "",
        description: "",
        clientId,
        clientName,
      });
    },
    onError: (error) => {
      toast.error(t('activityDialog.new.error', { message: error.message }));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject || !formData.description) {
      toast.error(t('activityDialog.new.missingFields'));
      return;
    }

    createActivity.mutate({
      activityType: formData.activityType,
      subject: formData.subject,
      description: formData.description,
      clientId: formData.clientId,
      outcome: null,
      contactMethod: null,
      duration: null,
    });
  };

  useEffect(() => {
    if (!clientId) {
      return;
    }
    setFormData((prev) => ({
      ...prev,
      clientId,
      clientName: clientName || prev.clientName,
    }));
  }, [clientId, clientName]);

  useEffect(() => {
    if (!defaultActivityType) {
      return;
    }
    setFormData((prev) => ({
      ...prev,
      activityType: defaultActivityType as typeof prev.activityType,
    }));
  }, [defaultActivityType]);

  useEffect(() => {
    if (openOnMount) {
      setOpen(true);
    }
  }, [openOnMount]);

  const handleClientSelect = (clientId: string, clientName: string) => {
    setFormData({ ...formData, clientId, clientName });
    setClientSearchOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('activityDialog.new.trigger')}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('activityDialog.new.title')}</DialogTitle>
            <DialogDescription>
              {t('activityDialog.new.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="user">{t('activityDialog.new.performedByLabel')}</Label>
              <Input
                id="user"
                value={user?.name || t('activityDialog.new.unknownUser')}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                {t('activityDialog.new.performedByHelp')}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="activityType">{t('activityDialog.new.typeLabel')}</Label>
              <Select
                value={formData.activityType}
                onValueChange={(value) =>
                  setFormData({ ...formData, activityType: value as typeof formData.activityType })
                }
              >
                <SelectTrigger id="activityType">
                  <SelectValue placeholder={t('activityDialog.new.typePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LLAMADA">{t('activityDialog.new.types.call')}</SelectItem>
                  <SelectItem value="CORREO">{t('activityDialog.new.types.email')}</SelectItem>
                  <SelectItem value="VISITA">{t('activityDialog.new.types.visit')}</SelectItem>
                  <SelectItem value="NOTA">{t('activityDialog.new.types.note')}</SelectItem>
                  <SelectItem value="DOCUMENTO">{t('activityDialog.new.types.document')}</SelectItem>
                  <SelectItem value="CAMBIO_ESTADO">{t('activityDialog.new.types.statusChange')}</SelectItem>
                  <SelectItem value="AJUSTACION_REALIZADA">{t('activityDialog.new.types.adjustmentCompleted')}</SelectItem>
                  <SelectItem value="SCOPE_SOLICITADO">{t('activityDialog.new.types.scopeRequested')}</SelectItem>
                  <SelectItem value="SCOPE_RECIBIDO">{t('activityDialog.new.types.scopeReceived')}</SelectItem>
                  <SelectItem value="SCOPE_ENVIADO">{t('activityDialog.new.types.scopeSent')}</SelectItem>
                  <SelectItem value="RESPUESTA_FAVORABLE">{t('activityDialog.new.types.responseFavorable')}</SelectItem>
                  <SelectItem value="RESPUESTA_NEGATIVA">{t('activityDialog.new.types.responseNegative')}</SelectItem>
                  <SelectItem value="INICIO_APPRAISAL">{t('activityDialog.new.types.appraisalStarted')}</SelectItem>
                  <SelectItem value="CARTA_APPRAISAL_ENVIADA">{t('activityDialog.new.types.appraisalLetterSent')}</SelectItem>
                  <SelectItem value="RELEASE_LETTER_REQUERIDA">{t('activityDialog.new.types.releaseLetterRequired')}</SelectItem>
                  <SelectItem value="ITEL_SOLICITADO">{t('activityDialog.new.types.itelRequested')}</SelectItem>
                  <SelectItem value="REINSPECCION_SOLICITADA">{t('activityDialog.new.types.reinspectionRequested')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!hideClientSelect && (
              <div className="grid gap-2">
                <Label>{t('activityDialog.new.clientLabel')}</Label>
                <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={clientSearchOpen}
                      className="justify-between"
                    >
                      {formData.clientName || t('activityDialog.new.clientPlaceholder')}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput placeholder={t('activityDialog.new.clientSearchPlaceholder')} />
                      <CommandList>
                        <CommandEmpty>{t('activityDialog.new.noClients')}</CommandEmpty>
                        <CommandGroup>
                          {clients?.map((client: any) => (
                            <CommandItem
                              key={client.id}
                              value={`${client.firstName} ${client.lastName}`}
                              onSelect={() =>
                                handleClientSelect(
                                  client.id,
                                  `${client.firstName} ${client.lastName}`
                                )
                              }
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.clientId === client.id
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {client.firstName} {client.lastName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {client.phone || client.email || `ID: ${client.id}`}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  {t("activityDialog.new.clientHelp")}
                </p>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="subject">{t('activityDialog.new.subjectLabel')}</Label>
              <Input
                id="subject"
                placeholder={t('activityDialog.new.subjectPlaceholder')}
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">{t('activityDialog.new.descriptionLabel')}</Label>
              <Textarea
                id="description"
                placeholder={t('activityDialog.new.descriptionPlaceholder')}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {t('activityDialog.new.cancel')}
            </Button>
            <Button type="submit" disabled={createActivity.isPending}>
              {createActivity.isPending ? t('activityDialog.new.saving') : t('activityDialog.new.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
