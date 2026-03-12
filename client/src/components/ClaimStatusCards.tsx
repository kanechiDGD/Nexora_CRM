import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Clock, FileText, Users, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { getClaimStatusMeta } from "@/utils/claimStatus";

const APPROVED_KEYS = new Set([
  "default:APROVADA",
  "default:RELEASE_LETTER_REQUIRED",
  "default:CHECK_SENT_TO_MORTGAGE",
  "default:CLIENT_HAS_CHECK",
  "default:LISTA_PARA_CONSTRUIR",
]);

const REJECTED_KEYS = new Set([
  "default:RECHAZADA",
  "legacy:NEGADA",
]);

const CLOSED_KEYS = new Set([
  "default:CERRADA",
]);

export function ClaimStatusCards({ year }: { year?: number }) {
  const { t, i18n } = useTranslation();
  const [, setLocation] = useLocation();
  const [selectedStatus, setSelectedStatus] = useState<{
    status: string;
    displayName: string;
    clients: any[];
  } | null>(null);

  const { data: statusData = [], isLoading } = trpc.dashboard.clientsByClaimStatus.useQuery({ year });
  const { data: customStatuses = [] } = trpc.customClaimStatuses.list.useQuery();

  const groupedStatusData = useMemo(() => {
    const map = new Map<string, { status: string; displayName: string; count: number; clients: any[] }>();
    statusData.forEach((statusInfo: any) => {
      const meta = getClaimStatusMeta(statusInfo.status, {
        t,
        language: i18n.language,
        customStatuses,
      });
      const entry = map.get(meta.key);
      if (!entry) {
        map.set(meta.key, {
          status: meta.key,
          displayName: meta.displayName,
          count: statusInfo.count || 0,
          clients: statusInfo.clients || [],
        });
      } else {
        entry.count += statusInfo.count || 0;
        entry.clients = entry.clients.concat(statusInfo.clients || []);
        entry.displayName = meta.displayName;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [statusData, customStatuses, i18n.language, t]);

  const kpis = useMemo(() => {
    const allClients = groupedStatusData.flatMap((s) => s.clients);
    const approvedClients = groupedStatusData.filter((s) => APPROVED_KEYS.has(s.status)).flatMap((s) => s.clients);
    const rejectedClients = groupedStatusData.filter((s) => REJECTED_KEYS.has(s.status)).flatMap((s) => s.clients);
    const closedClients = groupedStatusData.filter((s) => CLOSED_KEYS.has(s.status)).flatMap((s) => s.clients);
    const activeClients = allClients.filter(
      (c) => !approvedClients.find((a) => a.id === c.id) &&
             !rejectedClients.find((r) => r.id === c.id) &&
             !closedClients.find((cl) => cl.id === c.id)
    );
    return {
      total: allClients.length,
      approved: approvedClients.length,
      rejected: rejectedClients.length,
      active: activeClients.length,
      allClients,
      approvedClients,
      rejectedClients,
      activeClients,
    };
  }, [groupedStatusData]);

  const handleCardClick = (statusInfo: any) => {
    setSelectedStatus({
      status: statusInfo.status,
      displayName: statusInfo.displayName,
      clients: statusInfo.clients || [],
    });
  };

  const handleClientClick = (clientId: string) => {
    setLocation(`/clients/${clientId}`);
    setSelectedStatus(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (statusData.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            {t("dashboard.claimStatus.noClients")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const total = kpis.total;

  return (
    <>
      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card
          className="border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setSelectedStatus({ status: "kpi:total", displayName: t("dashboard.claimStatus.kpi.total"), clients: kpis.allClients })}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              {t("dashboard.claimStatus.kpi.total")}
              <Users className="h-4 w-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{kpis.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("dashboard.claimStatus.clients")}
            </p>
          </CardContent>
        </Card>

        <Card
          className="border-l-4 border-l-green-500 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setSelectedStatus({ status: "kpi:approved", displayName: t("dashboard.claimStatus.kpi.approved"), clients: kpis.approvedClients })}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              {t("dashboard.claimStatus.kpi.approved")}
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{kpis.approved}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpis.total > 0 ? `${Math.round((kpis.approved / kpis.total) * 100)}%` : "0%"}{" "}
              {t("dashboard.claimStatus.kpi.ofTotal")}
            </p>
          </CardContent>
        </Card>

        <Card
          className="border-l-4 border-l-amber-500 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setSelectedStatus({ status: "kpi:active", displayName: t("dashboard.claimStatus.kpi.active"), clients: kpis.activeClients })}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              {t("dashboard.claimStatus.kpi.active")}
              <Clock className="h-4 w-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{kpis.active}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpis.total > 0 ? `${Math.round((kpis.active / kpis.total) * 100)}%` : "0%"}{" "}
              {t("dashboard.claimStatus.kpi.ofTotal")}
            </p>
          </CardContent>
        </Card>

        <Card
          className="border-l-4 border-l-red-500 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setSelectedStatus({ status: "kpi:rejected", displayName: t("dashboard.claimStatus.kpi.rejected"), clients: kpis.rejectedClients })}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              {t("dashboard.claimStatus.kpi.rejected")}
              <XCircle className="h-4 w-4 text-red-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{kpis.rejected}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpis.total > 0 ? `${Math.round((kpis.rejected / kpis.total) * 100)}%` : "0%"}{" "}
              {t("dashboard.claimStatus.kpi.ofTotal")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t("dashboard.claimStatus.breakdown")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {groupedStatusData.map((statusInfo) => {
              const pct = total > 0 ? Math.round((statusInfo.count / total) * 100) : 0;
              return (
                <button
                  key={statusInfo.status}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-accent text-left transition-colors w-full"
                  onClick={() => handleCardClick(statusInfo)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2 w-2 rounded-full bg-primary/50 flex-shrink-0" />
                    <span className="text-sm truncate">{statusInfo.displayName}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-xs text-muted-foreground">{pct}%</span>
                    <Badge variant="secondary" className="text-xs font-semibold min-w-[2rem] justify-center">
                      {statusInfo.count}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Client list dialog */}
      <Dialog open={!!selectedStatus} onOpenChange={() => setSelectedStatus(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedStatus?.displayName}
            </DialogTitle>
            <DialogDescription>
              {selectedStatus?.clients.length === 1
                ? t("dashboard.claimStatus.oneClient")
                : t("dashboard.claimStatus.manyClients", { count: selectedStatus?.clients.length })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {selectedStatus?.clients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("dashboard.claimStatus.noClientsInStatus")}
              </p>
            ) : (
              selectedStatus?.clients.map((client: any) => (
                <Card
                  key={client.id}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleClientClick(client.id)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {client.firstName} {client.lastName}
                        </p>
                        <div className="flex gap-2 text-sm text-muted-foreground">
                          {client.email && <span>{client.email}</span>}
                          {client.phone && <span>• {client.phone}</span>}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline">{t("dashboard.claimStatus.viewProfile")}</Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setSelectedStatus(null)}>
              {t("dashboard.claimStatus.close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
