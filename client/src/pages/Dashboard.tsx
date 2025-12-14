import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, FileX, AlertCircle, Building2, Calendar, Phone, Mail, Bell, Plus, CheckSquare, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { NewEventDialog } from "@/components/NewEventDialog";
import { ClientContactDialog } from "@/components/ClientContactDialog";
import { EventDetailsDialog } from "@/components/EventDetailsDialog";
import { ClaimStatusCards } from "@/components/ClaimStatusCards";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, differenceInDays } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

const locales = {
  'es': es,
  'en': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const [, setLocation] = useLocation();
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventDetailsOpen, setEventDetailsOpen] = useState(false);

  // Obtener datos de KPIs
  const { data: totalClients, isLoading: loadingTotal } = trpc.dashboard.totalClients.useQuery();
  const { data: lateContact, isLoading: loadingLate } = trpc.dashboard.lateContact.useQuery();
  const { data: notSupplemented, isLoading: loadingSupp } = trpc.dashboard.notSupplemented.useQuery();
  const { data: pendingSubmission, isLoading: loadingPending } = trpc.dashboard.pendingSubmission.useQuery();
  const { data: readyForConstruction, isLoading: loadingReady } = trpc.dashboard.readyForConstruction.useQuery();
  const { data: upcomingContacts, isLoading: loadingUpcoming } = trpc.dashboard.upcomingContacts.useQuery();

  // Obtener clientes que necesitan contacto (últimos 7 días)
  const { data: clientsNeedingContact } = trpc.clients.list.useQuery();

  // Obtener eventos del calendario
  const { data: events } = trpc.events.list.useQuery();

  // Obtener tareas pendientes
  const { data: tasks } = trpc.tasks.list.useQuery();

  // Filtrar solo tareas pendientes y en progreso
  const pendingTasks = tasks?.filter((task: any) =>
    task.status === 'PENDIENTE' || task.status === 'EN_PROGRESO'
  ).slice(0, 5) || []; // Mostrar solo las primeras 5

  // Calcular alertas de contacto con sistema progresivo (aparecen 2 días antes)
  const contactAlerts = clientsNeedingContact?.filter((client: any) => {
    // Si no tiene nextContactDate, usar lastContactDate + 7 días como fallback
    const nextContact = client.nextContactDate
      ? new Date(client.nextContactDate)
      : client.lastContactDate
        ? new Date(new Date(client.lastContactDate).getTime() + 7 * 24 * 60 * 60 * 1000)
        : new Date(); // Si no hay ninguna fecha, mostrar hoy

    const daysUntilContact = differenceInDays(nextContact, new Date());

    // Mostrar alertas desde 2 días antes hasta después de la fecha
    return daysUntilContact <= 2;
  }).map((client: any) => {
    const nextContact = client.nextContactDate
      ? new Date(client.nextContactDate)
      : client.lastContactDate
        ? new Date(new Date(client.lastContactDate).getTime() + 7 * 24 * 60 * 60 * 1000)
        : new Date();

    const daysUntilContact = differenceInDays(nextContact, new Date());

    // Determinar prioridad según días restantes
    let priority = 'low';
    if (daysUntilContact < 0) priority = 'urgent'; // Pasado
    else if (daysUntilContact === 0) priority = 'high'; // Hoy
    else if (daysUntilContact === 1) priority = 'medium'; // Mañana
    else priority = 'low'; // 2 días antes

    return {
      ...client,
      daysUntilContact,
      priority
    };
  }).sort((a: any, b: any) => a.daysUntilContact - b.daysUntilContact) || [];

  // Convertir eventos de la base de datos al formato del calendario
  const calendarEvents = events?.map((event: any) => ({
    title: event.title,
    start: new Date(event.eventDate),
    end: event.endTime
      ? new Date(event.eventDate + 'T' + event.endTime)
      : new Date(new Date(event.eventDate).getTime() + 60 * 60 * 1000), // +1 hora por defecto
    resource: event,
  })) || [];

  const handleCardClick = (filter: string) => {
    setLocation(`/clients?filter=${filter}`);
  };

  const handleEventClick = (event: any) => {
    // resource contains the raw event object
    setSelectedEvent(event.resource);
    setEventDetailsOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('dashboard.subtitle')}
          </p>
        </div>

        {/* Sección de Estados de Reclamo */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">{t('dashboard.claimStatus.title')}</h2>
          <p className="text-muted-foreground mb-6">
            {t('dashboard.claimStatus.subtitle')}
          </p>
          <ClaimStatusCards />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Total de Clientes */}
          <Card
            className="cursor-pointer hover:bg-accent/50 transition-colors border-border"
            onClick={() => handleCardClick('all')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.kpis.totalClients.title')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {loadingTotal ? "..." : totalClients?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('dashboard.kpis.totalClients.subtitle')}
              </p>
            </CardContent>
          </Card>

          {/* Contacto Atrasado */}
          <Card
            className="cursor-pointer hover:bg-accent/50 transition-colors border-border border-l-4 border-l-destructive"
            onClick={() => handleCardClick('late-contact')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.kpis.lateContact.title')}</CardTitle>
              <Clock className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {loadingLate ? "..." : lateContact?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('dashboard.kpis.lateContact.subtitle')}
              </p>
            </CardContent>
          </Card>

          {/* No Suplementado */}
          <Card
            className="cursor-pointer hover:bg-accent/50 transition-colors border-border border-l-4 border-l-yellow-500"
            onClick={() => handleCardClick('not-supplemented')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.kpis.notSupplemented.title')}</CardTitle>
              <FileX className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {loadingSupp ? "..." : notSupplemented?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('dashboard.kpis.notSupplemented.subtitle')}
              </p>
            </CardContent>
          </Card>

          {/* Pendientes por Someter */}
          <Card
            className="cursor-pointer hover:bg-accent/50 transition-colors border-border border-l-4 border-l-orange-500"
            onClick={() => handleCardClick('pending-submission')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.kpis.pendingSubmission.title')}</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {loadingPending ? "..." : pendingSubmission?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('dashboard.kpis.pendingSubmission.subtitle')}
              </p>
            </CardContent>
          </Card>

          {/* Listas para Construir */}
          <Card
            className="cursor-pointer hover:bg-accent/50 transition-colors border-border border-l-4 border-l-green-500"
            onClick={() => handleCardClick('ready-construction')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.kpis.readyConstruction.title')}</CardTitle>
              <Building2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {loadingReady ? "..." : readyForConstruction?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('dashboard.kpis.readyConstruction.subtitle')}
              </p>
            </CardContent>
          </Card>

          {/* Próximos Contactos */}
          <Card
            className="cursor-pointer hover:bg-accent/50 transition-colors border-border border-l-4 border-l-blue-500"
            onClick={() => handleCardClick('upcoming-contacts')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.kpis.upcomingContacts.title')}</CardTitle>
              <Calendar className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {loadingUpcoming ? "..." : upcomingContacts?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('dashboard.kpis.upcomingContacts.subtitle')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tareas Pendientes */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-primary" />
                  {t('dashboard.tasks.title')}
                </CardTitle>
                <CardDescription>
                  {t('dashboard.tasks.subtitle')}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation('/tasks')}
              >
                {t('dashboard.tasks.viewAll')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {pendingTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t('dashboard.tasks.noTasks')}
              </p>
            ) : (
              <div className="space-y-4">
                {pendingTasks.map((task: any) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => setLocation('/tasks')}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{task.title}</h4>
                        <Badge variant={task.status === 'EN_PROGRESO' ? 'default' : 'secondary'}>
                          {task.status === 'PENDIENTE' ? t('dashboard.tasks.pending') : t('dashboard.tasks.inProgress')}
                        </Badge>
                        {task.priority && (
                          <Badge
                            variant={task.priority === 'ALTA' ? 'destructive' : task.priority === 'MEDIA' ? 'default' : 'outline'}
                            className="text-xs"
                          >
                            {task.priority === 'ALTA' ? t('dashboard.tasks.priority.high') : task.priority === 'MEDIA' ? t('dashboard.tasks.priority.medium') : t('dashboard.tasks.priority.low')}
                          </Badge>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-6 ml-4">
                      {task.dueDate && (
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">{t('dashboard.tasks.dueDate')}</div>
                          <div className="text-sm font-medium">
                            {new Date(task.dueDate).toLocaleDateString(i18n.language, {
                              day: '2-digit',
                              month: 'short'
                            })}
                          </div>
                        </div>
                      )}
                      {task.assignedTo && (
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4 text-muted-foreground" />
                          <div className="text-sm">{task.assignedToName || `Usuario #${task.assignedTo}`}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendario y Alertas - MOVIDO AL FINAL */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calendario Visual */}
          <div className="lg:col-span-2">
            <Card className="border-border shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    {t('dashboard.calendar.title')}
                  </CardTitle>
                  <NewEventDialog />
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg overflow-hidden border border-border" style={{ height: '450px' }}>
                  <BigCalendar
                    localizer={localizer}
                    events={calendarEvents}
                    startAccessor="start"
                    endAccessor="end"
                    culture={i18n.language}
                    onSelectEvent={handleEventClick}
                    messages={{
                      next: t('dashboard.calendar.next'),
                      previous: t('dashboard.calendar.previous'),
                      today: t('dashboard.calendar.today'),
                      month: t('dashboard.calendar.month'),
                      week: t('dashboard.calendar.week'),
                      day: t('dashboard.calendar.day'),
                      agenda: t('dashboard.calendar.agenda'),
                      date: t('dashboard.calendar.date'),
                      time: t('dashboard.calendar.time'),
                      event: t('dashboard.calendar.event'),
                      noEventsInRange: t('dashboard.calendar.noEvents'),
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Panel de Alertas de Contacto */}
          <div>
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  {t('dashboard.alerts.title')}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t('dashboard.alerts.subtitle')}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[350px] overflow-y-auto">
                  {contactAlerts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {t('dashboard.alerts.noAlerts')}
                    </p>
                  ) : (
                    contactAlerts.map((alert: any) => (
                      <div
                        key={alert.id}
                        className="p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedClient({ id: alert.id, name: `${alert.firstName} ${alert.lastName}` })}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-medium text-sm">
                            {alert.firstName} {alert.lastName}
                          </div>
                          <Badge
                            variant={
                              alert.priority === 'urgent' ? 'destructive' :
                                alert.priority === 'high' ? 'destructive' :
                                  alert.priority === 'medium' ? 'default' :
                                    'secondary'
                            }
                            className={
                              alert.priority === 'urgent' ? 'text-xs bg-red-600' :
                                alert.priority === 'high' ? 'text-xs bg-orange-500' :
                                  alert.priority === 'medium' ? 'text-xs bg-yellow-500' :
                                    'text-xs bg-green-500'
                            }
                          >
                            {alert.daysUntilContact < 0 ? t('dashboard.alerts.overdue') :
                              alert.daysUntilContact === 0 ? t('dashboard.alerts.today') :
                                alert.daysUntilContact === 1 ? t('dashboard.alerts.tomorrow') :
                                  `${alert.daysUntilContact}${t('dashboard.alerts.days')}`}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          {alert.phone && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {alert.phone}
                            </div>
                          )}
                          {alert.email && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {alert.email}
                            </div>
                          )}
                        </div>
                        <div className="mt-2 text-xs font-medium">
                          {alert.daysUntilContact < 0 ? (
                            <span className="text-red-600 font-bold">{t('dashboard.alerts.overdueMessage')}</span>
                          ) : alert.daysUntilContact === 0 ? (
                            <span className="text-orange-500 font-bold">{t('dashboard.alerts.todayMessage')}</span>
                          ) : alert.daysUntilContact === 1 ? (
                            <span className="text-yellow-600">{t('dashboard.alerts.oneDayMessage')}</span>
                          ) : (
                            <span className="text-green-600">{t('dashboard.alerts.daysMessage', { days: alert.daysUntilContact })}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Diálogo de Detalles de Contacto */}
      {selectedClient && (
        <ClientContactDialog
          open={!!selectedClient}
          onOpenChange={(open) => !open && setSelectedClient(null)}
          clientId={selectedClient.id}
          clientName={selectedClient.name}
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
