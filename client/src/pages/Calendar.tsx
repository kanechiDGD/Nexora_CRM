import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Plus, AlertCircle, Clock, Phone, User, Edit, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { NewEventDialog } from "@/components/NewEventDialog";
import { ClientContactDialog } from "@/components/ClientContactDialog";
import { EventDetailsDialog } from "@/components/EventDetailsDialog";
import { EditEventDialog } from "@/components/EditEventDialog";
import { DeleteEventDialog } from "@/components/DeleteEventDialog";
import { useTranslation } from "react-i18next";
import { usePermissions } from "@/hooks/usePermissions";

export default function Calendar() {
  const { t, i18n } = useTranslation();
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventDetailsOpen, setEventDetailsOpen] = useState(false);
  const { canEdit, canDelete } = usePermissions();

  const { data: clients } = trpc.clients.list.useQuery();
  const { data: events } = trpc.events.list.useQuery();

  // Calcular clientes que necesitan contacto basado en nextContactDate
  const getClientsNeedingContact = () => {
    if (!clients) return [];
    
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalizar a medianoche
    
    return clients
      .filter((client: any) => {
        if (!client.nextContactDate) return false;
        const nextContact = new Date(client.nextContactDate);
        nextContact.setHours(0, 0, 0, 0);
        
        // Mostrar alertas 2 días antes del contacto programado
        const daysUntil = Math.floor((nextContact.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntil <= 2;
      })
      .map((client: any) => {
        const nextContact = new Date(client.nextContactDate);
        nextContact.setHours(0, 0, 0, 0);
        const daysUntil = Math.floor((nextContact.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        let priority: 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE';
        if (daysUntil < 0) priority = 'URGENTE';
        else if (daysUntil === 0) priority = 'ALTA';
        else if (daysUntil === 1) priority = 'MEDIA';
        else priority = 'BAJA';
        
        return {
          ...client,
          daysUntil,
          priority,
        };
      })
      .sort((a: any, b: any) => a.daysUntil - b.daysUntil);
  };

  const clientsNeedingContact = getClientsNeedingContact();

  const getEventBadge = (type: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline", label: string, color: string }> = {
      'ESTIMADO': { variant: 'default', label: t('calendarPage.eventTypes.estimate'), color: 'bg-blue-500/10 text-blue-500' },
      'REUNION': { variant: 'secondary', label: t('calendarPage.eventTypes.meeting'), color: 'bg-green-500/10 text-green-500' },
      'AJUSTACION': { variant: 'outline', label: t('calendarPage.eventTypes.adjustment'), color: 'bg-yellow-500/10 text-yellow-500' },
      'INTERNO': { variant: 'outline', label: t('calendarPage.eventTypes.internal'), color: 'bg-purple-500/10 text-purple-500' },
    };
    const config = variants[type] || { variant: 'outline', label: type, color: 'bg-gray-500/10 text-gray-500' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysUntil = (date: Date) => {
    const now = new Date();
    const eventDate = new Date(date);
    const days = Math.floor((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return t('calendarPage.daysUntil.today');
    if (days === 1) return t('calendarPage.daysUntil.tomorrow');
    if (days < 0) return t('calendarPage.daysUntil.daysAgo', { days: Math.abs(days) });
    return t('calendarPage.daysUntil.inDays', { days });
  };

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { class: string; label: string }> = {
      'URGENTE': { class: 'bg-red-500/10 text-red-500 border-red-500/20', label: t('calendarPage.priority.overdue') },
      'ALTA': { class: 'bg-orange-500/10 text-orange-500 border-orange-500/20', label: t('calendarPage.priority.today') },
      'MEDIA': { class: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', label: t('calendarPage.priority.tomorrow') },
      'BAJA': { class: 'bg-green-500/10 text-green-500 border-green-500/20', label: t('calendarPage.priority.soon') },
    };
    const { class: className, label } = config[priority] || config['BAJA'];
    return <Badge className={className}>{label}</Badge>;
  };

  const handleContactClient = (client: any) => {
    setSelectedClient(client);
    setContactDialogOpen(true);
  };

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setEventDetailsOpen(true);
  };

  // Ordenar eventos por fecha
  const sortedEvents = events?.slice().sort((a: any, b: any) => {
    return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
  }) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('dashboard.calendar.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('dashboard.calendar.subtitle', 'Manage events and maintain regular contact with clients')}
            </p>
          </div>
          <NewEventDialog />
        </div>

        {/* Alert Card - Clientes que necesitan contacto */}
        {clientsNeedingContact.length > 0 && (
          <Card className="border-red-500/50 bg-red-500/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <CardTitle className="text-red-500">
                  {clientsNeedingContact.length === 1
                    ? t('calendarPage.alerts.titleSingular')
                    : t('calendarPage.alerts.titlePlural', { count: clientsNeedingContact.length })}
                </CardTitle>
              </div>
              <CardDescription>
                {t('calendarPage.alerts.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {clientsNeedingContact.map((client: any) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-4 bg-background border border-red-500/20 rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleContactClient(client)}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-red-500/10 rounded-lg">
                      <User className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <p className="font-medium">{client.firstName} {client.lastName}</p>
                      <p className="text-sm text-muted-foreground">
                        {client.phone || client.email || t('calendarPage.alerts.noContact')}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3" />
                        <span className="text-xs font-medium">
                          {client.daysUntil < 0
                            ? t('calendarPage.alerts.daysLate', { count: Math.abs(client.daysUntil) })
                            : client.daysUntil === 0
                            ? t('calendarPage.alerts.contactToday')
                            : t('calendarPage.alerts.contactInDays', { count: client.daysUntil })
                          }
                        </span>
                        {getPriorityBadge(client.priority)}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    <Phone className="mr-2 h-4 w-4" />
                    {t('calendarPage.alerts.viewDetails')}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('calendarPage.stats.upcomingEvents')}</p>
                  <p className="text-2xl font-bold">{sortedEvents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('calendarPage.stats.pendingClients')}</p>
                  <p className="text-2xl font-bold">{clientsNeedingContact.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Clock className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('calendarPage.stats.eventsThisWeek')}</p>
                  <p className="text-2xl font-bold">
                    {sortedEvents.filter((e: any) => {
                      const days = Math.floor((new Date(e.eventDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      return days >= 0 && days <= 7;
                    }).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Events */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>{t('calendarPage.upcomingEvents.title')}</CardTitle>
            <CardDescription>
              {t('calendarPage.upcomingEvents.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sortedEvents.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t('dashboard.calendar.noEvents')}</p>
                <div className="mt-4">
                  <NewEventDialog />
                </div>
              </div>
            ) : (
              sortedEvents.map((event: any) => (
                <div
                  key={event.id}
                  className="flex items-start gap-4 p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => handleEventClick(event)}
                >
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <CalendarIcon className="h-6 w-6 text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h3 className="font-medium text-lg">{event.title}</h3>
                        {event.clientId && (
                          <p className="text-sm text-muted-foreground">
                            {t('calendarPage.upcomingEvents.clientLabel')} {clients?.find((c: any) => c.id === event.clientId)?.firstName} {clients?.find((c: any) => c.id === event.clientId)?.lastName}
                          </p>
                        )}
                      </div>
                      {getEventBadge(event.eventType)}
                    </div>

                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        <span>{formatDate(event.eventDate)}</span>
                        <Badge variant="outline" className="ml-2">
                          {getDaysUntil(event.eventDate)}
                        </Badge>
                      </div>
                      {event.address && (
                        <div className="flex items-center gap-2">
                          <span>📍</span>
                          <span>{event.address}</span>
                        </div>
                      )}
                      {event.notes && (
                        <p className="text-sm mt-2">{event.notes}</p>
                      )}
                    </div>

                                        {canEdit || canDelete ? (
                      <div
                        className="flex items-center gap-2 mt-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {canEdit && <EditEventDialog event={event} />}
                        {canDelete && <DeleteEventDialog event={event} />}
                      </div>
                    ) : (
                      <div className="mt-3">
                        <p className="text-xs text-muted-foreground">{t('calendarPage.upcomingEvents.editHint')}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card className="border-border bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">{t('dashboard.calendar.policy.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              • <strong>{t('dashboard.calendar.policy.frequency')}</strong> {t('dashboard.calendar.policy.frequencyDesc')}
            </p>
            <p>
              • <strong>{t('dashboard.calendar.policy.alerts')}</strong> {t('dashboard.calendar.policy.alertsDesc')}
            </p>
            <p>
              • <strong>{t('dashboard.calendar.policy.mandatory')}</strong> {t('dashboard.calendar.policy.mandatoryDesc')}
            </p>
            <p>
              • <strong>{t('dashboard.calendar.policy.priority')}</strong> {t('dashboard.calendar.policy.priorityDesc')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs - EditEventDialog y DeleteEventDialog manejan su propio estado open */}

      {selectedClient && (
        <ClientContactDialog
          clientId={selectedClient.id}
          clientName={`${selectedClient.firstName} ${selectedClient.lastName}`}
          open={contactDialogOpen}
          onOpenChange={setContactDialogOpen}
        />
      )}

      {selectedEvent && (
        <EventDetailsDialog
          event={selectedEvent}
          open={eventDetailsOpen}
          onOpenChange={setEventDetailsOpen}
        />
      )}
    </DashboardLayout>
  );
}

