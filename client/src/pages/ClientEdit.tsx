import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ManageClaimStatusesDialog } from "@/components/ManageClaimStatusesDialog";

export default function ClientEdit() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const clientId = id || "";
  const { user } = useAuth();
  const { canEdit } = usePermissions();

  const { data: client, isLoading } = trpc.clients.getById.useQuery({ id: clientId });
  const { data: organizationMembers } = trpc.organizations.getMembers.useQuery();
  const { data: customClaimStatuses = [] } = trpc.customClaimStatuses.list.useQuery();
  const updateMutation = trpc.clients.update.useMutation();
  const utils = trpc.useUtils();
  
  // Solo ADMIN y CO_ADMIN pueden editar estado del reclamo
  const canEditClaimStatus = user && (user.role === 'admin' || canEdit);

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
    insuranceCompany: "",
    policyNumber: "",
    claimNumber: "",
    claimStatus: "NO_SOMETIDA",
    deductible: "",
    damageType: "",
    dateOfLoss: "",
    claimSubmittedDate: "",
    scheduledVisit: "",
    adjustmentDate: "",
    salesPerson: "",
    assignedAdjuster: "",
    notes: "",
    insuranceEstimate: "",
    firstCheckAmount: "",
  });

  useEffect(() => {
    if (client) {
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
        insuranceCompany: client.insuranceCompany || "",
        policyNumber: client.policyNumber || "",
        claimNumber: client.claimNumber || "",
        claimStatus: client.claimStatus || "NO_SOMETIDA",
        deductible: client.deductible?.toString() || "",
        damageType: client.damageType || "",
        dateOfLoss: client.dateOfLoss ? new Date(client.dateOfLoss).toISOString().split('T')[0] : "",
        claimSubmittedDate: client.claimSubmittedDate ? new Date(client.claimSubmittedDate).toISOString().split('T')[0] : "",
        scheduledVisit: client.scheduledVisit ? new Date(client.scheduledVisit).toISOString().split('T')[0] : "",
        adjustmentDate: client.adjustmentDate ? new Date(client.adjustmentDate).toISOString().split('T')[0] : "",
        salesPerson: client.salesPerson || "",
        assignedAdjuster: client.assignedAdjuster || "",
        notes: client.notes || "",
        insuranceEstimate: client.insuranceEstimate?.toString() || "",
        firstCheckAmount: client.firstCheckAmount?.toString() || "",
      });
    }
  }, [client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateMutation.mutateAsync({
        id: clientId,
        data: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email || null,
          phone: formData.phone || null,
          alternatePhone: formData.alternatePhone || null,
          propertyAddress: formData.propertyAddress || null,
          city: formData.city || null,
          state: formData.state || null,
          zipCode: formData.zipCode || null,
          insuranceCompany: formData.insuranceCompany || null,
          policyNumber: formData.policyNumber || null,
          claimNumber: formData.claimNumber || null,
          claimStatus: formData.claimStatus as any,
          deductible: formData.deductible ? parseFloat(formData.deductible) : null,
          damageType: formData.damageType || null,
          dateOfLoss: formData.dateOfLoss ? new Date(formData.dateOfLoss) : null,
          claimSubmittedDate: formData.claimSubmittedDate ? new Date(formData.claimSubmittedDate) : null,
          scheduledVisit: formData.scheduledVisit ? new Date(formData.scheduledVisit) : null,
          adjustmentDate: formData.adjustmentDate ? new Date(formData.adjustmentDate) : null,
          salesPerson: formData.salesPerson || null,
          assignedAdjuster: formData.assignedAdjuster || null,
          notes: formData.notes || null,
          insuranceEstimate: formData.insuranceEstimate ? parseFloat(formData.insuranceEstimate) : null,
          firstCheckAmount: formData.firstCheckAmount ? parseFloat(formData.firstCheckAmount) : null,
        },
      });

      utils.clients.getById.invalidate({ id: clientId });
      utils.clients.list.invalidate();
      toast.success("Cliente actualizado correctamente");
      setLocation(`/clients/${clientId}`);
    } catch (error) {
      toast.error("Error al actualizar el cliente");
      console.error(error);
    }
  };

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
          <p className="text-muted-foreground">Cliente no encontrado</p>
          <Button onClick={() => setLocation('/clients')}>
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation(`/clients/${clientId}`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Editar Cliente
              </h1>
              <p className="text-muted-foreground mt-1">
                {client.firstName} {client.lastName}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información Personal */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nombre *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Apellido *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono Principal</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alternatePhone">Teléfono Alternativo</Label>
                <Input
                  id="alternatePhone"
                  type="tel"
                  value={formData.alternatePhone}
                  onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Dirección */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Dirección de la Propiedad</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="propertyAddress">Dirección</Label>
                <Input
                  id="propertyAddress"
                  value={formData.propertyAddress}
                  onChange={(e) => setFormData({ ...formData, propertyAddress: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">Código Postal</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Información del Reclamo */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Información del Reclamo</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="insuranceCompany">Aseguradora</Label>
                <Input
                  id="insuranceCompany"
                  value={formData.insuranceCompany}
                  onChange={(e) => setFormData({ ...formData, insuranceCompany: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="policyNumber">Número de Póliza</Label>
                <Input
                  id="policyNumber"
                  value={formData.policyNumber}
                  onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="claimNumber">Número de Reclamo</Label>
                <Input
                  id="claimNumber"
                  value={formData.claimNumber}
                  onChange={(e) => setFormData({ ...formData, claimNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="claimStatus">Estado del Reclamo</Label>
                  {canEditClaimStatus && (
                    <ManageClaimStatusesDialog />
                  )}
                </div>
                {!canEditClaimStatus && (
                  <Alert className="mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Solo administradores pueden cambiar el estado del reclamo
                    </AlertDescription>
                  </Alert>
                )}
                <Select
                  value={formData.claimStatus}
                  onValueChange={(value) => setFormData({ ...formData, claimStatus: value })}
                  disabled={!canEditClaimStatus}
                >
                  <SelectTrigger disabled={!canEditClaimStatus}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Estados predeterminados */}
                    <SelectItem value="NO_SOMETIDA">No Sometida</SelectItem>
                    <SelectItem value="EN_PROCESO">En Proceso</SelectItem>
                    <SelectItem value="APROVADA">Aprobada</SelectItem>
                    <SelectItem value="RECHAZADA">Rechazada</SelectItem>
                    <SelectItem value="CERRADA">Cerrada</SelectItem>
                    
                    {/* Estados personalizados */}
                    {customClaimStatuses.map((status: any) => (
                      <SelectItem key={status.id} value={status.name}>
                        {status.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deductible">Deducible ($)</Label>
                <Input
                  id="deductible"
                  type="number"
                  step="0.01"
                  value={formData.deductible}
                  onChange={(e) => setFormData({ ...formData, deductible: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="damageType">Tipo de Daño</Label>
                <Input
                  id="damageType"
                  value={formData.damageType}
                  onChange={(e) => setFormData({ ...formData, damageType: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="insuranceEstimate">Estimado de Aseguranza ($)</Label>
                <Input
                  id="insuranceEstimate"
                  type="number"
                  step="0.01"
                  value={formData.insuranceEstimate}
                  onChange={(e) => setFormData({ ...formData, insuranceEstimate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstCheckAmount">Primer Cheque ($)</Label>
                <Input
                  id="firstCheckAmount"
                  type="number"
                  step="0.01"
                  value={formData.firstCheckAmount}
                  onChange={(e) => setFormData({ ...formData, firstCheckAmount: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Fechas */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Fechas Importantes</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dateOfLoss">Fecha del Siniestro</Label>
                <Input
                  id="dateOfLoss"
                  type="date"
                  value={formData.dateOfLoss}
                  onChange={(e) => setFormData({ ...formData, dateOfLoss: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="claimSubmittedDate">Fecha de Reporte</Label>
                <Input
                  id="claimSubmittedDate"
                  type="date"
                  value={formData.claimSubmittedDate}
                  onChange={(e) => setFormData({ ...formData, claimSubmittedDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduledVisit">Visita Programada</Label>
                <Input
                  id="scheduledVisit"
                  type="date"
                  value={formData.scheduledVisit}
                  onChange={(e) => setFormData({ ...formData, scheduledVisit: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adjustmentDate">Fecha de Ajustación</Label>
                <Input
                  id="adjustmentDate"
                  type="date"
                  value={formData.adjustmentDate}
                  onChange={(e) => setFormData({ ...formData, adjustmentDate: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Equipo Asignado */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Equipo Asignado</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="salesPerson">Vendedor</Label>
                <Select
                  value={formData.salesPerson}
                  onValueChange={(value) => setFormData({ ...formData, salesPerson: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar vendedor..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sin_asignar">Sin asignar</SelectItem>
                    {organizationMembers?.map((member: any) => (
                      <SelectItem key={member.id} value={member.username}>
                        {member.username} ({member.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignedAdjuster">Ajustador Asignado</Label>
                <Select
                  value={formData.assignedAdjuster}
                  onValueChange={(value) => setFormData({ ...formData, assignedAdjuster: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar ajustador..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sin_asignar">Sin asignar</SelectItem>
                    {organizationMembers?.map((member: any) => (
                      <SelectItem key={member.id} value={member.username}>
                        {member.username} ({member.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Notas */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Notas Adicionales</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                placeholder="Notas adicionales sobre el cliente o el caso..."
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation(`/clients/${clientId}`)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {updateMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
