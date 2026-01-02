import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Phone, Mail, MapPin, Calendar, User, FileText, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";

interface ClientContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}
export function ClientContactDialog({ open, onOpenChange, clientId, clientName }: ClientContactDialogProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "es" ? es : enUS;
  const dateFormat = i18n.language === "es" ? "PPP 'a las' p" : "PPP 'at' p";
  const getActivityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      LLAMADA: t("activityDialog.new.types.call"),
      CORREO: t("activityDialog.new.types.email"),
      VISITA: t("activityDialog.new.types.visit"),
      NOTA: t("activityDialog.new.types.note"),
      DOCUMENTO: t("activityDialog.new.types.document"),
      CAMBIO_ESTADO: t("activityDialog.new.types.statusChange"),
      AJUSTACION_REALIZADA: t("activityDialog.new.types.adjustmentCompleted"),
      SCOPE_SOLICITADO: t("activityDialog.new.types.scopeRequested"),
      SCOPE_RECIBIDO: t("activityDialog.new.types.scopeReceived"),
      SCOPE_ENVIADO: t("activityDialog.new.types.scopeSent"),
      RESPUESTA_FAVORABLE: t("activityDialog.new.types.responseFavorable"),
      RESPUESTA_NEGATIVA: t("activityDialog.new.types.responseNegative"),
      INICIO_APPRAISAL: t("activityDialog.new.types.appraisalStarted"),
      CARTA_APPRAISAL_ENVIADA: t("activityDialog.new.types.appraisalLetterSent"),
      RELEASE_LETTER_REQUERIDA: t("activityDialog.new.types.releaseLetterRequired"),
      ITEL_SOLICITADO: t("activityDialog.new.types.itelRequested"),
      REINSPECCION_SOLICITADA: t("activityDialog.new.types.reinspectionRequested"),
    };

    return labels[type] || type;
  };
  const utils = trpc.useUtils();
  const [contactMethod, setContactMethod] = useState<string>("LLAMADA");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");

  // Obtener información del cliente
  const { data: client, isLoading: loadingClient } = trpc.clients.getById.useQuery(
    { id: clientId },
    { enabled: open && !!clientId }
  );
  
  // Obtener última actividad del cliente
  const { data: activities, isLoading: loadingActivities } = trpc.activityLogs.getByClientId.useQuery(
    { clientId },
    { enabled: open && !!clientId }
  );
  const { data: documents } = trpc.documents.getByClientId.useQuery(
    { clientId },
    { enabled: open && !!clientId }
  );
  const { data: workflowSummary } = trpc.clients.getWorkflowSummary.useQuery(
    { id: clientId },
    { enabled: open && !!clientId }
  );
  
  const lastActivity = activities && activities.length > 0 ? activities[0] : null;
  const isCallDue = (() => {
    if (!client) return false;
    const nextContact = client.nextContactDate
      ? new Date(client.nextContactDate)
      : client.lastContactDate
        ? new Date(new Date(client.lastContactDate).getTime() + 7 * 24 * 60 * 60 * 1000)
        : null;
    if (!nextContact) return false;
    return differenceInDays(nextContact, new Date()) <= 0;
  })();

  const documentTypes = new Set((documents || []).map((doc: any) => doc.documentType));
  const missingDocuments = [
    { key: "POLIZA", label: t("documents.types.policy") },
    { key: "ESTIMADO_ASEGURANZA", label: t("documents.types.insuranceEstimate") },
    { key: "ESTIMADO_NUESTRO", label: t("documents.types.ourEstimate") },
  ].filter((item) => !documentTypes.has(item.key));
  
  // Mutación para crear log de actividad
  const createActivity = trpc.activityLogs.create.useMutation({
    onSuccess: () => {
      // Una vez creado el log, actualizamos el cliente
      const today = new Date();
      const nextContact = new Date(today);
      nextContact.setDate(nextContact.getDate() + 7); // Próximo contacto en 7 días

      updateClientContact.mutate({
        id: clientId,
        data: {
          lastContactDate: today,
          nextContactDate: nextContact,
        },
      });
    },
    onError: (error) => {
      toast.error(t('clientContactDialog.createActivityError', { message: error.message }));
    },
  });

  // Mutación para actualizar fecha de contacto del cliente
  const updateClientContact = trpc.clients.update.useMutation({
    onSuccess: () => {
      toast.success(t('clientContactDialog.saveSuccess'));
      // Invalidar solo las queries específicas que se ven afectadas
      utils.dashboard.lateContact.invalidate();
      utils.dashboard.upcomingContacts.invalidate();
      utils.clients.list.invalidate();
      utils.clients.getById.invalidate({ id: clientId });
      utils.activityLogs.getByClientId.invalidate({ clientId });
      setDescription("");
      setSubject("");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(t('clientContactDialog.updateClientError', { message: error.message }));
    },
  });
  
  const handleSubmit = () => {
    if (!clientId) return;
    if (!description || !subject) {
      toast.error(t('clientContactDialog.missingFields'));
      return;
    }
    
    createActivity.mutate({
      clientId,
      activityType: contactMethod as "LLAMADA" | "CORREO" | "VISITA" | "NOTA" | "DOCUMENTO" | "CAMBIO_ESTADO",
      subject,
      description,
      outcome: null,
      contactMethod: null,
      duration: null,
    });
  };
  
  if (loadingClient || loadingActivities) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('clientContactDialog.loadingTitle')}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">{t('clientContactDialog.loadingText')}</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  if (!client) {
    return null;
  }
  
  // Calcular días desde último contacto
  const daysSinceContact = client.lastContactDate
    ? Math.floor((new Date().getTime() - new Date(client.lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
    : 999;
  
  const getPriorityBadge = (days: number) => {
    if (days >= 7) return <Badge variant="destructive">{t('clientContactDialog.priority.high')}</Badge>;
    if (days >= 5) return <Badge className="bg-orange-500">{t('clientContactDialog.priority.medium')}</Badge>;
    return <Badge className="bg-yellow-500">{t('clientContactDialog.priority.low')}</Badge>;
  };

  const formatWorkflowDate = (value?: string | Date | null) => {
    if (!value) return "-";
    return format(new Date(value), dateFormat, { locale: dateLocale });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <User className="h-6 w-6" />
            {clientName}
          </DialogTitle>
          <DialogDescription>
            {t('clientContactDialog.dialogDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Estado de Contacto */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">{t('clientContactDialog.daysSinceLastContact')}</p>
              <p className="text-3xl font-bold">{daysSinceContact}</p>
            </div>
            <div>
              {getPriorityBadge(daysSinceContact)}
            </div>
          </div>
          
          {/* {t('clientContactDialog.contactInfoTitle')} */}
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Phone className="h-5 w-5" />
              {t('clientContactDialog.contactInfoTitle')}
            </h3>
            <div className="space-y-3 bg-card p-4 rounded-lg border">
              {client.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={`tel:${client.phone}`}
                    className="text-blue-500 hover:underline"
                  >
                    {client.phone}
                  </a>
                  <Badge variant="outline">{t('clientContactDialog.phoneLabels.primary')}</Badge>
                </div>
              )}
              
              {client.alternatePhone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={`tel:${client.alternatePhone}`}
                    className="text-blue-500 hover:underline"
                  >
                    {client.alternatePhone}
                  </a>
                  <Badge variant="outline">{t('clientContactDialog.phoneLabels.alternate')}</Badge>
                </div>
              )}
              
              {client.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={`mailto:${client.email}`}
                    className="text-blue-500 hover:underline"
                  >
                    {client.email}
                  </a>
                </div>
              )}
              
              {client.propertyAddress && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p>{client.propertyAddress}</p>
                    {client.city && client.state && (
                      <p className="text-sm text-muted-foreground">
                        {client.city}, {client.state} {client.zipCode}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <Separator />
          
          {/* Última Actividad */}
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('clientContactDialog.lastActivityTitle')}
            </h3>
            
            {lastActivity ? (
              <div className="space-y-3 bg-card p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <Badge>{getActivityTypeLabel(lastActivity.activityType)}</Badge>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(lastActivity.performedAt), dateFormat, { locale: dateLocale })}
                  </div>
                </div>
                
                {lastActivity.subject && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">{t('clientContactDialog.activityLabels.subject')}</p>
                    <p>{lastActivity.subject}</p>
                  </div>
                )}
                
                {lastActivity.description && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">{t('clientContactDialog.activityLabels.description')}</p>
                    <p className="text-sm">{lastActivity.description}</p>
                  </div>
                )}
                
                {lastActivity.outcome && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">{t('clientContactDialog.activityLabels.outcome')}</p>
                    <p className="text-sm">{lastActivity.outcome}</p>
                  </div>
                )}
                
                <Separator />
                
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('clientContactDialog.activityLabels.contactedBy')}</span>
                  <span className="font-semibold">
                    {lastActivity.performedByName || lastActivity.performedByEmail || t('clientContactDialog.activityLabels.userLabel', { id: lastActivity.performedBy })}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-muted p-4 rounded-lg text-center">
                <p className="text-muted-foreground">{t('clientContactDialog.noActivities')}</p>
              </div>
            )}
          </div>
          
          {/* Información Adicional del Reclamo */}
          {client.insuranceCompany && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-lg mb-3">{t('clientContactDialog.claimInfoTitle')}</h3>
                <div className="grid grid-cols-2 gap-4 bg-card p-4 rounded-lg border">
                  {client.insuranceCompany && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('clientContactDialog.claimLabels.insurance')}</p>
                      <p className="font-semibold">{client.insuranceCompany}</p>
                    </div>
                  )}
                  {client.claimNumber && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('clientContactDialog.claimLabels.claimNumber')}</p>
                      <p className="font-semibold">{client.claimNumber}</p>
                    </div>
                  )}
                  {client.claimStatus && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('clientContactDialog.claimLabels.status')}</p>
                      <Badge>{client.claimStatus}</Badge>
                    </div>
                  )}
                  {client.assignedAdjuster && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('clientContactDialog.claimLabels.assignedAdjuster')}</p>
                      <p className="font-semibold">{client.assignedAdjuster}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {workflowSummary && isCallDue && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-lg mb-1">{t('clientContactDialog.callReportTitle')}</h3>
                <p className="text-sm text-muted-foreground mb-3">{t('clientContactDialog.callReportSubtitle')}</p>
                <div className="grid grid-cols-2 gap-4 bg-card p-4 rounded-lg border">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('clientContactDialog.caseSummary.claimStatus')}</p>
                    <p className="font-semibold">{workflowSummary.client?.claimStatus || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('clientContactDialog.caseSummary.lastStatusChange')}</p>
                    <p className="font-semibold">{formatWorkflowDate(workflowSummary.lastStatusChange?.performedAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('clientContactDialog.caseSummary.adjustmentDate')}</p>
                    <p className="font-semibold">{formatWorkflowDate(workflowSummary.client?.adjustmentDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('clientContactDialog.caseSummary.scopeReceived')}</p>
                    <p className="font-semibold">{formatWorkflowDate(workflowSummary.lastCoreActivities?.SCOPE_RECIBIDO?.performedAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('clientContactDialog.caseSummary.scopeSent')}</p>
                    <p className="font-semibold">{formatWorkflowDate(workflowSummary.lastCoreActivities?.SCOPE_ENVIADO?.performedAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('clientContactDialog.caseSummary.response')}</p>
                    <p className="font-semibold">
                      {formatWorkflowDate(
                        workflowSummary.lastCoreActivities?.RESPUESTA_FAVORABLE?.performedAt ||
                          workflowSummary.lastCoreActivities?.RESPUESTA_NEGATIVA?.performedAt
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('clientContactDialog.caseSummary.appraisal')}</p>
                    <p className="font-semibold">{formatWorkflowDate(workflowSummary.lastCoreActivities?.INICIO_APPRAISAL?.performedAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('clientContactDialog.caseSummary.appraisalLetter')}</p>
                    <p className="font-semibold">{formatWorkflowDate(workflowSummary.lastCoreActivities?.CARTA_APPRAISAL_ENVIADA?.performedAt)}</p>
                  </div>
                </div>
                <div className="mt-4 bg-muted/40 p-4 rounded-lg border">
                  <p className="text-sm font-semibold mb-2">{t('clientContactDialog.callReport.missingDocuments')}</p>
                  {missingDocuments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('clientContactDialog.callReport.noneMissing')}</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {missingDocuments.map((doc) => (
                        <Badge key={doc.key} variant="outline">{doc.label}</Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-3">
                    {t('clientContactDialog.callReport.teamReminder')}
                  </p>
                </div>
              </div>
            </>
          )}
          
          {/* Formulario de Registro de Contacto */}
          <Separator />
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              {t('clientContactDialog.registerContactTitle')}
            </h3>
            <div className="space-y-4 bg-muted/50 p-4 rounded-lg border border-dashed">
              <div className="grid gap-2">
                <Label htmlFor="contact-method">{t('clientContactDialog.contactMethodLabel')}</Label>
                <Select value={contactMethod} onValueChange={setContactMethod}>
                  <SelectTrigger id="contact-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LLAMADA">{t('clientContactDialog.contactMethods.call')}</SelectItem>
                    <SelectItem value="CORREO">{t('clientContactDialog.contactMethods.email')}</SelectItem>
                    <SelectItem value="VISITA">{t('clientContactDialog.contactMethods.visit')}</SelectItem>
                    <SelectItem value="NOTA">{t('clientContactDialog.contactMethods.note')}</SelectItem>
                    <SelectItem value="DOCUMENTO">{t('clientContactDialog.contactMethods.document')}</SelectItem>
                    <SelectItem value="CAMBIO_ESTADO">{t('clientContactDialog.contactMethods.statusChange')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="subject">{t('clientContactDialog.subjectLabel')}</Label>
                <Input
                  id="subject"
                  placeholder={t('clientContactDialog.subjectPlaceholder')}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">{t('clientContactDialog.notesLabel')}</Label>
                <Textarea
                  id="description"
                  placeholder={t('clientContactDialog.notesPlaceholder')}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleSubmit}
                  className="flex-1"
                  disabled={createActivity.isPending || updateClientContact.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {(createActivity.isPending || updateClientContact.isPending) ? t('clientContactDialog.savingButton') : t('clientContactDialog.saveButton')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  {t('clientContactDialog.cancelButton')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
