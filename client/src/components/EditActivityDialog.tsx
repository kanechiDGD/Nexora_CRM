import { useEffect, useState } from "react";
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
import { Edit } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export type ActivityLog = {
  id: number;
  activityType: string;
  subject?: string | null;
  description?: string | null;
};

type EditActivityDialogProps = {
  log: ActivityLog;
  clientId: string;
};

export function EditActivityDialog({ log, clientId }: EditActivityDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    activityType: log.activityType,
    subject: log.subject || "",
    description: log.description || "",
  });

  const utils = trpc.useUtils();
  const updateActivity = trpc.activityLogs.update.useMutation({
    onSuccess: () => {
      toast.success(t("activityDialog.edit.success", { defaultValue: "Activity updated" }));
      utils.activityLogs.getRecent.invalidate();
      utils.activityLogs.getByClientId.invalidate({ clientId });
      setOpen(false);
    },
    onError: (error) => {
      toast.error(t("activityDialog.edit.error", { defaultValue: error.message }));
    },
  });

  useEffect(() => {
    if (!open) {
      setFormData({
        activityType: log.activityType,
        subject: log.subject || "",
        description: log.description || "",
      });
    }
  }, [open, log]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.description) {
      toast.error(t("activityDialog.new.missingFields"));
      return;
    }

    updateActivity.mutate({
      id: log.id,
      activityType: formData.activityType,
      subject: formData.subject,
      description: formData.description,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("activityDialog.edit.title", { defaultValue: "Edit activity" })}</DialogTitle>
            <DialogDescription>
              {t("activityDialog.edit.description", { defaultValue: "Update the activity details." })}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="activityType">{t("activityDialog.new.typeLabel")}</Label>
              <Select
                value={formData.activityType}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    activityType: value as typeof formData.activityType,
                  })
                }
              >
                <SelectTrigger id="activityType">
                  <SelectValue placeholder={t("activityDialog.new.typePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LLAMADA">{t("activityDialog.new.types.call")}</SelectItem>
                  <SelectItem value="CORREO">{t("activityDialog.new.types.email")}</SelectItem>
                  <SelectItem value="VISITA">{t("activityDialog.new.types.visit")}</SelectItem>
                  <SelectItem value="NOTA">{t("activityDialog.new.types.note")}</SelectItem>
                  <SelectItem value="DOCUMENTO">{t("activityDialog.new.types.document")}</SelectItem>
                  <SelectItem value="CAMBIO_ESTADO">{t("activityDialog.new.types.statusChange")}</SelectItem>
                  <SelectItem value="AJUSTACION_REALIZADA">{t("activityDialog.new.types.adjustmentCompleted")}</SelectItem>
                  <SelectItem value="SCOPE_SOLICITADO">{t("activityDialog.new.types.scopeRequested")}</SelectItem>
                  <SelectItem value="SCOPE_RECIBIDO">{t("activityDialog.new.types.scopeReceived")}</SelectItem>
                  <SelectItem value="SCOPE_ENVIADO">{t("activityDialog.new.types.scopeSent")}</SelectItem>
                  <SelectItem value="RESPUESTA_FAVORABLE">{t("activityDialog.new.types.responseFavorable")}</SelectItem>
                  <SelectItem value="RESPUESTA_NEGATIVA">{t("activityDialog.new.types.responseNegative")}</SelectItem>
                  <SelectItem value="INICIO_APPRAISAL">{t("activityDialog.new.types.appraisalStarted")}</SelectItem>
                  <SelectItem value="CARTA_APPRAISAL_ENVIADA">{t("activityDialog.new.types.appraisalLetterSent")}</SelectItem>
                  <SelectItem value="RELEASE_LETTER_REQUERIDA">{t("activityDialog.new.types.releaseLetterRequired")}</SelectItem>
                  <SelectItem value="ITEL_SOLICITADO">{t("activityDialog.new.types.itelRequested")}</SelectItem>
                  <SelectItem value="REINSPECCION_SOLICITADA">{t("activityDialog.new.types.reinspectionRequested")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="subject">{t("activityDialog.new.subjectLabel")}</Label>
              <Input
                id="subject"
                placeholder={t("activityDialog.new.subjectPlaceholder")}
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">{t("activityDialog.new.descriptionLabel")}</Label>
              <Textarea
                id="description"
                placeholder={t("activityDialog.new.descriptionPlaceholder")}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("activityDialog.new.cancel")}
            </Button>
            <Button type="submit" disabled={updateActivity.isPending}>
              {updateActivity.isPending
                ? t("activityDialog.edit.saving", { defaultValue: "Saving..." })
                : t("activityDialog.edit.save", { defaultValue: "Save changes" })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
