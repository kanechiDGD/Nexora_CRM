import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  MapPin,
  Building,
  FileText,
  Calendar,
  DollarSign,
  User,
  AlertCircle,
  Upload,
  Download,
  Trash2,
  File,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import DocumentsTab from "@/components/DocumentsTab";
import EmailsTab from "@/components/EmailsTab";
import { NewActivityDialog } from "@/components/NewActivityDialog";
import { EditActivityDialog } from "@/components/EditActivityDialog";
import { DeleteActivityDialog } from "@/components/DeleteActivityDialog";
import { useTranslation } from "react-i18next";
import { usePermissions } from "@/hooks/usePermissions";

type ActivityLog = {
  id: number;
  activityType: string;
  performedAt: string | Date;
  performedBy: number | string;
  performedByName?: string | null;
  performedByEmail?: string | null;
  subject?: string | null;
  description?: string | null;
};

type EditSection =
  | "contact"
  | "team"
  | "claim"
  | "damage"
  | "property"
  | "construction"
  | "dates";

export default function ClientProfile() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const [location, setLocation] = useLocation();
  const clientId = id || "";
  const { canEdit, isAdmin } = usePermissions();
  const [activeTab, setActiveTab] = useState("general");
  const [defaultActivityType, setDefaultActivityType] = useState<string | null>(null);
  const [openActivityOnLoad, setOpenActivityOnLoad] = useState(false);

  const { data: client, isLoading } = trpc.clients.getById.useQuery(
    { id: clientId },
    { enabled: !!clientId }
  );
  const { data: activityLogs } = trpc.activityLogs.getByClientId.useQuery(
    { clientId },
    { enabled: !!clientId }
  );
  const { data: documents } = trpc.documents.getByClientId.useQuery(
    { clientId },
    { enabled: !!clientId }
  );
  const { data: workflowSummary } = trpc.clients.getWorkflowSummary.useQuery(
    { id: clientId },
    { enabled: !!clientId }
  );
  const { data: organizationMembers } = trpc.organizations.getMembers.useQuery(undefined, {
    enabled: canEdit,
  });

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

  useEffect(() => {
    const url = new URL(window.location.href);
    const tab = url.searchParams.get("tab");
    const activityType = url.searchParams.get("activityType");

    if (!tab && !activityType) {
      setActiveTab("general");
      setDefaultActivityType(null);
      setOpenActivityOnLoad(false);
      return;
    }

    if (tab) {
      setActiveTab(tab);
    }

    if (activityType) {
      setActiveTab(tab || "activity");
      setDefaultActivityType(activityType);
      setOpenActivityOnLoad(true);
    }
  }, [location]);
  const { data: customClaimStatuses = [] } = trpc.customClaimStatuses.list.useQuery();

  const utils = trpc.useUtils();
  const updateMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      utils.clients.getById.invalidate({ id: clientId });
      toast.success(t("clientEdit.updateSuccess"));
    },
    onError: (error) => {
      toast.error(error.message || t("clientEdit.updateError"));
    },
  });
  const [editingSection, setEditingSection] = useState<EditSection | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    alternatePhone: "",
    propertyAddress: "",
    city: "",
    state: "",
    zipCode: "",
    propertyType: "",
    insuranceCompany: "",
    policyNumber: "",
    claimNumber: "",
    claimStatus: "NO_SOMETIDA",
    deductible: "",
    coverageAmount: "",
    suplementado: "no",
    primerCheque: "PENDIENTE",
    estimatedLoss: "",
    actualPayout: "",
    damageType: "",
    damageDescription: "",
    constructionStatus: "",
    dateOfLoss: "",
    claimSubmittedDate: "",
    scheduledVisit: "",
    adjustmentDate: "",
    lastContactDate: "",
    nextContactDate: "",
    salesPerson: "",
    assignedAdjuster: "",
  });

  // Definir todas las funciones ANTES de los early returns
  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
    > = {
      NO_SOMETIDA: { variant: "outline", label: t("dashboard.claimStatus.status.NO_SOMETIDA") },
      SOMETIDA: { variant: "outline", label: t("dashboard.claimStatus.status.SOMETIDA") },
      AJUSTACION_PROGRAMADA: { variant: "outline", label: t("dashboard.claimStatus.status.AJUSTACION_PROGRAMADA") },
      AJUSTACION_TERMINADA: { variant: "secondary", label: t("dashboard.claimStatus.status.AJUSTACION_TERMINADA") },
      EN_PROCESO: { variant: "secondary", label: t("dashboard.claimStatus.status.EN_PROCESO") },
      APROVADA: { variant: "default", label: t("dashboard.claimStatus.status.APROBADA") },
      RECHAZADA: { variant: "destructive", label: t("dashboard.claimStatus.status.RECHAZADA") },
      CERRADA: { variant: "outline", label: t("dashboard.claimStatus.status.CERRADA") },
    };
    const customStatus = customClaimStatuses.find((cs: any) => cs.name === status);
    const config = variants[status] || {
      variant: "outline",
      label: customStatus?.displayName || status,
    };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString(i18n.language.startsWith("es") ? "es-ES" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("es-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getPerformedByLabel = (log: ActivityLog) =>
    log.performedByName || log.performedByEmail || `Usuario #${log.performedBy}`;



  const renderActivityLog = (log: ActivityLog) => (
    <div
      key={log.id}
      className="flex gap-4 p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
    >
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <Badge variant="outline">{getActivityTypeLabel(log.activityType)}</Badge>
          <span className="text-sm font-medium">
            {new Date(log.performedAt).toLocaleDateString("es-ES", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span className="text-sm text-muted-foreground">por {getPerformedByLabel(log)}</span>
        </div>
        {log.subject && <p className="font-medium mb-1">{log.subject}</p>}
        {log.description && <p className="text-sm text-muted-foreground">{log.description}</p>}
      </div>
      {(canEdit || isAdmin) && (
        <div className="flex items-start gap-2">
          {canEdit && (
            <EditActivityDialog log={log} clientId={clientId} />
          )}
          {isAdmin && (
            <DeleteActivityDialog logId={log.id} subject={log.subject} clientId={clientId} />
          )}
        </div>
      )}
    </div>
  );

  const getDaysSince = (date?: Date | string | null) => {
    if (!date) return null;
    const diffMs = Date.now() - new Date(date).getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };

  const getLatestAdjusterActivityDate = () => {
    const activities = workflowSummary?.lastCoreActivities;
    if (!activities) return null;
    const dates = Object.values(activities)
      .map((activity: any) => activity?.performedAt)
      .filter(Boolean)
      .map((value) => new Date(value as any).getTime());
    if (!dates.length) return null;
    return new Date(Math.max(...dates));
  };

  const setFormDataFromClient = () => {
    if (!client) return;
    setFormData({
      firstName: client.firstName || "",
      lastName: client.lastName || "",
      email: client.email || "",
      phone: client.phone || "",
      alternatePhone: client.alternatePhone || "",
      propertyAddress: client.propertyAddress || "",
      city: client.city || "",
      state: client.state || "",
      zipCode: client.zipCode || "",
      propertyType: client.propertyType || "",
      insuranceCompany: client.insuranceCompany || "",
      policyNumber: client.policyNumber || "",
      claimNumber: client.claimNumber || "",
      claimStatus: client.claimStatus || "NO_SOMETIDA",
      deductible: client.deductible?.toString() || "",
      coverageAmount: client.coverageAmount?.toString() || "",
      suplementado: client.suplementado || "no",
      primerCheque: client.primerCheque || "PENDIENTE",
      estimatedLoss: client.estimatedLoss?.toString() || "",
      actualPayout: client.actualPayout?.toString() || "",
      damageType: client.damageType || "",
      damageDescription: client.damageDescription || "",
      constructionStatus: client.constructionStatus || "",
      dateOfLoss: client.dateOfLoss ? new Date(client.dateOfLoss).toISOString().split("T")[0] : "",
      claimSubmittedDate: client.claimSubmittedDate
        ? new Date(client.claimSubmittedDate).toISOString().split("T")[0]
        : "",
      scheduledVisit: client.scheduledVisit
        ? new Date(client.scheduledVisit).toISOString().split("T")[0]
        : "",
      adjustmentDate: client.adjustmentDate
        ? new Date(client.adjustmentDate).toISOString().split("T")[0]
        : "",
      lastContactDate: client.lastContactDate
        ? new Date(client.lastContactDate).toISOString().split("T")[0]
        : "",
      nextContactDate: client.nextContactDate
        ? new Date(client.nextContactDate).toISOString().split("T")[0]
        : "",
      salesPerson: client.salesPerson || "",
      assignedAdjuster: client.assignedAdjuster || "",
    });
  };

  const startEditing = (section: EditSection) => {
    setFormDataFromClient();
    setEditingSection(section);
  };

  const cancelEditing = () => {
    setEditingSection(null);
    setFormDataFromClient();
  };

  const parseDate = (value: string) => (value ? new Date(value) : null);
  const parseNumber = (value: string) => (value ? parseFloat(value) : null);

  const saveSection = async (section: EditSection) => {
    if (!canEdit || !clientId) return;
    let data: Record<string, unknown> = {};

    switch (section) {
      case "contact":
        data = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email || null,
          phone: formData.phone || null,
          alternatePhone: formData.alternatePhone || null,
        };
        break;
      case "team":
        data = {
          salesPerson: formData.salesPerson || null,
          assignedAdjuster: formData.assignedAdjuster || null,
        };
        break;
      case "claim":
        data = {
          insuranceCompany: formData.insuranceCompany || null,
          policyNumber: formData.policyNumber || null,
          claimNumber: formData.claimNumber || null,
          claimStatus: formData.claimStatus || null,
          deductible: parseNumber(formData.deductible),
          coverageAmount: parseNumber(formData.coverageAmount),
          suplementado: formData.suplementado as "si" | "no",
          primerCheque: formData.primerCheque as "OBTENIDO" | "PENDIENTE",
          estimatedLoss: parseNumber(formData.estimatedLoss),
          actualPayout: parseNumber(formData.actualPayout),
        };
        break;
      case "damage":
        data = {
          damageType: formData.damageType || null,
          damageDescription: formData.damageDescription || null,
        };
        break;
      case "property":
        data = {
          propertyAddress: formData.propertyAddress || null,
          city: formData.city || null,
          state: formData.state || null,
          zipCode: formData.zipCode || null,
          propertyType: formData.propertyType || null,
        };
        break;
      case "construction":
        data = { constructionStatus: formData.constructionStatus || null };
        break;
      case "dates":
        data = {
          dateOfLoss: parseDate(formData.dateOfLoss),
          claimSubmittedDate: parseDate(formData.claimSubmittedDate),
          scheduledVisit: parseDate(formData.scheduledVisit),
          adjustmentDate: parseDate(formData.adjustmentDate),
          lastContactDate: parseDate(formData.lastContactDate),
          nextContactDate: parseDate(formData.nextContactDate),
        };
        break;
      default:
        return;
    }

    try {
      await updateMutation.mutateAsync({ id: clientId, data });
      setEditingSection(null);
    } catch {}
  };

  useEffect(() => {
    if (client) {
      setFormDataFromClient();
    }
  }, [client]);

  // AHORA los early returns DESPUÉS de todos los hooks y funciones
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Cargando cliente...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!client) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">{t("clientProfile.notFound")}</p>
          <Button onClick={() => setLocation("/clients")}>
            Volver a Clientes
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/clients")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {client.firstName} {client.lastName}
              </h1>
              <p className="text-muted-foreground mt-1">{t("clientProfile.labels.clientId")}: {client.id}</p>
            </div>
          </div>
          {canEdit && (
            <Button onClick={() => setLocation(`/clients/${client.id}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              {t("clientProfile.actions.edit")}
            </Button>
          )}
        </div>

        {/* Quick Info Cards */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("clientProfile.quick.status")}</p>
                  <div className="mt-1">{getStatusBadge(client.claimStatus || "NO_SOMETIDA")}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("clientProfile.quick.insurance")}</p>
                  <p className="font-medium mt-1">{client.insuranceCompany || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("clientProfile.quick.deductible")}</p>
                  <p className="font-medium mt-1">{formatCurrency(client.deductible)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("clientProfile.quick.salesPerson")}</p>
                  <p className="font-medium mt-1">{client.salesPerson || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("clientProfile.quick.insuranceEstimate")}</p>
                  <p className="font-medium mt-1">{formatCurrency(client.insuranceEstimate)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("clientProfile.quick.firstCheck")}</p>
                  <p className="font-medium mt-1">{formatCurrency(client.firstCheckAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Workflow KPIs */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("clientProfile.kpis.clientContact")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {getDaysSince(client.lastContactDate) ?? "-"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("clientProfile.kpis.daysSince")}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("clientProfile.kpis.adjusterContact")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {getDaysSince(getLatestAdjusterActivityDate()) ?? "-"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("clientProfile.kpis.daysSince")}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("clientProfile.kpis.statusUpdate")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {getDaysSince(workflowSummary?.lastStatusChange?.performedAt) ?? "-"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("clientProfile.kpis.daysSince")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Information Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">{t("clientProfile.tabs.general")}</TabsTrigger>
            <TabsTrigger value="claim">{t("clientProfile.tabs.claim")}</TabsTrigger>
            <TabsTrigger value="property">{t("clientProfile.tabs.property")}</TabsTrigger>
            <TabsTrigger value="dates">{t("clientProfile.tabs.dates")}</TabsTrigger>
            <TabsTrigger value="documents">{t("clientProfile.tabs.documents")}</TabsTrigger>
            <TabsTrigger value="emails">{t("clientProfile.tabs.emails")}</TabsTrigger>
            <TabsTrigger value="activity">{t("clientProfile.tabs.activity")}</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4">
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t("clientProfile.sections.contact.title")}
                </CardTitle>
                {canEdit && (
                  <div className="flex items-center gap-2">
                    {editingSection === "contact" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEditing}
                          disabled={updateMutation.isPending}
                        >
                          {t("clientEdit.actions.cancel")}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveSection("contact")}
                          disabled={updateMutation.isPending}
                        >
                          {t("clientEdit.saveChanges")}
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => startEditing("contact")}>
                        {t("common.edit")}
                      </Button>
                    )}
                  </div>
                )}
              </CardHeader>
              {editingSection === "contact" ? (
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">
                      {t("clientNew.fields.firstName")}
                    </label>
                    <Input
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">
                      {t("clientNew.fields.lastName")}
                    </label>
                    <Input
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.email")}</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.phone")}</label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">
                      {t("clientProfile.labels.alternatePhone")}
                    </label>
                    <Input
                      type="tel"
                      value={formData.alternatePhone}
                      onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                    />
                  </div>
                </CardContent>
              ) : (
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.fullName")}</label>
                    <p className="font-medium mt-1">
                      {client.firstName} {client.lastName}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.email")}</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {client.email ? (
                        <a
                          href={`mailto:${client.email}`}
                          className="font-medium text-primary hover:underline cursor-pointer"
                        >
                          {client.email}
                        </a>
                      ) : (
                        <p className="font-medium">-</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.phone")}</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {client.phone ? (
                        <a
                          href={`tel:${client.phone}`}
                          className="font-medium text-primary hover:underline cursor-pointer"
                        >
                          {client.phone}
                        </a>
                      ) : (
                        <p className="font-medium">-</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.alternatePhone")}</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {client.alternatePhone ? (
                        <a
                          href={`tel:${client.alternatePhone}`}
                          className="font-medium text-primary hover:underline cursor-pointer"
                        >
                          {client.alternatePhone}
                        </a>
                      ) : (
                        <p className="font-medium">-</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Equipo Asignado
                </CardTitle>
                {canEdit && (
                  <div className="flex items-center gap-2">
                    {editingSection === "team" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEditing}
                          disabled={updateMutation.isPending}
                        >
                          {t("clientEdit.actions.cancel")}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveSection("team")}
                          disabled={updateMutation.isPending}
                        >
                          {t("clientEdit.saveChanges")}
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => startEditing("team")}>
                        {t("common.edit")}
                      </Button>
                    )}
                  </div>
                )}
              </CardHeader>
              {editingSection === "team" ? (
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.salesPerson")}</label>
                    <Select
                      value={formData.salesPerson || "sin_asignar"}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          salesPerson: value === "sin_asignar" ? "" : value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("clientNew.placeholders.salesPerson")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sin_asignar">{t("clientNew.unassigned")}</SelectItem>
                        {organizationMembers?.map((member: any) => (
                          <SelectItem key={member.id} value={member.username}>
                            {member.username} ({member.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">
                      {t("clientProfile.labels.assignedAdjuster")}
                    </label>
                    <Select
                      value={formData.assignedAdjuster || "sin_asignar"}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          assignedAdjuster: value === "sin_asignar" ? "" : value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("clientEdit.adjusterPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sin_asignar">{t("clientNew.unassigned")}</SelectItem>
                        {organizationMembers?.map((member: any) => (
                          <SelectItem key={member.id} value={member.username}>
                            {member.username} ({member.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              ) : (
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.salesPerson")}</label>
                    <p className="font-medium mt-1">{client.salesPerson || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.assignedAdjuster")}</label>
                    <p className="font-medium mt-1">{client.assignedAdjuster || "-"}</p>
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* Claim Tab */}
          <TabsContent value="claim" className="space-y-4">
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t("clientProfile.sections.claim.title")}
                </CardTitle>
                {canEdit && (
                  <div className="flex items-center gap-2">
                    {editingSection === "claim" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEditing}
                          disabled={updateMutation.isPending}
                        >
                          {t("clientEdit.actions.cancel")}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveSection("claim")}
                          disabled={updateMutation.isPending}
                        >
                          {t("clientEdit.saveChanges")}
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => startEditing("claim")}>
                        {t("common.edit")}
                      </Button>
                    )}
                  </div>
                )}
              </CardHeader>
              {editingSection === "claim" ? (
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.insurance")}</label>
                    <Input
                      value={formData.insuranceCompany}
                      onChange={(e) => setFormData({ ...formData, insuranceCompany: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.policyNumber")}</label>
                    <Input
                      value={formData.policyNumber}
                      onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.claimNumber")}</label>
                    <Input
                      value={formData.claimNumber}
                      onChange={(e) => setFormData({ ...formData, claimNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.claimStatus")}</label>
                    <Select
                      value={formData.claimStatus}
                      onValueChange={(value) => setFormData({ ...formData, claimStatus: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NO_SOMETIDA">
                          {t("dashboard.claimStatus.status.NO_SOMETIDA")}
                        </SelectItem>
                        <SelectItem value="SOMETIDA">
                          {t("dashboard.claimStatus.status.SOMETIDA")}
                        </SelectItem>
                        <SelectItem value="AJUSTACION_PROGRAMADA">
                          {t("dashboard.claimStatus.status.AJUSTACION_PROGRAMADA")}
                        </SelectItem>
                        <SelectItem value="AJUSTACION_TERMINADA">
                          {t("dashboard.claimStatus.status.AJUSTACION_TERMINADA")}
                        </SelectItem>
                        <SelectItem value="EN_PROCESO">
                          {t("dashboard.claimStatus.status.EN_PROCESO")}
                        </SelectItem>
                        <SelectItem value="APROVADA">
                          {t("dashboard.claimStatus.status.APROBADA")}
                        </SelectItem>
                        <SelectItem value="RECHAZADA">
                          {t("dashboard.claimStatus.status.RECHAZADA")}
                        </SelectItem>
                        <SelectItem value="CERRADA">
                          {t("dashboard.claimStatus.status.CERRADA")}
                        </SelectItem>
                        {customClaimStatuses.map((status: any) => (
                          <SelectItem key={status.id} value={status.name}>
                            {status.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Deducible</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.deductible}
                      onChange={(e) => setFormData({ ...formData, deductible: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Monto de Cobertura</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.coverageAmount}
                      onChange={(e) => setFormData({ ...formData, coverageAmount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.supplemented")}</label>
                    <Select
                      value={formData.suplementado}
                      onValueChange={(value) => setFormData({ ...formData, suplementado: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="si">{t("common.yes")}</SelectItem>
                        <SelectItem value="no">{t("common.no")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.firstCheck")}</label>
                    <Select
                      value={formData.primerCheque}
                      onValueChange={(value) => setFormData({ ...formData, primerCheque: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OBTENIDO">{t("clientProfile.firstCheck.received")}</SelectItem>
                        <SelectItem value="PENDIENTE">{t("clientProfile.firstCheck.pending")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.estimatedLoss")}</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.estimatedLoss}
                      onChange={(e) => setFormData({ ...formData, estimatedLoss: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Pago Real</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.actualPayout}
                      onChange={(e) => setFormData({ ...formData, actualPayout: e.target.value })}
                    />
                  </div>
                </CardContent>
              ) : (
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.insurance")}</label>
                    <p className="font-medium mt-1">{client.insuranceCompany || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.policyNumber")}</label>
                    <p className="font-medium mt-1">{client.policyNumber || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.claimNumber")}</label>
                    <p className="font-medium mt-1">{client.claimNumber || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.claimStatus")}</label>
                    <div className="mt-1">{getStatusBadge(client.claimStatus || "NO_SOMETIDA")}</div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Deducible</label>
                    <p className="font-medium mt-1">{formatCurrency(client.deductible)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Monto de Cobertura</label>
                    <p className="font-medium mt-1">{formatCurrency(client.coverageAmount)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.supplemented")}</label>
                    <Badge variant={client.suplementado === "si" ? "default" : "outline"} className="mt-1">
                      {client.suplementado === "si" ? t("common.yes") : t("common.no")}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.firstCheck")}</label>
                    <Badge variant={client.primerCheque === "OBTENIDO" ? "default" : "outline"} className="mt-1">
                      {client.primerCheque === "OBTENIDO"
                        ? t("clientProfile.firstCheck.received")
                        : t("clientProfile.firstCheck.pending")}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.estimatedLoss")}</label>
                    <p className="font-medium mt-1">{formatCurrency(client.estimatedLoss)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Pago Real</label>
                    <p className="font-medium mt-1">{formatCurrency(client.actualPayout)}</p>
                  </div>
                </CardContent>
              )}
            </Card>

            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t("clientProfile.sections.damage.title")}</CardTitle>
                {canEdit && (
                  <div className="flex items-center gap-2">
                    {editingSection === "damage" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEditing}
                          disabled={updateMutation.isPending}
                        >
                          {t("clientEdit.actions.cancel")}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveSection("damage")}
                          disabled={updateMutation.isPending}
                        >
                          {t("clientEdit.saveChanges")}
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => startEditing("damage")}>
                        {t("common.edit")}
                      </Button>
                    )}
                  </div>
                )}
              </CardHeader>
              {editingSection === "damage" ? (
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.damageType")}</label>
                    <Input
                      value={formData.damageType}
                      onChange={(e) => setFormData({ ...formData, damageType: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">
                      {t("clientProfile.labels.damageDescription")}
                    </label>
                    <Textarea
                      rows={4}
                      value={formData.damageDescription}
                      onChange={(e) => setFormData({ ...formData, damageDescription: e.target.value })}
                    />
                  </div>
                </CardContent>
              ) : (
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.damageType")}</label>
                    <p className="font-medium mt-1">{client.damageType || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">
                      {t("clientProfile.labels.damageDescription")}
                    </label>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{client.damageDescription || "-"}</p>
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* Property Tab */}
          <TabsContent value="property" className="space-y-4">
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {t("clientProfile.sections.property.title")}
                </CardTitle>
                {canEdit && (
                  <div className="flex items-center gap-2">
                    {editingSection === "property" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEditing}
                          disabled={updateMutation.isPending}
                        >
                          {t("clientEdit.actions.cancel")}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveSection("property")}
                          disabled={updateMutation.isPending}
                        >
                          {t("clientEdit.saveChanges")}
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => startEditing("property")}>
                        {t("common.edit")}
                      </Button>
                    )}
                  </div>
                )}
              </CardHeader>
              {editingSection === "property" ? (
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.propertyAddress")}</label>
                    <Input
                      value={formData.propertyAddress}
                      onChange={(e) => setFormData({ ...formData, propertyAddress: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Ciudad</label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.state")}</label>
                    <Input
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.zipCode")}</label>
                    <Input
                      value={formData.zipCode}
                      onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.propertyType")}</label>
                    <Input
                      value={formData.propertyType}
                      onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                    />
                  </div>
                </CardContent>
              ) : (
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.propertyAddress")}</label>
                    <p className="font-medium mt-1">{client.propertyAddress || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Ciudad</label>
                    <p className="font-medium mt-1">{client.city || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.state")}</label>
                    <p className="font-medium mt-1">{client.state || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.zipCode")}</label>
                    <p className="font-medium mt-1">{client.zipCode || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.propertyType")}</label>
                    <p className="font-medium mt-1">{client.propertyType || "-"}</p>
                  </div>
                </CardContent>
              )}
            </Card>

            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t("clientProfile.sections.construction.title")}</CardTitle>
                {canEdit && (
                  <div className="flex items-center gap-2">
                    {editingSection === "construction" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEditing}
                          disabled={updateMutation.isPending}
                        >
                          {t("clientEdit.actions.cancel")}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveSection("construction")}
                          disabled={updateMutation.isPending}
                        >
                          {t("clientEdit.saveChanges")}
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => startEditing("construction")}>
                        {t("common.edit")}
                      </Button>
                    )}
                  </div>
                )}
              </CardHeader>
              {editingSection === "construction" ? (
                <CardContent>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.constructionStatus")}</label>
                    <Input
                      value={formData.constructionStatus}
                      onChange={(e) => setFormData({ ...formData, constructionStatus: e.target.value })}
                    />
                  </div>
                </CardContent>
              ) : (
                <CardContent>
                  <div>
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.constructionStatus")}</label>
                    <p className="font-medium mt-1">{client.constructionStatus || "-"}</p>
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* Dates Tab */}
          <TabsContent value="dates" className="space-y-4">
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {t("clientProfile.sections.dates.title")}
                </CardTitle>
                {canEdit && (
                  <div className="flex items-center gap-2">
                    {editingSection === "dates" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEditing}
                          disabled={updateMutation.isPending}
                        >
                          {t("clientEdit.actions.cancel")}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveSection("dates")}
                          disabled={updateMutation.isPending}
                        >
                          {t("clientEdit.saveChanges")}
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => startEditing("dates")}>
                        {t("common.edit")}
                      </Button>
                    )}
                  </div>
                )}
              </CardHeader>
              {editingSection === "dates" ? (
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.dateOfLoss")}</label>
                    <Input
                      type="date"
                      value={formData.dateOfLoss}
                      onChange={(e) => setFormData({ ...formData, dateOfLoss: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">
                      {t("clientProfile.labels.claimSubmittedDate")}
                    </label>
                    <Input
                      type="date"
                      value={formData.claimSubmittedDate}
                      onChange={(e) => setFormData({ ...formData, claimSubmittedDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Visita Programada</label>
                    <Input
                      type="date"
                      value={formData.scheduledVisit}
                      onChange={(e) => setFormData({ ...formData, scheduledVisit: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.adjustmentDate")}</label>
                    <Input
                      type="date"
                      value={formData.adjustmentDate}
                      onChange={(e) => setFormData({ ...formData, adjustmentDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.lastContactDate")}</label>
                    <Input
                      type="date"
                      value={formData.lastContactDate}
                      onChange={(e) => setFormData({ ...formData, lastContactDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.nextContactDate")}</label>
                    <Input
                      type="date"
                      value={formData.nextContactDate}
                      onChange={(e) => setFormData({ ...formData, nextContactDate: e.target.value })}
                    />
                  </div>
                </CardContent>
              ) : (
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.dateOfLoss")}</label>
                    <p className="font-medium mt-1">{formatDate(client.dateOfLoss)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">
                      {t("clientProfile.labels.claimSubmittedDate")}
                    </label>
                    <p className="font-medium mt-1">{formatDate(client.claimSubmittedDate)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Visita Programada</label>
                    <p className="font-medium mt-1">{formatDate(client.scheduledVisit)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.adjustmentDate")}</label>
                    <p className="font-medium mt-1">{formatDate(client.adjustmentDate)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.lastContactDate")}</label>
                    <p className="font-medium mt-1">{formatDate(client.lastContactDate)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">{t("clientProfile.labels.nextContactDate")}</label>
                    <p className="font-medium mt-1">{formatDate(client.nextContactDate)}</p>
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            {/* Historial de Contactos */}
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Historial de Contactos</CardTitle>
                  <div className="flex items-center gap-2">
                    <NewActivityDialog
                      clientId={client.id}
                      clientName={`${client.firstName} ${client.lastName}`}
                      hideClientSelect
                      defaultActivityType={defaultActivityType || undefined}
                      openOnMount={openActivityOnLoad}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const showAll = document.getElementById("all-contacts");
                        if (showAll) {
                          showAll.style.display = showAll.style.display === "none" ? "block" : "none";
                        }
                      }}
                    >
                      Ver Todos
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {activityLogs && activityLogs.length > 0 ? (
                  <>
                    {/* Últimos 4 contactos */}
                    <div className="space-y-4">
                      {(activityLogs as ActivityLog[]).slice(0, 4).map((log) => (
                        renderActivityLog(log)
                      ))}
                    </div>

                    {/* Todos los contactos (oculto por defecto) */}
                    <div
                      id="all-contacts"
                      style={{ display: "none" }}
                      className="space-y-4 mt-4 pt-4 border-t border-border"
                    >
                      <h4 className="font-semibold mb-3">Historial Completo</h4>
                      {(activityLogs as ActivityLog[]).slice(4).map((log) => (
                        renderActivityLog(log)
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No hay actividad registrada</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <DocumentsTab clientId={clientId} />
          </TabsContent>

          <TabsContent value="emails">
            <EmailsTab clientId={clientId} clientEmail={client?.email || null} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
