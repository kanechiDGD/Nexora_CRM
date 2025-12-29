import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileSignature, Download, Eye, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/DashboardLayout";

export default function Contracts() {
  const { t, i18n } = useTranslation();
  // Datos de ejemplo - en el futuro se conectaran a la base de datos
  const contracts = [
    {
      id: 1,
      clientName: "Juan Pérez",
      contractType: "SERVICES",
      status: "SIGNED",
      date: "2024-01-15",
      amount: 5000,
    },
    {
      id: 2,
      clientName: "María González",
      contractType: "ADJUSTMENT",
      status: "PENDING",
      date: "2024-01-20",
      amount: 3500,
    },
  ];

  const getContractTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'SERVICES': t('contractsPage.types.services'),
      'ADJUSTMENT': t('contractsPage.types.adjustment'),
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      'SIGNED': { variant: 'default', label: t('contractsPage.status.signed') },
      'PENDING': { variant: 'secondary', label: t('contractsPage.status.pending') },
      'CANCELED': { variant: 'destructive', label: t('contractsPage.status.canceled') },
    };
    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("contractsPage.title")}</h1>
            <p className="text-muted-foreground mt-1">
              {t("contractsPage.subtitle")}
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t("contractsPage.actions.newContract")}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileSignature className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("contractsPage.stats.total")}</p>
                  <p className="text-2xl font-bold">2</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <FileSignature className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("contractsPage.stats.signed")}</p>
                  <p className="text-2xl font-bold">1</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <FileSignature className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("contractsPage.stats.pending")}</p>
                  <p className="text-2xl font-bold">1</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contracts List */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>{t("contractsPage.listTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contracts.map((contract) => (
                <div
                  key={contract.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <FileSignature className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{getContractTypeLabel(contract.contractType)}</p>
                      <p className="text-sm text-muted-foreground">
                        {t("contractsPage.labels.client")}: {contract.clientName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("contractsPage.labels.date")}: {new Date(contract.date).toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">
                        ${contract.amount.toLocaleString('es-US')}
                      </p>
                      {getStatusBadge(contract.status)}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {contracts.length === 0 && (
                <div className="text-center py-12">
                  <FileSignature className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {t("contractsPage.empty")}
                  </p>
                  <Button className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    {t("contractsPage.actions.createFirst")}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card className="border-border bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">{t("contractsPage.info.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              - {t("contractsPage.info.items.autoGenerated")}
            </p>
            <p>
              - {t("contractsPage.info.items.downloadPdf")}
            </p>
            <p>
              - {t("contractsPage.info.items.legalValidity")}
            </p>
            <p>
              - {t("contractsPage.info.items.auditLog")}
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
