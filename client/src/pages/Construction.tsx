import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Building2, Search, Plus, Calendar, DollarSign, User, Eye } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";

export default function Construction() {
  const { t, i18n } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [, setLocation] = useLocation();

  const { data: projects, isLoading } = trpc.construction.list.useQuery();

  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">{t('constructionPage.status.none')}</Badge>;
    
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      'PENDING': { variant: 'secondary', label: t('constructionPage.status.pending') },
      'IN_PROGRESS': { variant: 'default', label: t('constructionPage.status.inProgress') },
      'COMPLETED': { variant: 'outline', label: t('constructionPage.status.completed') },
      'ON_HOLD': { variant: 'destructive', label: t('constructionPage.status.onHold') },
    };
    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredProjects = projects?.filter((project: any) => {
    if (!searchTerm) return true;
    return (
      project.contractor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.clientId?.toString().includes(searchTerm)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("constructionPage.title")}</h1>
            <p className="text-muted-foreground mt-1">
              {t("constructionPage.subtitle")}
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t("constructionPage.actions.newProject")}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("constructionPage.stats.totalProjects")}</p>
                  <p className="text-2xl font-bold">{projects?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Building2 className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("constructionPage.stats.inProgress")}</p>
                  <p className="text-2xl font-bold">
                    {projects?.filter((p: any) => p.status === 'IN_PROGRESS').length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Building2 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("constructionPage.stats.completed")}</p>
                  <p className="text-2xl font-bold">
                    {projects?.filter((p: any) => p.status === 'COMPLETED').length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("constructionPage.stats.totalValue")}</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(
                      projects?.reduce((sum: number, p: any) => sum + (p.estimatedCost || 0), 0) || 0
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>{t("constructionPage.searchTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('constructionPage.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Projects List */}
        {isLoading ? (
          <Card className="border-border">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{t("constructionPage.loading")}</p>
            </CardContent>
          </Card>
        ) : !filteredProjects || filteredProjects.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t("constructionPage.empty")}</p>
              <Button className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                {t("constructionPage.actions.createFirst")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredProjects.map((project: any) => (
              <Card key={project.id} className="border-border hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{t("constructionPage.projectTitle", { id: project.id })}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {t("constructionPage.clientId")}: {project.clientId}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(project.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    {project.contractor && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{t("constructionPage.labels.contractor")}:</span>
                        <span className="font-medium">{project.contractor}</span>
                      </div>
                    )}

                    {project.estimatedCost && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{t("constructionPage.labels.estimatedCost")}:</span>
                        <span className="font-medium">{formatCurrency(project.estimatedCost)}</span>
                      </div>
                    )}

                    {project.startDate && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{t("constructionPage.labels.startDate")}:</span>
                        <span className="font-medium">{formatDate(project.startDate)}</span>
                      </div>
                    )}

                    {project.completionDate && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{t("constructionPage.labels.completionDate")}:</span>
                        <span className="font-medium">{formatDate(project.completionDate)}</span>
                      </div>
                    )}
                  </div>

                  {project.notes && (
                    <div className="pt-3 border-t border-border">
                      <p className="text-sm text-muted-foreground">{project.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setLocation(`/clients/${project.clientId}`)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      {t("constructionPage.actions.viewClient")}
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      {t("constructionPage.actions.editProject")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Information Card */}
        <Card className="border-border bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">{t("constructionPage.approval.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              - {t("constructionPage.approval.items.claimApproved")}
            </p>
            <p>
              - {t("constructionPage.approval.items.fundsAvailable")}
            </p>
            <p>
              - {t("constructionPage.approval.items.contractSigned")}
            </p>
            <p>
              - {t("constructionPage.approval.items.contractorSelected")}
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
