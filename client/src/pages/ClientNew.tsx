import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { ManageClaimStatusesDialog } from "@/components/ManageClaimStatusesDialog";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ClientNew() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const { isAdmin, isCoAdmin } = usePermissions();
  const canEditClaimStatus = isAdmin || isCoAdmin;
  
  // Obtener estados personalizados de reclamo
  const { data: customClaimStatuses = [] } = trpc.customClaimStatuses.list.useQuery();
  
  // Obtener lista de usuarios de la organización
  const { data: organizationMembers = [] } = trpc.organizations.getMembers.useQuery();

  // Estados para el formulario
  const [formData, setFormData] = useState({
    // Información de contacto
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    alternatePhone: "",
    
    // Información de propiedad
    propertyAddress: "",
    city: "",
    state: "Illinois",
    zipCode: "",
    propertyType: "",
    
    // Información de aseguradora
    insuranceCompany: "",
    policyNumber: "",
    claimNumber: "",
    deductible: "",
    coverageAmount: "",
    
    // Estado del reclamo
    claimStatus: "NO_SOMETIDA",
    suplementado: "no" as const,
    primerCheque: "PENDIENTE" as const,
    
    // Fechas
    dateOfLoss: "",
    claimSubmittedDate: "",
    scheduledVisit: "",
    adjustmentDate: "",
    lastContactDate: "",
    nextContactDate: "",
    
    // Equipo
    salesPerson: "",
    assignedAdjuster: "",
    
    // Detalles del daño
    damageType: "",
    damageDescription: "",
    estimatedLoss: "",
    actualPayout: "",
    
    // Notas
    notes: "",
    internalNotes: "",
  });

  const createClientMutation = trpc.clients.create.useMutation({
    onSuccess: () => {
      toast.success("Cliente creado exitosamente");
      utils.clients.list.invalidate();
      setLocation("/clients");
    },
    onError: (error) => {
      toast.error(`Error al crear cliente: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones básicas
    if (!formData.firstName || !formData.lastName) {
      toast.error("Nombre y apellido son obligatorios");
      return;
    }

    // Preparar datos para enviar
    const dataToSend: any = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email || null,
      phone: formData.phone || null,
      alternatePhone: formData.alternatePhone || null,
      propertyAddress: formData.propertyAddress || null,
      city: formData.city || null,
      state: formData.state || null,
      zipCode: formData.zipCode || null,
      propertyType: formData.propertyType || null,
      insuranceCompany: formData.insuranceCompany || null,
      policyNumber: formData.policyNumber || null,
      claimNumber: formData.claimNumber || null,
      deductible: formData.deductible ? parseInt(formData.deductible) : null,
      coverageAmount: formData.coverageAmount ? parseInt(formData.coverageAmount) : null,
      claimStatus: formData.claimStatus,
      suplementado: formData.suplementado,
      primerCheque: formData.primerCheque,
      dateOfLoss: formData.dateOfLoss ? new Date(formData.dateOfLoss) : null,
      claimSubmittedDate: formData.claimSubmittedDate ? new Date(formData.claimSubmittedDate) : null,
      scheduledVisit: formData.scheduledVisit ? new Date(formData.scheduledVisit) : null,
      adjustmentDate: formData.adjustmentDate ? new Date(formData.adjustmentDate) : null,
      lastContactDate: formData.lastContactDate ? new Date(formData.lastContactDate) : null,
      nextContactDate: formData.nextContactDate ? new Date(formData.nextContactDate) : null,
      salesPerson: formData.salesPerson || null,
      assignedAdjuster: formData.assignedAdjuster || null,
      damageType: formData.damageType || null,
      damageDescription: formData.damageDescription || null,
      estimatedLoss: formData.estimatedLoss ? parseInt(formData.estimatedLoss) : null,
      actualPayout: formData.actualPayout ? parseInt(formData.actualPayout) : null,
      notes: formData.notes || null,
      internalNotes: formData.internalNotes || null,
    };

    createClientMutation.mutate(dataToSend);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/clients')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Nuevo Cliente</h1>
            <p className="text-muted-foreground mt-1">
              Complete la información del cliente para agregarlo al sistema
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información de Contacto */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Información de Contacto</CardTitle>
              <CardDescription>Datos básicos del cliente</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nombre *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Apellido *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono Principal</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alternatePhone">Teléfono Alternativo</Label>
                <Input
                  id="alternatePhone"
                  type="tel"
                  value={formData.alternatePhone}
                  onChange={(e) => handleChange('alternatePhone', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Información de la Propiedad */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Información de la Propiedad</CardTitle>
              <CardDescription>Ubicación y tipo de propiedad afectada</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="propertyAddress">Dirección de la Propiedad</Label>
                <Input
                  id="propertyAddress"
                  value={formData.propertyAddress}
                  onChange={(e) => handleChange('propertyAddress', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">Código Postal</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => handleChange('zipCode', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="propertyType">Tipo de Propiedad</Label>
                <Select value={formData.propertyType} onValueChange={(value) => handleChange('propertyType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Residential">Residencial</SelectItem>
                    <SelectItem value="Commercial">Comercial</SelectItem>
                    <SelectItem value="Condo">Condominio</SelectItem>
                    <SelectItem value="Townhouse">Casa Adosada</SelectItem>
                    <SelectItem value="Apartment">Apartamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Información de Aseguradora y Reclamo */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Información de Aseguradora y Reclamo</CardTitle>
              <CardDescription>Detalles de la póliza y el reclamo</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="insuranceCompany">Compañía de Seguros</Label>
                <Input
                  id="insuranceCompany"
                  value={formData.insuranceCompany}
                  onChange={(e) => handleChange('insuranceCompany', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="policyNumber">Número de Póliza</Label>
                <Input
                  id="policyNumber"
                  value={formData.policyNumber}
                  onChange={(e) => handleChange('policyNumber', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="claimNumber">Número de Reclamo</Label>
                <Input
                  id="claimNumber"
                  value={formData.claimNumber}
                  onChange={(e) => handleChange('claimNumber', e.target.value)}
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
                  onValueChange={(value: any) => handleChange('claimStatus', value)}
                  disabled={!canEditClaimStatus}
                >
                  <SelectTrigger disabled={!canEditClaimStatus}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Estados predeterminados */}
                    <SelectItem value="NO_SOMETIDA">No Sometida</SelectItem>
                    <SelectItem value="EN_PROCESO">En Proceso</SelectItem>
                    <SelectItem value="APROBADA">Aprobada</SelectItem>
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
                  value={formData.deductible}
                  onChange={(e) => handleChange('deductible', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coverageAmount">Monto de Cobertura ($)</Label>
                <Input
                  id="coverageAmount"
                  type="number"
                  value={formData.coverageAmount}
                  onChange={(e) => handleChange('coverageAmount', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="suplementado">Suplementado</Label>
                <Select value={formData.suplementado} onValueChange={(value: any) => handleChange('suplementado', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="si">Sí</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="primerCheque">Primer Cheque</Label>
                <Select value={formData.primerCheque} onValueChange={(value: any) => handleChange('primerCheque', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                    <SelectItem value="OBTENIDO">Obtenido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Información del Daño */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Información del Daño</CardTitle>
              <CardDescription>Tipo y descripción del daño a la propiedad</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="damageType">Tipo de Daño</Label>
                <Select value={formData.damageType} onValueChange={(value) => handleChange('damageType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fire">Incendio</SelectItem>
                    <SelectItem value="Water">Agua</SelectItem>
                    <SelectItem value="Wind">Viento</SelectItem>
                    <SelectItem value="Hail">Granizo</SelectItem>
                    <SelectItem value="Storm">Tormenta</SelectItem>
                    <SelectItem value="Theft">Robo</SelectItem>
                    <SelectItem value="Vandalism">Vandalismo</SelectItem>
                    <SelectItem value="Other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedLoss">Pérdida Estimada ($)</Label>
                <Input
                  id="estimatedLoss"
                  type="number"
                  value={formData.estimatedLoss}
                  onChange={(e) => handleChange('estimatedLoss', e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="damageDescription">Descripción del Daño</Label>
                <Textarea
                  id="damageDescription"
                  value={formData.damageDescription}
                  onChange={(e) => handleChange('damageDescription', e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Fechas Importantes */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Fechas Importantes</CardTitle>
              <CardDescription>Fechas clave del proceso del reclamo</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dateOfLoss">Fecha de Pérdida</Label>
                <Input
                  id="dateOfLoss"
                  type="date"
                  value={formData.dateOfLoss}
                  onChange={(e) => handleChange('dateOfLoss', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="claimSubmittedDate">Fecha de Sometimiento</Label>
                <Input
                  id="claimSubmittedDate"
                  type="date"
                  value={formData.claimSubmittedDate}
                  onChange={(e) => handleChange('claimSubmittedDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduledVisit">Visita Programada</Label>
                <Input
                  id="scheduledVisit"
                  type="date"
                  value={formData.scheduledVisit}
                  onChange={(e) => handleChange('scheduledVisit', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adjustmentDate">Fecha de Ajuste</Label>
                <Input
                  id="adjustmentDate"
                  type="date"
                  value={formData.adjustmentDate}
                  onChange={(e) => handleChange('adjustmentDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastContactDate">Último Contacto</Label>
                <Input
                  id="lastContactDate"
                  type="date"
                  value={formData.lastContactDate}
                  onChange={(e) => handleChange('lastContactDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nextContactDate">Próximo Contacto</Label>
                <Input
                  id="nextContactDate"
                  type="date"
                  value={formData.nextContactDate}
                  onChange={(e) => handleChange('nextContactDate', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Equipo Asignado */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Equipo Asignado</CardTitle>
              <CardDescription>Personal responsable del caso</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="salesPerson">Vendedor</Label>
                <Select 
                  value={formData.salesPerson} 
                  onValueChange={(value) => handleChange('salesPerson', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar vendedor..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_unassigned">Sin asignar</SelectItem>
                    {organizationMembers.map((member: any) => (
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
                  onValueChange={(value) => handleChange('assignedAdjuster', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar ajustador..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_unassigned">Sin asignar</SelectItem>
                    {organizationMembers.map((member: any) => (
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
              <CardTitle>Notas</CardTitle>
              <CardDescription>Información adicional sobre el cliente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Notas Públicas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows={3}
                  placeholder="Notas visibles para el cliente"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="internalNotes">Notas Internas</Label>
                <Textarea
                  id="internalNotes"
                  value={formData.internalNotes}
                  onChange={(e) => handleChange('internalNotes', e.target.value)}
                  rows={3}
                  placeholder="Notas solo para uso interno"
                />
              </div>
            </CardContent>
          </Card>

          {/* Botones de Acción */}
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation('/clients')}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createClientMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {createClientMutation.isPending ? "Guardando..." : "Guardar Cliente"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
