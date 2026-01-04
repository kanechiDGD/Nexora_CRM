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
import { Calendar, Clock, MapPin, AlignLeft, User, Phone, Mail, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { usePermissions } from "@/hooks/usePermissions";
import { EditEventDialog } from "@/components/EditEventDialog";
import { DeleteEventDialog } from "@/components/DeleteEventDialog";

interface EventDetailsDialogProps {
  event: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (event: any) => void;
}

export function EventDetailsDialog({ event, open, onOpenChange, onEdit }: EventDetailsDialogProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'es' ? es : enUS;
  const { canEdit, isAdmin } = usePermissions();
  const { data: attendees = [] } = trpc.events.getAttendees.useQuery(
    { eventId: event?.id },
    { enabled: open && !!event?.id }
  );

  if (!event) return null;

  const getEventBadge = (type: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
      'ESTIMADO': { variant: 'default', label: t('dashboard.calendar.newEvent.types.ESTIMATE') },
      'REUNION': { variant: 'secondary', label: t('dashboard.calendar.newEvent.types.MEETING') },
      'AJUSTACION': { variant: 'outline', label: t('dashboard.calendar.newEvent.types.ADJUSTMENT') },
      'INTERNO': { variant: 'outline', label: t('dashboard.calendar.newEvent.types.INTERNAL') },
      'MEETING': { variant: 'secondary', label: t('dashboard.calendar.newEvent.types.MEETING') },
      'ADJUSTMENT': { variant: 'outline', label: t('dashboard.calendar.newEvent.types.ADJUSTMENT') },
      'ESTIMATE': { variant: 'default', label: t('dashboard.calendar.newEvent.types.ESTIMATE') },
      'INSPECTION': { variant: 'outline', label: t('dashboard.calendar.newEvent.types.INSPECTION') },
      'APPOINTMENT': { variant: 'secondary', label: t('dashboard.calendar.newEvent.types.APPOINTMENT') },
      'DEADLINE': { variant: 'destructive', label: t('dashboard.calendar.newEvent.types.DEADLINE') },
      'OTHER': { variant: 'outline', label: t('dashboard.calendar.newEvent.types.OTHER') },
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
            {t('dashboard.calendar.eventDetails')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">{t('dashboard.calendar.date')}</p>
              <p className="text-sm text-muted-foreground">{formattedDate}</p>
            </div>
          </div>

          {formattedTime && (
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{t('dashboard.calendar.time')}</p>
                <p className="text-sm text-muted-foreground">{formattedTime}</p>
              </div>
            </div>
          )}

          {event.address && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{t('dashboard.calendar.location')}</p>
                <p className="text-sm text-muted-foreground">{event.address}</p>
              </div>
            </div>
          )}

          {event.description && (
            <div className="flex items-start gap-3">
              <AlignLeft className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{t('dashboard.calendar.description')}</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
              </div>
            </div>
          )}

          {/* Client Info if attached */}
          {event.clientId && (
             <ClientInfoSection clientId={event.clientId} />
          )}

          {attendees.length > 0 && (
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{t('dashboard.calendar.attendees')}</p>
                <div className="text-sm text-muted-foreground">
                  {attendees.map((attendee: any) => attendee.userName || attendee.userEmail || attendee.memberId).join(", ")}
                </div>
              </div>
            </div>
          )}

          {event.notes && (
            <div className="bg-muted p-3 rounded-md text-sm">
              <span className="font-semibold">{t('dashboard.calendar.notes')}:</span> {event.notes}
            </div>
          )}
        </div>

        <DialogFooter>
          {onEdit ? (
            <Button variant="outline" onClick={() => { onOpenChange(false); onEdit(event); }}>
              {t('common.edit')}
            </Button>
          ) : (
            <>
              {canEdit && <EditEventDialog event={event} />}
              {isAdmin && <DeleteEventDialog event={event} />}
            </>
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
      <h4 className="text-sm font-medium mb-2">{t('dashboard.calendar.clientInfo')}</h4>
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
