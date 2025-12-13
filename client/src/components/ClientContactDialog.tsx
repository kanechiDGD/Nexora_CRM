import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Phone, Mail, MapPin, Calendar, User, FileText, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface ClientContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

export function ClientContactDialog({ open, onOpenChange, clientId, clientName }: ClientContactDialogProps) {
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
  
  const lastActivity = activities && activities.length > 0 ? activities[0] : null;
  
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
      toast.error(`Error al registrar actividad: ${error.message}`);
    },
  });

  // Mutación para actualizar fecha de contacto del cliente
  const updateClientContact = trpc.clients.update.useMutation({
    onSuccess: () => {
      toast.success("Contacto registrado y cliente actualizado");
      utils.dashboard.lateContact.invalidate();
      utils.clients.list.invalidate();
      utils.activityLogs.getByClientId.invalidate();
      setDescription("");
      setSubject("");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Error al actualizar cliente: ${error.message}`);
    },
  });
  
  const handleSubmit = () => {
    if (!clientId) return;
    if (!description || !subject) {
      toast.error("Por favor completa el asunto y la descripción");
      return;
    }
    
    createActivity.mutate({
      clientId,
      activityType: contactMethod as any,
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
            <DialogTitle>Cargando información del cliente</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Cargando información...</p>
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
    if (days >= 7) return <Badge variant="destructive">Alta Prioridad</Badge>;
    if (days >= 5) return <Badge className="bg-orange-500">Media Prioridad</Badge>;
    return <Badge className="bg-yellow-500">Baja Prioridad</Badge>;
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
            Información de contacto y última actividad registrada
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Estado de Contacto */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Días desde último contacto</p>
              <p className="text-3xl font-bold">{daysSinceContact}</p>
            </div>
            <div>
              {getPriorityBadge(daysSinceContact)}
            </div>
          </div>
          
          {/* Información de Contacto */}
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Información de Contacto
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
                  <Badge variant="outline">Principal</Badge>
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
                  <Badge variant="outline">Alternativo</Badge>
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
              Última Actividad Registrada
            </h3>
            
            {lastActivity ? (
              <div className="space-y-3 bg-card p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <Badge>{lastActivity.activityType}</Badge>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(lastActivity.performedAt), "PPP 'a las' p", { locale: es })}
                  </div>
                </div>
                
                {lastActivity.subject && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Asunto:</p>
                    <p>{lastActivity.subject}</p>
                  </div>
                )}
                
                {lastActivity.description && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Descripción:</p>
                    <p className="text-sm">{lastActivity.description}</p>
                  </div>
                )}
                
                {lastActivity.outcome && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Resultado:</p>
                    <p className="text-sm">{lastActivity.outcome}</p>
                  </div>
                )}
                
                <Separator />
                
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Contactado por:</span>
                  <span className="font-semibold">Usuario #{lastActivity.performedBy}</span>
                </div>
              </div>
            ) : (
              <div className="bg-muted p-4 rounded-lg text-center">
                <p className="text-muted-foreground">No hay actividades registradas para este cliente</p>
              </div>
            )}
          </div>
          
          {/* Información Adicional del Reclamo */}
          {client.insuranceCompany && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-lg mb-3">Información del Reclamo</h3>
                <div className="grid grid-cols-2 gap-4 bg-card p-4 rounded-lg border">
                  {client.insuranceCompany && (
                    <div>
                      <p className="text-sm text-muted-foreground">Aseguradora</p>
                      <p className="font-semibold">{client.insuranceCompany}</p>
                    </div>
                  )}
                  {client.claimNumber && (
                    <div>
                      <p className="text-sm text-muted-foreground">Número de Reclamo</p>
                      <p className="font-semibold">{client.claimNumber}</p>
                    </div>
                  )}
                  {client.claimStatus && (
                    <div>
                      <p className="text-sm text-muted-foreground">Estado</p>
                      <Badge>{client.claimStatus}</Badge>
                    </div>
                  )}
                  {client.assignedAdjuster && (
                    <div>
                      <p className="text-sm text-muted-foreground">Ajustador Asignado</p>
                      <p className="font-semibold">{client.assignedAdjuster}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
          
          {/* Formulario de Registro de Contacto */}
          <Separator />
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Registrar Nuevo Contacto
            </h3>
            <div className="space-y-4 bg-muted/50 p-4 rounded-lg border border-dashed">
              <div className="grid gap-2">
                <Label htmlFor="contact-method">Método de Contacto</Label>
                <Select value={contactMethod} onValueChange={setContactMethod}>
                  <SelectTrigger id="contact-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LLAMADA">Llamada</SelectItem>
                    <SelectItem value="CORREO">Email</SelectItem>
                    <SelectItem value="VISITA">Visita</SelectItem>
                    <SelectItem value="NOTA">Nota</SelectItem>
                    <SelectItem value="DOCUMENTO">Documento</SelectItem>
                    <SelectItem value="CAMBIO_ESTADO">Cambio de Estado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="subject">Asunto</Label>
                <Input
                  id="subject"
                  placeholder="Resumen breve del contacto..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Descripción / Notas</Label>
                <Textarea
                  id="description"
                  placeholder="Detalles de la conversación, acuerdos, próximos pasos..."
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
                  {(createActivity.isPending || updateClientContact.isPending) ? "Guardando..." : "Guardar y Marcar Contactado"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
