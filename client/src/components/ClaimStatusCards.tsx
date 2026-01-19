import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { FileText, Users } from "lucide-react";
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

export function ClaimStatusCards() {
  const { t, i18n } = useTranslation();
  const [, setLocation] = useLocation();
  const [selectedStatus, setSelectedStatus] = useState<{
    status: string;
    displayName: string;
    clients: any[];
  } | null>(null);

  // Obtener conteo de clientes por estado
  const { data: statusData = [], isLoading } = trpc.dashboard.clientsByClaimStatus.useQuery();
  
  // Obtener estados personalizados para obtener sus displayNames
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
    return Array.from(map.values());
  }, [statusData, customStatuses, i18n.language, t]);

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
    );
  }

  if (statusData.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            {t('dashboard.claimStatus.noClients')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {groupedStatusData.map((statusInfo: any) => (
          <Card
            key={statusInfo.status}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleCardClick(statusInfo)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {statusInfo.displayName}
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statusInfo.count}</div>
              <p className="text-xs text-muted-foreground">
                {statusInfo.count === 1 ? t('dashboard.claimStatus.client') : t('dashboard.claimStatus.clients')}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Diálogo para mostrar lista de clientes */}
      <Dialog open={!!selectedStatus} onOpenChange={() => setSelectedStatus(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedStatus?.displayName}
            </DialogTitle>
            <DialogDescription>
              {selectedStatus?.clients.length === 1 
                ? t('dashboard.claimStatus.oneClient')
                : t('dashboard.claimStatus.manyClients', { count: selectedStatus?.clients.length })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {selectedStatus?.clients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('dashboard.claimStatus.noClientsInStatus')}
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
                    <Badge variant="outline">{t('dashboard.claimStatus.viewProfile')}</Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setSelectedStatus(null)}>
              {t('dashboard.claimStatus.close')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
