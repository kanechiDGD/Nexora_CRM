import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Notifications() {
  const { t, i18n } = useTranslation();
  const [timeFilter, setTimeFilter] = useState("all");
  const utils = trpc.useUtils();

  const { data: notifications = [], isLoading } = trpc.notifications.list.useQuery({ limit: 200 });
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
    },
  });

  const filteredNotifications = useMemo(() => {
    if (!notifications.length) return [];
    const now = new Date();
    return notifications.filter((notification: any) => {
      const createdAt = new Date(notification.createdAt);
      const diffDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      if (timeFilter === "today") return diffDays === 0;
      if (timeFilter === "week") return diffDays <= 7;
      if (timeFilter === "month") return diffDays <= 30;
      return true;
    });
  }, [notifications, timeFilter]);

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString(i18n.language.startsWith("es") ? "es-ES" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline"; label: string }> = {
      EVENT: { variant: "default", label: t("notifications.types.event") },
      TASK: { variant: "secondary", label: t("notifications.types.task") },
      ACTIVITY: { variant: "outline", label: t("notifications.types.activity") },
      EMAIL: { variant: "secondary", label: t("notifications.types.email") },
    };
    const config = variants[type] || { variant: "outline", label: type };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("notifications.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("notifications.subtitle")}</p>
          </div>
          <div className="w-[220px]">
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("notifications.filters.placeholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("notifications.filters.all")}</SelectItem>
                <SelectItem value="today">{t("notifications.filters.today")}</SelectItem>
                <SelectItem value="week">{t("notifications.filters.week")}</SelectItem>
                <SelectItem value="month">{t("notifications.filters.month")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="border-border">
          <CardHeader className="flex items-center justify-between flex-row">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t("notifications.listTitle")}
            </CardTitle>
            <Badge variant="outline">
              {filteredNotifications.length} {t("notifications.countLabel")}
            </Badge>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-10 text-center text-muted-foreground">{t("common.loading")}</div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">{t("notifications.empty")}</div>
            ) : (
              <div className="space-y-4">
                {filteredNotifications.map((notification: any) => (
                  <div
                    key={notification.id}
                    className={`rounded-lg border p-4 transition-colors ${
                      notification.readAt ? "bg-background" : "bg-primary/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {getTypeBadge(notification.type)}
                          <span className="text-xs text-muted-foreground">
                            {formatDate(notification.createdAt)}
                          </span>
                        </div>
                        <h3 className="font-semibold text-foreground">{notification.title}</h3>
                        {notification.body && (
                          <p className="text-sm text-muted-foreground">{notification.body}</p>
                        )}
                      </div>
                      {!notification.readAt && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => markRead.mutate({ id: notification.id })}
                          disabled={markRead.isPending}
                        >
                          <CheckCircle className="h-4 w-4" />
                          {t("notifications.markRead")}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
