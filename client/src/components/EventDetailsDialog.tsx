import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, AlignLeft, User, Phone, Mail } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";

interface EventDetailsDialogProps {
  event: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (event: any) => void;
}

export function EventDetailsDialog({ event, open, onOpenChange, onEdit }: EventDetailsDialogProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'es' ? es : enUS;

  if (!event) return null;

  const getEventBadge = (type: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline", label: string }> = {
      'ESTIMADO': { variant: 'default', label: 'Estimado' },
      'REUNION': { variant: 'secondary', label: 'Reunión' },
      'AJUSTACION': { variant: 'outline', label: 'Ajustación' },
      'INTERNO': { variant: 'outline', label: 'Evento Interno' },
      'MEETING': { variant: 'secondary', label: 'Meeting' },
      'ADJUSTMENT': { variant: 'outline', label: 'Adjustment' },
      'ESTIMATE': { variant: 'default', label: 'Estimate' },
      'INSPECTION': { variant: 'outline', label: 'Inspection' },
      'APPOINTMENT': { variant: 'secondary', label: 'Appointment' },
      'DEADLINE': { variant: 'destructive', label: 'Deadline' },
      'OTHER': { variant: 'outline', label: 'Other' },
    };
    const config = variants[type] || { variant: 'outline', label: type };
    // Try to translate label if possible, else use config label
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formattedDate = event.eventDate ? format(new Date(event.eventDate), "PPPP", { locale }) : '';
  const formattedTime = event.eventTime ? format(new Date(`2000-01-01T${event.eventTime}`), "p", { locale }) : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-between mr-8">
            <DialogTitle className="text-xl">{event.title}</DialogTitle>
            {getEventBadge(event.eventType)}
          </div>
          <DialogDescription>
            {t('calendar.eventDetails')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">{t('calendar.date')}</p>
              <p className="text-sm text-muted-foreground">{formattedDate}</p>
            </div>
          </div>

          {formattedTime && (
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{t('calendar.time')}</p>
                <p className="text-sm text-muted-foreground">{formattedTime}</p>
              </div>
            </div>
          )}

          {event.address && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{t('calendar.location')}</p>
                <p className="text-sm text-muted-foreground">{event.address}</p>
              </div>
            </div>
          )}

          {event.description && (
            <div className="flex items-start gap-3">
              <AlignLeft className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{t('calendar.description')}</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
              </div>
            </div>
          )}

          {/* Client Info if attached */}
          {event.clientId && (
             <ClientInfoSection clientId={event.clientId} />
          )}

          {event.notes && (
            <div className="bg-muted p-3 rounded-md text-sm">
              <span className="font-semibold">{t('calendar.notes')}:</span> {event.notes}
            </div>
          )}
        </div>

        <DialogFooter>
          {onEdit && (
            <Button variant="outline" onClick={() => { onOpenChange(false); onEdit(event); }}>
              {t('common.edit')}
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ClientInfoSection({ clientId }: { clientId: string }) {
  const { data: client } = trpc.clients.getById.useQuery(
    { id: clientId },
    { enabled: !!clientId }
  );
  const { t } = useTranslation();

  if (!client) return null;

  return (
    <div className="border-t pt-4 mt-2">
      <h4 className="text-sm font-medium mb-2">{t('calendar.clientInfo')}</h4>
      <div className="grid grid-cols-1 gap-2 text-sm">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span>{client.firstName} {client.lastName}</span>
        </div>
        {client.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <a href={`tel:${client.phone}`} className="hover:underline text-blue-500">{client.phone}</a>
          </div>
        )}
        {client.email && (
           <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <a href={`mailto:${client.email}`} className="hover:underline text-blue-500">{client.email}</a>
          </div>
        )}
      </div>
    </div>
  );
}
