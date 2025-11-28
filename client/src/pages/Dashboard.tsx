import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, FileX, AlertCircle, Building2, Calendar, Phone, Mail, Bell, Plus, CheckSquare, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { NewEventDialog } from "@/components/NewEventDialog";
import { ClientContactDialog } from "@/components/ClientContactDialog";
import { ClaimStatusCards } from "@/components/ClaimStatusCards";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Badge } from "@/components/ui/badge";

const locales = {
  'es': es,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string } | null>(null);

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

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Vista general de métricas y KPIs del CRM
          </p>
        </div>

        {/* Calendario y Alertas */}
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          {/* Calendario Visual */}
          <div className="lg:col-span-2">
            <Card className="border-border shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Calendario de Eventos
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
                    culture="es"
                    messages={{
                      next: 'Siguiente',
                      previous: 'Anterior',
                      today: 'Hoy',
                      month: 'Mes',
                      week: 'Semana',
                      day: 'Día',
                      agenda: 'Agenda',
                      date: 'Fecha',
                      time: 'Hora',
                      event: 'Evento',
                      noEventsInRange: 'No hay eventos en este rango',
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
                  Alertas de Contacto
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Clientes que necesitan seguimiento
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[350px] overflow-y-auto">
                  {contactAlerts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No hay clientes pendientes de contacto
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
                            {alert.daysUntilContact < 0 ? '¡Atrasado!' : 
                             alert.daysUntilContact === 0 ? '¡Hoy!' : 
                             alert.daysUntilContact === 1 ? 'Mañana' :
                             `${alert.daysUntilContact}d`}
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
                            <span className="text-red-600 font-bold">¡Atrasado! Contactar urgente</span>
                          ) : alert.daysUntilContact === 0 ? (
                            <span className="text-orange-500 font-bold">¡Contactar hoy!</span>
                          ) : alert.daysUntilContact === 1 ? (
                            <span className="text-yellow-600">Falta 1 día para contactar</span>
                          ) : (
                            <span className="text-green-600">Faltan {alert.daysUntilContact} días para contactar</span>
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

        {/* Sección de Estados de Reclamo */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Clientes por Estado de Reclamo</h2>
          <p className="text-muted-foreground mb-6">
            Conteo de clientes agrupados por estado (predeterminados y personalizados)
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
              <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {loadingTotal ? "..." : totalClients?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Todos los clientes en el sistema
              </p>
            </CardContent>
          </Card>

          {/* Contacto Atrasado */}
          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors border-border border-l-4 border-l-destructive"
            onClick={() => handleCardClick('late-contact')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contacto Atrasado</CardTitle>
              <Clock className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {loadingLate ? "..." : lateContact?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Más de 7 días sin contacto
              </p>
            </CardContent>
          </Card>

          {/* No Suplementado */}
          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors border-border border-l-4 border-l-yellow-500"
            onClick={() => handleCardClick('not-supplemented')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">No Suplementado</CardTitle>
              <FileX className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {loadingSupp ? "..." : notSupplemented?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Clientes sin suplemento
              </p>
            </CardContent>
          </Card>

          {/* Pendientes por Someter */}
          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors border-border border-l-4 border-l-orange-500"
            onClick={() => handleCardClick('pending-submission')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes por Someter</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {loadingPending ? "..." : pendingSubmission?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Reclamos no sometidos
              </p>
            </CardContent>
          </Card>

          {/* Listas para Construir */}
          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors border-border border-l-4 border-l-green-500"
            onClick={() => handleCardClick('ready-construction')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Listas para Construir</CardTitle>
              <Building2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {loadingReady ? "..." : readyForConstruction?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Aprobadas con primer cheque
              </p>
            </CardContent>
          </Card>

          {/* Próximos Contactos */}
          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors border-border border-l-4 border-l-blue-500"
            onClick={() => handleCardClick('upcoming-contacts')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Próximos Contactos</CardTitle>
              <Calendar className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {loadingUpcoming ? "..." : upcomingContacts?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Próximos 7 días
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
                  Tareas Pendientes
                </CardTitle>
                <CardDescription>
                  Tareas activas con fechas límite y asignaciones
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setLocation('/tasks')}
              >
                Ver Todas
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {pendingTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay tareas pendientes
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
                          {task.status === 'PENDIENTE' ? 'Pendiente' : 'En Progreso'}
                        </Badge>
                        {task.priority && (
                          <Badge 
                            variant={task.priority === 'ALTA' ? 'destructive' : task.priority === 'MEDIA' ? 'default' : 'outline'}
                            className="text-xs"
                          >
                            {task.priority}
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
                          <div className="text-xs text-muted-foreground">Fecha Límite</div>
                          <div className="text-sm font-medium">
                            {new Date(task.dueDate).toLocaleDateString('es-ES', { 
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
    </DashboardLayout>
  );
}
