import { useEffect, useRef, useState } from "react";
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
import { useTranslation } from "react-i18next";
import { loadGoogleMapsScript } from "@/lib/googleMaps";

export default function ClientNew() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const { isAdmin, isCoAdmin } = usePermissions();
  const canEditClaimStatus = isAdmin || isCoAdmin;
  
  // Obtener estados personalizados de reclamo
  const { data: customClaimStatuses = [] } = trpc.customClaimStatuses.list.useQuery();
  
  // Obtener lista de usuarios de la organización
  const { data: organizationMembers = [] } = trpc.organizations.getMembers.useQuery();

  const addressInputRef = useRef<HTMLInputElement | null>(null);

  const propertyTypeOptions = [
    { value: "Residential", labelKey: "clientNew.propertyTypes.residential" },
    { value: "Commercial", labelKey: "clientNew.propertyTypes.commercial" },
    { value: "Condo", labelKey: "clientNew.propertyTypes.condo" },
    { value: "Townhouse", labelKey: "clientNew.propertyTypes.townhouse" },
    { value: "Apartment", labelKey: "clientNew.propertyTypes.apartment" },
  ];

  const damageTypeOptions = [
    { value: "Fire", labelKey: "clientNew.damageTypes.fire" },
    { value: "Water", labelKey: "clientNew.damageTypes.water" },
    { value: "Wind", labelKey: "clientNew.damageTypes.wind" },
    { value: "Hail", labelKey: "clientNew.damageTypes.hail" },
    { value: "Storm", labelKey: "clientNew.damageTypes.storm" },
    { value: "Theft", labelKey: "clientNew.damageTypes.theft" },
    { value: "Vandalism", labelKey: "clientNew.damageTypes.vandalism" },
    { value: "Other", labelKey: "clientNew.damageTypes.other" },
  ];

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

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
    if (!apiKey) {
      return;
    }

    let autocomplete: any = null;
    let listener: any = null;

    loadGoogleMapsScript(apiKey)
      .then(() => {
        const input = addressInputRef.current;
        const w = window as any;
        if (!input || !w.google?.maps?.places) return;

        autocomplete = new w.google.maps.places.Autocomplete(input, {
          types: ["address"],
          fields: ["address_components", "formatted_address"],
        });

        const getComponent = (type: string, useShort = false) => {
          const place = autocomplete?.getPlace();
          const components = place?.address_components || [];
          const component = components.find((item: any) => item.types?.includes(type));
          if (!component) return "";
          return useShort ? component.short_name : component.long_name;
        };

        listener = autocomplete.addListener("place_changed", () => {
          const place = autocomplete?.getPlace();
          if (!place) return;

          const streetNumber = getComponent("street_number");
          const route = getComponent("route");
          const streetLine = [streetNumber, route].filter(Boolean).join(" ").trim();
          const city =
            getComponent("locality") ||
            getComponent("postal_town") ||
            getComponent("sublocality") ||
            getComponent("sublocality_level_1");
          const state = getComponent("administrative_area_level_1", true) || getComponent("administrative_area_level_1");
          const zipCode = getComponent("postal_code");
          const formatted = place.formatted_address || streetLine;

          setFormData((prev) => ({
            ...prev,
            propertyAddress: streetLine || formatted || prev.propertyAddress,
            city: city || prev.city,
            state: state || prev.state,
            zipCode: zipCode || prev.zipCode,
          }));
        });
      })
      .catch(() => {});

    return () => {
      if (listener) {
        listener.remove();
      }
      if (autocomplete) {
        const w = window as any;
        w.google?.maps?.event?.clearInstanceListeners(autocomplete);
      }
    };
  }, []);

  const createClientMutation = trpc.clients.create.useMutation({
    onSuccess: () => {
      toast.success(t('clientNew.createSuccess'));
      utils.clients.list.invalidate();
      setLocation("/clients");
    },
    onError: (error) => {
      toast.error(t("clientNew.createError", { message: error.message }));
    },
  });

  // Funciones de validación
  const validateEmail = (email: string): boolean => {
    if (!email) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true;
    const phoneRegex = /^[0-9\s\-\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  };

  const validateZipCode = (zipCode: string): boolean => {
    if (!zipCode) return true;
    const zipRegex = /^\d{5}$/;
    return zipRegex.test(zipCode);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones basicas
    if (!formData.firstName || !formData.lastName) {
      toast.error(t("clientNew.validation.nameRequired"));
      return;
    }

    if (formData.email && !validateEmail(formData.email)) {
      toast.error(t("clientNew.validation.invalidEmail"));
      return;
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      toast.error(t("clientNew.validation.invalidPhone"));
      return;
    }

    if (formData.alternatePhone && !validatePhone(formData.alternatePhone)) {
      toast.error(t("clientNew.validation.invalidAlternatePhone"));
      return;
    }

    if (formData.zipCode && !validateZipCode(formData.zipCode)) {
      toast.error(t("clientNew.validation.invalidZipCode"));
      return;
    }

    if (formData.deductible && isNaN(parseInt(formData.deductible))) {
      toast.error(t("clientNew.validation.invalidDeductible"));
      return;
    }

    if (formData.coverageAmount && isNaN(parseInt(formData.coverageAmount))) {
      toast.error(t("clientNew.validation.invalidCoverageAmount"));
      return;
    }

    if (formData.estimatedLoss && isNaN(parseInt(formData.estimatedLoss))) {
      toast.error(t("clientNew.validation.invalidEstimatedLoss"));
      return;
    }

    if (formData.actualPayout && isNaN(parseInt(formData.actualPayout))) {
      toast.error(t("clientNew.validation.invalidActualPayout"));
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
            <h1 className="text-3xl font-bold text-foreground">{t("clientNew.title")}</h1>
            <p className="text-muted-foreground mt-1">
              {t("clientNew.subtitle")}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información de Contacto */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>{t("clientNew.sections.contact.title")}</CardTitle>
              <CardDescription>{t("clientNew.sections.contact.description")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t("clientNew.fields.firstName")}</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t("clientNew.fields.lastName")}</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("clientNew.fields.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t("clientNew.fields.phone")}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alternatePhone">{t("clientNew.fields.alternatePhone")}</Label>
                <Input
                  id="alternatePhone"
                  type="tel"
                  value={formData.alternatePhone}
                  onChange={(e) => handleChange('alternatePhone', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Informacion de la Propiedad */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>{t("clientNew.sections.property.title")}</CardTitle>
              <CardDescription>{t("clientNew.sections.property.description")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="propertyAddress">{t("clientNew.fields.propertyAddress")}</Label>
                <Input
                  id="propertyAddress"
                  ref={addressInputRef}
                  value={formData.propertyAddress}
                  onChange={(e) => handleChange('propertyAddress', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">{t("clientNew.fields.city")}</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">{t("clientNew.fields.state")}</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">{t("clientNew.fields.zipCode")}</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => handleChange('zipCode', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="propertyType">{t("clientNew.fields.propertyType")}</Label>
                <Select value={formData.propertyType} onValueChange={(value) => handleChange('propertyType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("clientNew.placeholders.propertyType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Informacion de Aseguradora y Reclamo */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>{t("clientNew.sections.insurance.title")}</CardTitle>
              <CardDescription>{t("clientNew.sections.insurance.description")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="insuranceCompany">{t("clientNew.fields.insuranceCompany")}</Label>
                <Input
                  id="insuranceCompany"
                  value={formData.insuranceCompany}
                  onChange={(e) => handleChange('insuranceCompany', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="policyNumber">{t("clientNew.fields.policyNumber")}</Label>
                <Input
                  id="policyNumber"
                  value={formData.policyNumber}
                  onChange={(e) => handleChange('policyNumber', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="claimNumber">{t("clientNew.fields.claimNumber")}</Label>
                <Input
                  id="claimNumber"
                  value={formData.claimNumber}
                  onChange={(e) => handleChange('claimNumber', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="claimStatus">{t("clientNew.fields.claimStatus")}</Label>
                  {canEditClaimStatus && (
                    <ManageClaimStatusesDialog />
                  )}
                </div>
                {!canEditClaimStatus && (
                  <Alert className="mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {t("clientNew.claimStatusReadOnly")}
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
                    <SelectItem value="NO_SOMETIDA">{t("dashboard.claimStatus.status.NO_SOMETIDA")}</SelectItem>
                    <SelectItem value="SOMETIDA">{t("dashboard.claimStatus.status.SOMETIDA")}</SelectItem>
                    <SelectItem value="AJUSTACION_PROGRAMADA">{t("dashboard.claimStatus.status.AJUSTACION_PROGRAMADA")}</SelectItem>
                    <SelectItem value="AJUSTACION_TERMINADA">{t("dashboard.claimStatus.status.AJUSTACION_TERMINADA")}</SelectItem>
                    <SelectItem value="EN_PROCESO">{t("dashboard.claimStatus.status.EN_PROCESO")}</SelectItem>
                    <SelectItem value="APROBADA">{t("dashboard.claimStatus.status.APROBADA")}</SelectItem>
                    <SelectItem value="RECHAZADA">{t("dashboard.claimStatus.status.RECHAZADA")}</SelectItem>
                    <SelectItem value="CERRADA">{t("dashboard.claimStatus.status.CERRADA")}</SelectItem>
                    
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
                <Label htmlFor="deductible">{t("clientNew.fields.deductible")}</Label>
                <Input
                  id="deductible"
                  type="number"
                  value={formData.deductible}
                  onChange={(e) => handleChange('deductible', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coverageAmount">{t("clientNew.fields.coverageAmount")}</Label>
                <Input
                  id="coverageAmount"
                  type="number"
                  value={formData.coverageAmount}
                  onChange={(e) => handleChange('coverageAmount', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="suplementado">{t('clientNew.supplementedLabel')}</Label>
                <Select value={formData.suplementado} onValueChange={(value: any) => handleChange('suplementado', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">{t('clientNew.supplemented.no')}</SelectItem>
                    <SelectItem value="si">{t('clientNew.supplemented.yes')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="primerCheque">{t('clientNew.firstCheck.label')}</Label>
                <Select value={formData.primerCheque} onValueChange={(value: any) => handleChange('primerCheque', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDIENTE">{t('clientNew.firstCheck.pending')}</SelectItem>
                    <SelectItem value="OBTENIDO">{t('clientNew.firstCheck.received')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Informacion del Dano */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>{t("clientNew.sections.damage.title")}</CardTitle>
              <CardDescription>{t("clientNew.sections.damage.description")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="damageType">{t("clientNew.fields.damageType")}</Label>
                <Select value={formData.damageType} onValueChange={(value) => handleChange('damageType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("clientNew.placeholders.damageType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {damageTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedLoss">{t("clientNew.fields.estimatedLoss")}</Label>
                <Input
                  id="estimatedLoss"
                  type="number"
                  value={formData.estimatedLoss}
                  onChange={(e) => handleChange('estimatedLoss', e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="damageDescription">{t("clientNew.fields.damageDescription")}</Label>
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
              <CardTitle>{t("clientNew.sections.dates.title")}</CardTitle>
              <CardDescription>{t("clientNew.sections.dates.description")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dateOfLoss">{t("clientNew.fields.dateOfLoss")}</Label>
                <Input
                  id="dateOfLoss"
                  type="date"
                  value={formData.dateOfLoss}
                  onChange={(e) => handleChange('dateOfLoss', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="claimSubmittedDate">{t("clientNew.fields.claimSubmittedDate")}</Label>
                <Input
                  id="claimSubmittedDate"
                  type="date"
                  value={formData.claimSubmittedDate}
                  onChange={(e) => handleChange('claimSubmittedDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduledVisit">{t("clientNew.fields.scheduledVisit")}</Label>
                <Input
                  id="scheduledVisit"
                  type="date"
                  value={formData.scheduledVisit}
                  onChange={(e) => handleChange('scheduledVisit', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adjustmentDate">{t("clientNew.fields.adjustmentDate")}</Label>
                <Input
                  id="adjustmentDate"
                  type="date"
                  value={formData.adjustmentDate}
                  onChange={(e) => handleChange('adjustmentDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastContactDate">{t("clientNew.fields.lastContactDate")}</Label>
                <Input
                  id="lastContactDate"
                  type="date"
                  value={formData.lastContactDate}
                  onChange={(e) => handleChange('lastContactDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nextContactDate">{t("clientNew.fields.nextContactDate")}</Label>
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
              <CardTitle>{t("clientNew.sections.team.title")}</CardTitle>
              <CardDescription>{t("clientNew.sections.team.description")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="salesPerson">{t("clientNew.fields.salesPerson")}</Label>
                <Select 
                  value={formData.salesPerson} 
                  onValueChange={(value) => handleChange('salesPerson', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("clientNew.placeholders.salesPerson")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_unassigned">{t("clientNew.unassigned")}</SelectItem>
                    {organizationMembers.map((member: any) => (
                      <SelectItem key={member.id} value={member.username}>
                        {member.username} ({member.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignedAdjuster">{t("clientNew.fields.assignedAdjuster")}</Label>
                <Select 
                  value={formData.assignedAdjuster} 
                  onValueChange={(value) => handleChange('assignedAdjuster', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('clientNew.adjusterPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_unassigned">{t("clientNew.unassigned")}</SelectItem>
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
              <CardTitle>{t("clientNew.sections.notes.title")}</CardTitle>
              <CardDescription>{t("clientNew.sections.notes.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">{t("clientNew.fields.notes")}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows={3}
                  placeholder={t('clientNew.notesPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="internalNotes">{t("clientNew.fields.internalNotes")}</Label>
                <Textarea
                  id="internalNotes"
                  value={formData.internalNotes}
                  onChange={(e) => handleChange('internalNotes', e.target.value)}
                  rows={3}
                  placeholder={t("clientNew.placeholders.internalNotes")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Botones de Accion */}
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation('/clients')}
            >
              {t("clientNew.actions.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={createClientMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {createClientMutation.isPending ? t('clientNew.saving') : t('clientNew.save')}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
