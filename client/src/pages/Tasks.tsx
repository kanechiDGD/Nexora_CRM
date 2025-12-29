import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckSquare, Search, Clock, User, Calendar, FileText, Paperclip } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { NewTaskDialog } from "@/components/NewTaskDialog";
import { EditTaskDialog } from "@/components/EditTaskDialog";
import { DeleteTaskDialog } from "@/components/DeleteTaskDialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Tasks() {
  const { t, i18n } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUser, setFilterUser] = useState<string>("todos");
  const [filterStatus, setFilterStatus] = useState<string>("todos");

  // Obtener tareas de la base de datos
  const { data: tasks, isLoading } = trpc.tasks.list.useQuery();
  const utils = trpc.useUtils();

  // Mutación para cambiar estado de tarea
  const updateTaskStatus = trpc.tasks.update.useMutation({
    onSuccess: () => {
      toast.success(t('tasksPage.statusUpdated'));
      utils.tasks.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleToggleComplete = (task: any) => {
    const newStatus = task.status === "COMPLETADA" ? "PENDIENTE" : "COMPLETADA";
    updateTaskStatus.mutate({
      id: task.id,
      status: newStatus as any,
      completedAt: newStatus === "COMPLETADA" ? new Date() : null,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      'PENDIENTE': { variant: 'secondary', label: t('tasksPage.status.pending') },
      'EN_PROGRESO': { variant: 'default', label: t('tasksPage.status.inProgress') },
      'COMPLETADA': { variant: 'outline', label: t('tasksPage.status.completed') },
      'CANCELADA': { variant: 'destructive', label: t('tasksPage.status.canceled') },
    };
    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      'ALTA': { variant: 'destructive', label: t('tasksPage.priority.high') },
      'MEDIA': { variant: 'default', label: t('tasksPage.priority.medium') },
      'BAJA': { variant: 'secondary', label: t('tasksPage.priority.low') },
    };
    const config = variants[priority] || { variant: 'outline', label: priority };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getCategoryBadge = (category: string) => {
    const labels: Record<string, string> = {
      'DOCUMENTACION': t('tasksPage.categories.documentation'),
      'SEGUIMIENTO': t('taskDialogs.edit.categories.followUp'),
      'ESTIMADO': t('taskDialogs.edit.categories.estimate'),
      'REUNION': t('tasksPage.categories.meeting'),
      'REVISION': t('tasksPage.categories.review'),
      'OTRO': t('taskDialogs.edit.categories.other'),
    };
    return <Badge variant="outline">{labels[category] || category}</Badge>;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return t('tasksPage.noDate');
    const d = new Date(date);
    return d.toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysUntil = (date: Date | string | null) => {
    if (!date) return '';
    const now = new Date();
    const target = new Date(date);
    const days = Math.floor((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return t('tasksPage.due.overdue');
    if (days === 0) return t('tasksPage.due.today');
    if (days === 1) return t('tasksPage.due.tomorrow');
    return t('tasksPage.due.inDays', { days });
  };

  const filteredTasks = tasks?.filter((task: any) => {
    // Filtro por búsqueda de texto
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch = (
        task.title?.toLowerCase().includes(search) ||
        task.description?.toLowerCase().includes(search) ||
        task.category?.toLowerCase().includes(search)
      );
      if (!matchesSearch) return false;
    }
    
    // Filtro por usuario asignado
    if (filterUser !== "todos") {
      if (filterUser === "sin_asignar" && task.assignedTo !== null) return false;
      if (filterUser !== "sin_asignar" && task.assignedTo?.toString() !== filterUser) return false;
    }
    
    // Filtro por estado
    if (filterStatus !== "todos" && task.status !== filterStatus) return false;
    
    return true;
  }) || [];

  // Calcular estadísticas
  const stats = {
    total: tasks?.length || 0,
    pending: tasks?.filter((t: any) => t.status === 'PENDIENTE').length || 0,
    inProgress: tasks?.filter((t: any) => t.status === 'EN_PROGRESO').length || 0,
    completed: tasks?.filter((t: any) => t.status === 'COMPLETADA').length || 0,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <CheckSquare className="h-8 w-8" />
              {t('tasksPage.title')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t('tasksPage.subtitle')}
            </p>
          </div>
          <NewTaskDialog />
        </div>

        {/* Estadísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('tasksPage.stats.total')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('tasksPage.stats.pending')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('tasksPage.stats.inProgress')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('tasksPage.stats.completed')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Búsqueda y Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>{t('tasksPage.filters.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('tasksPage.filters.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div>
                <Select value={filterUser} onValueChange={setFilterUser}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('tasksPage.filters.userPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">{t('tasksPage.filters.allUsers')}</SelectItem>
                    <SelectItem value="sin_asignar">{t('tasksPage.filters.unassigned')}</SelectItem>
                    {/* TODO: Listar usuarios del equipo */}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('tasksPage.filters.statusPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">{t('tasksPage.filters.allStatuses')}</SelectItem>
                    <SelectItem value="PENDIENTE">{t('tasksPage.status.pending')}</SelectItem>
                    <SelectItem value="EN_PROGRESO">{t('tasksPage.status.inProgress')}</SelectItem>
                    <SelectItem value="COMPLETADA">{t('tasksPage.status.completed')}</SelectItem>
                    <SelectItem value="CANCELADA">{t('tasksPage.status.canceled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Tareas */}
        <div className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">{t('tasksPage.loading')}</p>
              </CardContent>
            </Card>
          ) : filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  {searchTerm ? t('tasksPage.empty.search') : t('tasksPage.empty.default')}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredTasks.map((task: any) => (
              <Card key={task.id} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">{task.title}</CardTitle>
                        {getStatusBadge(task.status)}
                        {getPriorityBadge(task.priority)}
                        {getCategoryBadge(task.category)}
                      </div>
                      <CardDescription>{task.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={task.status === "COMPLETADA" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleToggleComplete(task)}
                      >
                        {task.status === "COMPLETADA" ? t('tasksPage.actions.completed') : t('tasksPage.actions.markComplete')}
                      </Button>
                      <EditTaskDialog task={task} />
                      <DeleteTaskDialog task={task} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {formatDate(task.dueDate)}
                        {task.dueDate && (
                          <span className="ml-2 text-xs">
                            ({getDaysUntil(task.dueDate)})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{t('tasksPage.assignedTo')}: {task.assignedTo || t('tasksPage.filters.unassigned')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{t('tasksPage.createdAt')}: {formatDate(task.createdAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
