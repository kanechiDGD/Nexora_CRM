import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import DocumentsTab from "@/components/DocumentsTab";

type ActivityLog = {
  id: number;
  activityType: string;
  performedAt: string | Date;
  performedBy: number | string;
  subject?: string | null;
  description?: string | null;
};

export default function ClientProfile() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const clientId = id || "";

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

  const utils = trpc.useUtils();

  // Definir todas las funciones ANTES de los early returns
  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
    > = {
      NO_SOMETIDA: { variant: "outline", label: "No Sometida" },
      EN_PROCESO: { variant: "secondary", label: "En Proceso" },
      APROVADA: { variant: "default", label: "Aprobada" },
      RECHAZADA: { variant: "destructive", label: "Rechazada" },
      CERRADA: { variant: "outline", label: "Cerrada" },
    };
    const config = variants[status] || { variant: "outline", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("es-ES", {
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
          <p className="text-muted-foreground">Cliente no encontrado</p>
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
              <p className="text-muted-foreground mt-1">Cliente ID: {client.id}</p>
            </div>
          </div>
          <Button onClick={() => setLocation(`/clients/${client.id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar Cliente
          </Button>
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
                  <p className="text-sm text-muted-foreground">Estado</p>
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
                  <p className="text-sm text-muted-foreground">Aseguradora</p>
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
                  <p className="text-sm text-muted-foreground">Deducible</p>
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
                  <p className="text-sm text-muted-foreground">Vendedor</p>
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
                  <p className="text-sm text-muted-foreground">Estimado Aseguranza</p>
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
                  <p className="text-sm text-muted-foreground">Primer Cheque</p>
                  <p className="font-medium mt-1">{formatCurrency(client.firstCheckAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Information Tabs */}
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">Información General</TabsTrigger>
            <TabsTrigger value="claim">Reclamo</TabsTrigger>
            <TabsTrigger value="property">Propiedad</TabsTrigger>
            <TabsTrigger value="dates">Fechas</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
            <TabsTrigger value="activity">Actividad</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Información de Contacto
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm text-muted-foreground">Nombre Completo</label>
                  <p className="font-medium mt-1">
                    {client.firstName} {client.lastName}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Email</label>
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
                  <label className="text-sm text-muted-foreground">Teléfono Principal</label>
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
                  <label className="text-sm text-muted-foreground">Teléfono Alternativo</label>
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
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Equipo Asignado
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm text-muted-foreground">Vendedor</label>
                  <p className="font-medium mt-1">{client.salesPerson || "-"}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Ajustador Asignado</label>
                  <p className="font-medium mt-1">{client.assignedAdjuster || "-"}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Claim Tab */}
          <TabsContent value="claim" className="space-y-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Información del Reclamo
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm text-muted-foreground">Aseguradora</label>
                  <p className="font-medium mt-1">{client.insuranceCompany || "-"}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Número de Póliza</label>
                  <p className="font-medium mt-1">{client.policyNumber || "-"}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Número de Reclamo</label>
                  <p className="font-medium mt-1">{client.claimNumber || "-"}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Estado del Reclamo</label>
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
                  <label className="text-sm text-muted-foreground">Suplementado</label>
                  <Badge variant={client.suplementado === "si" ? "default" : "outline"} className="mt-1">
                    {client.suplementado === "si" ? "Sí" : "No"}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Primer Cheque</label>
                  <Badge variant={client.primerCheque === "OBTENIDO" ? "default" : "outline"} className="mt-1">
                    {client.primerCheque === "OBTENIDO" ? "Obtenido" : "Pendiente"}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Pérdida Estimada</label>
                  <p className="font-medium mt-1">{formatCurrency(client.estimatedLoss)}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Pago Real</label>
                  <p className="font-medium mt-1">{formatCurrency(client.actualPayout)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Tipo y Descripción del Daño</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground">Tipo de Daño</label>
                  <p className="font-medium mt-1">{client.damageType || "-"}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Descripción del Daño</label>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{client.damageDescription || "-"}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Property Tab */}
          <TabsContent value="property" className="space-y-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Información de la Propiedad
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="text-sm text-muted-foreground">Dirección</label>
                  <p className="font-medium mt-1">{client.propertyAddress || "-"}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Ciudad</label>
                  <p className="font-medium mt-1">{client.city || "-"}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Estado</label>
                  <p className="font-medium mt-1">{client.state || "-"}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Código Postal</label>
                  <p className="font-medium mt-1">{client.zipCode || "-"}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Tipo de Propiedad</label>
                  <p className="font-medium mt-1">{client.propertyType || "-"}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Estado de Construcción</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <label className="text-sm text-muted-foreground">Estado</label>
                  <p className="font-medium mt-1">{client.constructionStatus || "-"}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dates Tab */}
          <TabsContent value="dates" className="space-y-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Fechas Importantes
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm text-muted-foreground">Fecha de Pérdida</label>
                  <p className="font-medium mt-1">{formatDate(client.dateOfLoss)}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Fecha de Sometimiento</label>
                  <p className="font-medium mt-1">{formatDate(client.claimSubmittedDate)}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Visita Programada</label>
                  <p className="font-medium mt-1">{formatDate(client.scheduledVisit)}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Fecha de Ajuste</label>
                  <p className="font-medium mt-1">{formatDate(client.adjustmentDate)}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Último Contacto</label>
                  <p className="font-medium mt-1">{formatDate(client.lastContactDate)}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Próximo Contacto</label>
                  <p className="font-medium mt-1">{formatDate(client.nextContactDate)}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            {/* Historial de Contactos */}
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Historial de Contactos</CardTitle>
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
              </CardHeader>
              <CardContent>
                {activityLogs && activityLogs.length > 0 ? (
                  <>
                    {/* Últimos 4 contactos */}
                    <div className="space-y-4">
                      {(activityLogs as ActivityLog[]).slice(0, 4).map((log) => (
                        <div
                          key={log.id}
                          className="flex gap-4 p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge variant="outline">{log.activityType}</Badge>
                              <span className="text-sm font-medium">
                                {new Date(log.performedAt).toLocaleDateString("es-ES", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                por Usuario #{log.performedBy}
                              </span>
                            </div>
                            {log.subject && <p className="font-medium mb-1">{log.subject}</p>}
                            {log.description && <p className="text-sm text-muted-foreground">{log.description}</p>}
                          </div>
                        </div>
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
                        <div
                          key={log.id}
                          className="flex gap-4 p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge variant="outline">{log.activityType}</Badge>
                              <span className="text-sm font-medium">
                                {new Date(log.performedAt).toLocaleDateString("es-ES", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                por Usuario #{log.performedBy}
                              </span>
                            </div>
                            {log.subject && <p className="font-medium mb-1">{log.subject}</p>}
                            {log.description && <p className="text-sm text-muted-foreground">{log.description}</p>}
                          </div>
                        </div>
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
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
