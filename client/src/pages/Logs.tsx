import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t, i18n } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: logs, isLoading } = trpc.activityLogs.getRecent.useQuery({ limit: 5 });

  const getActivityIcon = (type: string) => {
    const icons: Record<string, any> = {
      LLAMADA: Phone,
      CORREO: Mail,
      VISITA: Calendar,
      NOTA: FileText,
      DOCUMENTO: FileText,
      CAMBIO_ESTADO: FileText,
    };
    const Icon = icons[type] || FileText;
    return <Icon className="h-4 w-4" />;
  };

  const getActivityBadge = (type: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline", label: string }> = {
      LLAMADA: { variant: 'default', label: t('logsPage.activityTypes.call') },
      CORREO: { variant: 'secondary', label: t('logsPage.activityTypes.email') },
      VISITA: { variant: 'default', label: t('logsPage.activityTypes.visit') },
      NOTA: { variant: 'outline', label: t('logsPage.activityTypes.note') },
      DOCUMENTO: { variant: 'secondary', label: t('logsPage.activityTypes.document') },
      CAMBIO_ESTADO: { variant: 'outline', label: t('logsPage.activityTypes.statusChange') },
    };
    const config = variants[type] || { variant: 'outline', label: type };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString(i18n.language.startsWith('es') ? 'es-ES' : 'en-US', {
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
      const term = searchTerm.toLowerCase();
      return filtered.filter((log: any) =>
        log.subject?.toLowerCase().includes(term) ||
        log.description?.toLowerCase().includes(term) ||
        log.performedByName?.toLowerCase().includes(term) ||
        log.performedByEmail?.toLowerCase().includes(term)
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
        weekLabel = t('logsPage.dateLabels.today');
      } else if (daysDiff === 1) {
        weekLabel = t('logsPage.dateLabels.yesterday');
      } else if (daysDiff <= 7) {
        weekLabel = t('logsPage.dateLabels.thisWeek');
      } else if (daysDiff <= 14) {
        weekLabel = t('logsPage.dateLabels.lastWeek');
      } else if (daysDiff <= 30) {
        weekLabel = t('logsPage.dateLabels.thisMonth');
      } else {
        weekLabel = t('logsPage.dateLabels.older');
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
            <h1 className="text-3xl font-bold text-foreground">{t('logsPage.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('logsPage.subtitle')}
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
                  <p className="text-sm text-muted-foreground">{t('logsPage.stats.totalActivities')}</p>
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
                  <p className="text-sm text-muted-foreground">{t('logsPage.activityTypes.callPlural')}</p>
                  <p className="text-2xl font-bold">
                    {logs?.filter((l: any) => l.activityType === 'LLAMADA').length || 0}
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
                  <p className="text-sm text-muted-foreground">{t('logsPage.activityTypes.meetingPlural')}</p>
                  <p className="text-2xl font-bold">
                    {logs?.filter((l: any) => l.activityType === 'VISITA').length || 0}
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
                  <p className="text-sm text-muted-foreground">{t('logsPage.activityTypes.emailPlural')}</p>
                  <p className="text-2xl font-bold">
                    {logs?.filter((l: any) => l.activityType === 'CORREO').length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>{t('logsPage.filters.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('logsPage.filters.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger>
                <SelectValue placeholder={t('logsPage.filters.datePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('logsPage.filters.allDates')}</SelectItem>
                <SelectItem value="today">{t('logsPage.filters.today')}</SelectItem>
                <SelectItem value="this-week">{t('logsPage.filters.thisWeek')}</SelectItem>
                <SelectItem value="last-week">{t('logsPage.filters.lastWeek')}</SelectItem>
                <SelectItem value="this-month">{t('logsPage.filters.thisMonth')}</SelectItem>
                <SelectItem value="last-month">{t('logsPage.filters.lastMonth')}</SelectItem>
              </SelectContent>
            </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                <SelectValue placeholder={t('logsPage.filters.activityTypePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('logsPage.filters.allTypes')}</SelectItem>
                <SelectItem value="LLAMADA">{t('logsPage.activityTypes.callPlural')}</SelectItem>
                <SelectItem value="CORREO">{t('logsPage.activityTypes.emailPlural')}</SelectItem>
                <SelectItem value="VISITA">{t('logsPage.activityTypes.visitPlural')}</SelectItem>
                <SelectItem value="NOTA">{t('logsPage.activityTypes.notePlural')}</SelectItem>
                <SelectItem value="DOCUMENTO">{t('logsPage.activityTypes.documentPlural')}</SelectItem>
                <SelectItem value="CAMBIO_ESTADO">{t('logsPage.activityTypes.statusChangePlural')}</SelectItem>
              </SelectContent>
            </Select>
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        {isLoading ? (
          <Card className="border-border">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{t('logsPage.loading')}</p>
            </CardContent>
          </Card>
        ) : Object.keys(groupedLogs).length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('logsPage.emptyState')}</p>
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
                                {t('logsPage.performedBy')}: <span className="font-medium text-foreground">{log.performedBy}</span>
                              </span>
                            </div>
                          )}
                          {log.clientId && (
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">
                                {t('logsPage.clientId')}: <span className="font-medium text-foreground">{log.clientId}</span>
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
