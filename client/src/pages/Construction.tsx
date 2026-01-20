import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Building2,
  Search,
  Plus,
  Calendar,
  DollarSign,
  User,
  Eye,
  Layers,
  AlertTriangle,
  Hammer,
  PauseCircle,
  CheckCircle2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";

const STATUS_ORDER = ["PLANNING", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELED"] as const;
type PipelineStatus = (typeof STATUS_ORDER)[number];

export default function Construction() {
  const { t, i18n } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PipelineStatus>("all");
  const [, setLocation] = useLocation();

  const { data: projects, isLoading } = trpc.construction.list.useQuery();
  const projectsList = projects ?? [];

  const normalizeStatus = (project: any): PipelineStatus => {
    const raw = project?.status ?? project?.projectStatus ?? project?.project_status ?? "";
    switch (raw) {
      case "PLANIFICACION":
      case "PENDING":
      case "PLANNING":
        return "PLANNING";
      case "EN_PROGRESO":
      case "IN_PROGRESS":
        return "IN_PROGRESS";
      case "PAUSADO":
      case "ON_HOLD":
        return "ON_HOLD";
      case "COMPLETADO":
      case "COMPLETED":
        return "COMPLETED";
      case "CANCELADO":
      case "CANCELED":
      case "CANCELLED":
        return "CANCELED";
      default:
        return "PLANNING";
    }
  };

  const getStatusBadge = (status: PipelineStatus) => {
    const variants: Record<PipelineStatus, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      PLANNING: { variant: "secondary", label: t("constructionPage.status.pending") },
      IN_PROGRESS: { variant: "default", label: t("constructionPage.status.inProgress") },
      ON_HOLD: { variant: "destructive", label: t("constructionPage.status.onHold") },
      COMPLETED: { variant: "outline", label: t("constructionPage.status.completed") },
      CANCELED: { variant: "outline", label: t("constructionPage.status.canceled") },
    };
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "$0";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString(i18n.language === "es" ? "es-ES" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const statusCounts = useMemo(() => {
    const base: Record<PipelineStatus, number> = {
      PLANNING: 0,
      IN_PROGRESS: 0,
      ON_HOLD: 0,
      COMPLETED: 0,
      CANCELED: 0,
    };
    projectsList.forEach((project: any) => {
      const normalized = normalizeStatus(project);
      base[normalized] += 1;
    });
    return base;
  }, [projectsList]);

  const signals = useMemo(() => {
    let missingContractor = 0;
    let missingPermit = 0;
    let missingStart = 0;
    let overBudget = 0;

    projectsList.forEach((project: any) => {
      if (!project.contractor) missingContractor += 1;
      const permit = project.permitStatus;
      const permitOk = permit === "APROBADO" || permit === "APPROVED" || permit === "NO_REQUERIDO" || permit === "NOT_REQUIRED";
      if (!permitOk) missingPermit += 1;
      if (!project.startDate) missingStart += 1;
      if (project.actualCost && project.estimatedCost && project.actualCost > project.estimatedCost) {
        overBudget += 1;
      }
    });

    return {
      missingContractor,
      missingPermit,
      missingStart,
      overBudget,
    };
  }, [projectsList]);

  const pipelineColumns = useMemo(() => {
    const grouped: Record<PipelineStatus, any[]> = {
      PLANNING: [],
      IN_PROGRESS: [],
      ON_HOLD: [],
      COMPLETED: [],
      CANCELED: [],
    };
    projectsList.forEach((project: any) => {
      grouped[normalizeStatus(project)].push(project);
    });
    return grouped;
  }, [projectsList]);

  const filteredProjects = projectsList.filter((project: any) => {
    const normalizedStatus = normalizeStatus(project);
    if (statusFilter !== "all" && normalizedStatus !== statusFilter) {
      return false;
    }
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      project.projectName?.toLowerCase().includes(term) ||
      project.contractor?.toLowerCase().includes(term) ||
      project.clientId?.toString().includes(term)
    );
  });

  const totalValue = projectsList.reduce((sum: number, project: any) => sum + (project.estimatedCost || 0), 0);

  const filters = [
    { key: "all", label: t("constructionPage.filters.all") },
    { key: "PLANNING", label: t("constructionPage.filters.planning") },
    { key: "IN_PROGRESS", label: t("constructionPage.filters.active") },
    { key: "ON_HOLD", label: t("constructionPage.filters.onHold") },
    { key: "COMPLETED", label: t("constructionPage.filters.completed") },
    { key: "CANCELED", label: t("constructionPage.filters.canceled") },
  ] as const;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("constructionPage.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("constructionPage.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("constructionPage.actions.newProject")}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("constructionPage.stats.totalProjects")}</p>
                    <p className="text-2xl font-bold">{projectsList.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Hammer className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("constructionPage.stats.inProgress")}</p>
                    <p className="text-2xl font-bold">{statusCounts.IN_PROGRESS}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("constructionPage.stats.completed")}</p>
                    <p className="text-2xl font-bold">{statusCounts.COMPLETED}</p>
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
                    <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                {t("constructionPage.signals.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("constructionPage.signals.missingContractor")}</span>
                <Badge variant="outline">{signals.missingContractor}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("constructionPage.signals.missingPermit")}</span>
                <Badge variant="outline">{signals.missingPermit}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("constructionPage.signals.missingStart")}</span>
                <Badge variant="outline">{signals.missingStart}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("constructionPage.signals.overBudget")}</span>
                <Badge variant="outline">{signals.overBudget}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>{t("constructionPage.filters.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("constructionPage.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {filters.map((filter) => (
                  <Button
                    key={filter.key}
                    variant={statusFilter === filter.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(filter.key as any)}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              {t("constructionPage.pipeline.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 lg:grid-cols-5">
              {STATUS_ORDER.map((status) => (
                <div key={status} className="rounded-xl border border-border bg-muted/30 p-3">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>{t(`constructionPage.pipeline.${status.toLowerCase()}`)}</span>
                    <Badge variant="outline">{pipelineColumns[status].length}</Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    {pipelineColumns[status].length === 0 ? (
                      <p className="text-xs text-muted-foreground">{t("constructionPage.pipeline.empty")}</p>
                    ) : (
                      pipelineColumns[status].slice(0, 4).map((project: any) => (
                        <button
                          key={project.id}
                          type="button"
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-left text-xs hover:border-primary/50"
                          onClick={() => setLocation(`/clients/${project.clientId}`)}
                        >
                          <div className="font-semibold">
                            {project.projectName || t("constructionPage.projectTitle", { id: project.id })}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {project.clientId ? `${t("constructionPage.clientId")}: ${project.clientId}` : t("constructionPage.pipeline.noClient")}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card className="border-border">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{t("constructionPage.loading")}</p>
            </CardContent>
          </Card>
        ) : filteredProjects.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t("constructionPage.emptySearch")}</p>
              <Button className="mt-4" onClick={() => setStatusFilter("all")}>
                <Plus className="mr-2 h-4 w-4" />
                {t("constructionPage.actions.createFirst")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredProjects.map((project: any) => {
              const normalizedStatus = normalizeStatus(project);
              return (
                <Card key={project.id} className="border-border hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {project.projectName || t("constructionPage.projectTitle", { id: project.id })}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {t("constructionPage.clientId")}: {project.clientId || "-"}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(normalizedStatus)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3">
                      {project.contractor && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{t("constructionPage.labels.contractor")}: </span>
                          <span className="font-medium">{project.contractor}</span>
                        </div>
                      )}

                      {project.projectManager && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{t("constructionPage.labels.projectManager")}: </span>
                          <span className="font-medium">{project.projectManager}</span>
                        </div>
                      )}

                      {project.estimatedCost && (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{t("constructionPage.labels.estimatedCost")}: </span>
                          <span className="font-medium">{formatCurrency(project.estimatedCost)}</span>
                        </div>
                      )}

                      {project.startDate && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{t("constructionPage.labels.startDate")}: </span>
                          <span className="font-medium">{formatDate(project.startDate)}</span>
                        </div>
                      )}

                      {(project.actualCompletionDate || project.estimatedCompletionDate) && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{t("constructionPage.labels.completionDate")}: </span>
                          <span className="font-medium">
                            {formatDate(project.actualCompletionDate || project.estimatedCompletionDate)}
                          </span>
                        </div>
                      )}

                      {normalizedStatus === "ON_HOLD" && (
                        <div className="flex items-center gap-2 text-sm text-amber-600">
                          <PauseCircle className="h-4 w-4" />
                          <span>{t("constructionPage.labels.onHoldNote")}</span>
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
              );
            })}
          </div>
        )}

        <Card className="border-border bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">{t("constructionPage.approval.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>- {t("constructionPage.approval.items.claimApproved")}</p>
            <p>- {t("constructionPage.approval.items.fundsAvailable")}</p>
            <p>- {t("constructionPage.approval.items.contractSigned")}</p>
            <p>- {t("constructionPage.approval.items.contractorSelected")}</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
