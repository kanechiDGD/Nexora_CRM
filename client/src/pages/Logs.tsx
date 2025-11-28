import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Phone, Mail, FileText, Calendar, User } from "lucide-react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { NewActivityDialog } from "@/components/NewActivityDialog";

export default function Logs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: logs, isLoading } = trpc.activityLogs.getRecent.useQuery({ limit: 5 });

  const getActivityIcon = (type: string) => {
    const icons: Record<string, any> = {
      'CALL': Phone,
      'EMAIL': Mail,
      'MEETING': Calendar,
      'NOTE': FileText,
      'UPDATE': FileText,
    };
    const Icon = icons[type] || FileText;
    return <Icon className="h-4 w-4" />;
  };

  const getActivityBadge = (type: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline", label: string }> = {
      'CALL': { variant: 'default', label: 'Llamada' },
      'EMAIL': { variant: 'secondary', label: 'Email' },
      'MEETING': { variant: 'default', label: 'Reunión' },
      'NOTE': { variant: 'outline', label: 'Nota' },
      'UPDATE': { variant: 'secondary', label: 'Actualización' },
    };
    const config = variants[type] || { variant: 'outline', label: type };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeFilteredLogs = () => {
    if (!logs) return [];
    
    const now = new Date();
    const filtered = logs.filter((log: any) => {
      const logDate = new Date(log.performedAt);
      const daysDiff = Math.floor((now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (timeFilter) {
        case 'today':
          return daysDiff === 0;
        case 'this-week':
          return daysDiff <= 7;
        case 'last-week':
          return daysDiff > 7 && daysDiff <= 14;
        case 'this-month':
          return daysDiff <= 30;
        case 'last-month':
          return daysDiff > 30 && daysDiff <= 60;
        default:
          return true;
      }
    });

    if (typeFilter !== 'all') {
      return filtered.filter((log: any) => log.activityType === typeFilter);
    }

    if (searchTerm) {
      return filtered.filter((log: any) => 
        log.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.performedBy?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const groupLogsByWeek = () => {
    const filteredLogs = getTimeFilteredLogs();
    const grouped: Record<string, typeof logs> = {};

    filteredLogs.forEach((log: any) => {
      const logDate = new Date(log.performedAt);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));

      let weekLabel = '';
      if (daysDiff === 0) {
        weekLabel = 'Hoy';
      } else if (daysDiff === 1) {
        weekLabel = 'Ayer';
      } else if (daysDiff <= 7) {
        weekLabel = 'Esta Semana';
      } else if (daysDiff <= 14) {
        weekLabel = 'Semana Pasada';
      } else if (daysDiff <= 30) {
        weekLabel = 'Este Mes';
      } else {
        weekLabel = 'Más Antiguo';
      }

      if (!grouped[weekLabel]) {
        grouped[weekLabel] = [];
      }
      grouped[weekLabel]!.push(log);
    });

    return grouped;
  };

  const groupedLogs = groupLogsByWeek();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Logs de Actividad</h1>
            <p className="text-muted-foreground mt-1">
              Historial completo de interacciones con clientes
            </p>
          </div>
          <NewActivityDialog />
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Actividades</p>
                  <p className="text-2xl font-bold">{logs?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Phone className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Llamadas</p>
                  <p className="text-2xl font-bold">
                    {logs?.filter((l: any) => l.activityType === 'CALL').length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reuniones</p>
                  <p className="text-2xl font-bold">
                    {logs?.filter((l: any) => l.activityType === 'MEETING').length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Mail className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Emails</p>
                  <p className="text-2xl font-bold">
                    {logs?.filter((l: any) => l.activityType === 'EMAIL').length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por contenido o miembro del equipo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por fecha" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las fechas</SelectItem>
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="this-week">Esta Semana</SelectItem>
                  <SelectItem value="last-week">Semana Pasada</SelectItem>
                  <SelectItem value="this-month">Este Mes</SelectItem>
                  <SelectItem value="last-month">Mes Pasado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de actividad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="CALL">Llamadas</SelectItem>
                  <SelectItem value="EMAIL">Emails</SelectItem>
                  <SelectItem value="MEETING">Reuniones</SelectItem>
                  <SelectItem value="NOTE">Notas</SelectItem>
                  <SelectItem value="UPDATE">Actualizaciones</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        {isLoading ? (
          <Card className="border-border">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Cargando actividades...</p>
            </CardContent>
          </Card>
        ) : Object.keys(groupedLogs).length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay actividades registradas</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedLogs).map(([weekLabel, weekLogs]) => (
              <Card key={weekLabel} className="border-border">
                <CardHeader>
                  <CardTitle className="text-lg">{weekLabel}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {weekLogs?.map((log: any) => (
                    <div
                      key={log.id}
                      className="flex gap-4 p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-shrink-0 p-3 bg-primary/10 rounded-lg h-fit">
                        {getActivityIcon(log.activityType)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getActivityBadge(log.activityType)}
                            {log.subject && (
                              <span className="font-medium">{log.subject}</span>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatDate(log.performedAt)}
                          </span>
                        </div>

                        {log.description && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {log.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-sm">
                          {log.performedBy && (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                Realizado por: <span className="font-medium text-foreground">{log.performedBy}</span>
                              </span>
                            </div>
                          )}
                          {log.clientId && (
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">
                                Cliente ID: <span className="font-medium text-foreground">{log.clientId}</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
