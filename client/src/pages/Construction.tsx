import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ChevronsUpDown,
  Check,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_ORDER = ["PLANNING", "IN_PROGRESS", "SCHEDULED", "ON_HOLD", "COMPLETED", "CANCELED"] as const;
type PipelineStatus = (typeof STATUS_ORDER)[number];

type MaterialOrderItem = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  notes: string;
  required: boolean;
};

export default function Construction() {
  const { t, i18n } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PipelineStatus>("all");
  const [, setLocation] = useLocation();
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [newProjectForm, setNewProjectForm] = useState({
    clientId: null as string | null,
    clientName: "",
    projectName: "",
    propertyAddress: "",
  });
  const [setupForm, setSetupForm] = useState({
    scopeItems: [] as string[],
    scopeOther: "",
    roofType: "",
    roofColor: "",
    roofSQ: "",
    roofLayers: "",
    roofPitch: "",
    chimneyCount: "",
    skylightCount: "",
    starterFeet: "",
    gutterApronFeet: "",
    dripEdgeFeet: "",
    flashingFeet: "",
    flashingNeeded: false,
    bootCount: "",
    electricBootCount: "",
    kitchenVentCount: "",
    ventType: "",
    ventCount: "",
    iceWaterSquares: "",
    iceWaterLines: "2",
    needsPlywood: false,
    plywoodSheets: "",
    sidingType: "",
    sidingColor: "",
    sidingSQ: "",
    gutters: false,
    windows: false,
    garage: false,
    garageDoor: false,
    interiorDrywall: false,
    interiorPaint: false,
    interiorFlooring: false,
    interiorInsulation: false,
    interiorElectrical: false,
    interiorHvac: false,
    interiorNotes: "",
    permitStatus: "PENDIENTE",
    permitNumber: "",
    permitDate: "",
    materialsOrdered: false,
    crewAssigned: false,
    contractor: "",
    projectManager: "",
    startDate: "",
    estimatedCompletionDate: "",
    notes: "",
  });
  const [materialOrderItems, setMaterialOrderItems] = useState<MaterialOrderItem[]>([]);
  const [materialOrderNotes, setMaterialOrderNotes] = useState("");

  const { data: projects, isLoading } = trpc.construction.list.useQuery();
  const { data: clients } = trpc.clients.list.useQuery();
  const { data: estimateDocuments } = trpc.documents.getByClientId.useQuery(
    { clientId: selectedProject?.clientId || "" },
    { enabled: setupOpen && !!selectedProject?.clientId }
  );
  const utils = trpc.useUtils();
  const projectsList = projects ?? [];
  const existingClientIds = useMemo(() => new Set(projectsList.map((project: any) => project.clientId).filter(Boolean)), [projectsList]);

  const createProject = trpc.construction.create.useMutation({
    onSuccess: () => {
      toast.success(t("constructionPage.toasts.projectCreated"));
      utils.construction.list.invalidate();
      setNewProjectOpen(false);
      setNewProjectForm({ clientId: null, clientName: "", projectName: "", propertyAddress: "" });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateProject = trpc.construction.update.useMutation({
    onSuccess: () => {
      toast.success(t("constructionPage.toasts.projectUpdated"));
      utils.construction.list.invalidate();
      setSetupOpen(false);
      setSelectedProject(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const generateScope = trpc.construction.generateScopeFromEstimate.useMutation({
    onSuccess: (data) => {
      const mappedScope = mapScopeItemsFromAi(data.scopeItems || []);
      setSetupForm((prev) => ({
        ...prev,
        scopeItems: mappedScope,
        scopeOther: data.scopeOther || prev.scopeOther,
        roofType: data.roof?.material || prev.roofType,
        roofColor: data.roof?.color || prev.roofColor,
        roofSQ: data.roof?.squares ? String(data.roof.squares) : prev.roofSQ,
        roofLayers: data.roof?.layers ? String(data.roof.layers) : prev.roofLayers,
        roofPitch: data.roof?.pitch || prev.roofPitch,
        chimneyCount: data.roof?.chimneyCount ? String(data.roof.chimneyCount) : prev.chimneyCount,
        skylightCount: data.roof?.skylightCount ? String(data.roof.skylightCount) : prev.skylightCount,
        starterFeet: data.roof?.starterFeet ? String(data.roof.starterFeet) : prev.starterFeet,
        gutterApronFeet: data.roof?.gutterApronFeet ? String(data.roof.gutterApronFeet) : prev.gutterApronFeet,
        dripEdgeFeet: data.roof?.dripEdgeFeet ? String(data.roof.dripEdgeFeet) : prev.dripEdgeFeet,
        flashingFeet: data.roof?.flashingFeet ? String(data.roof.flashingFeet) : prev.flashingFeet,
        flashingNeeded: data.roof?.flashingNeeded ?? prev.flashingNeeded,
        bootCount: data.roof?.bootCount ? String(data.roof.bootCount) : prev.bootCount,
        electricBootCount: data.roof?.electricBootCount ? String(data.roof.electricBootCount) : prev.electricBootCount,
        kitchenVentCount: data.roof?.kitchenVentCount ? String(data.roof.kitchenVentCount) : prev.kitchenVentCount,
        ventType: data.roof?.ventType || prev.ventType,
        ventCount: data.roof?.ventCount ? String(data.roof.ventCount) : prev.ventCount,
        iceWaterSquares: data.roof?.iceWaterSquares ? String(data.roof.iceWaterSquares) : prev.iceWaterSquares,
        iceWaterLines: data.roof?.iceWaterLines ? String(data.roof.iceWaterLines) : prev.iceWaterLines,
        needsPlywood: data.roof?.needsPlywood ?? prev.needsPlywood,
        plywoodSheets: data.roof?.plywoodSheets ? String(data.roof.plywoodSheets) : prev.plywoodSheets,
      }));

      if (data.materials && data.materials.length) {
        setMaterialOrderItems(
          data.materials.map((item: any) => ({
            id: crypto.randomUUID(),
            name: item.name || "",
            quantity: item.quantity ? String(item.quantity) : "",
            unit: item.unit || "",
            notes: item.notes || "",
            required: !!item.required,
          }))
        );
      }
      toast.success(t("constructionPage.toasts.scopeGenerated"));
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const saveMaterialOrder = trpc.construction.saveMaterialOrder.useMutation({
    onSuccess: () => {
      toast.success(t("constructionPage.toasts.materialOrderSaved"));
      if (selectedProject?.clientId) {
        utils.documents.getByClientId.invalidate({ clientId: selectedProject.clientId });
      } else {
        utils.documents.getByClientId.invalidate();
      }
      setMaterialOrderNotes("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const parseJson = <T,>(value: any, fallback: T): T => {
    if (!value) return fallback;
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  };

  const toDateInput = (value: string | Date | null | undefined) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  };

  const toNumber = (value: string) => {
    if (value === "") return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const toQuantity = (value: string) => {
    if (value === "") return 0;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const scopeOptions = [
    { id: "ROOF", label: t("constructionPage.scope.roof") },
    { id: "SIDING", label: t("constructionPage.scope.siding") },
    { id: "GUTTERS", label: t("constructionPage.scope.gutters") },
    { id: "WINDOWS", label: t("constructionPage.scope.windows") },
    { id: "GARAGE", label: t("constructionPage.scope.garage") },
    { id: "GARAGE_DOOR", label: t("constructionPage.scope.garageDoor") },
    { id: "INTERIOR", label: t("constructionPage.scope.interior") },
    { id: "OTHER", label: t("constructionPage.scope.other") },
  ];

  const scopeMap: Record<string, string> = {
    roof: "ROOF",
    siding: "SIDING",
    gutters: "GUTTERS",
    windows: "WINDOWS",
    garage: "GARAGE",
    "garage door": "GARAGE_DOOR",
    interior: "INTERIOR",
  };

  const mapScopeItemsFromAi = (items: string[]) => {
    const normalized = items
      .map((item) => item.toLowerCase().trim())
      .map((item) => scopeMap[item])
      .filter(Boolean) as string[];
    return Array.from(new Set(normalized));
  };

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
      case "SCHEDULED":
      case "PROGRAMADO":
        return "SCHEDULED";
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
      SCHEDULED: { variant: "secondary", label: t("constructionPage.status.scheduled") },
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
      SCHEDULED: 0,
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
      SCHEDULED: [],
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
    { key: "SCHEDULED", label: t("constructionPage.filters.scheduled") },
    { key: "ON_HOLD", label: t("constructionPage.filters.onHold") },
    { key: "COMPLETED", label: t("constructionPage.filters.completed") },
    { key: "CANCELED", label: t("constructionPage.filters.canceled") },
  ] as const;

  const hasEstimate = !!estimateDocuments?.some((doc: any) => doc.documentType === "ESTIMADO_NUESTRO");

  const handleClientSelect = (clientId: string, clientName: string) => {
    if (existingClientIds.has(clientId)) {
      toast.error(t("constructionPage.toasts.clientAlreadyAssigned"));
      return;
    }
    const selectedClient = clients?.find((client: any) => client.id === clientId);
    const addressParts = [
      selectedClient?.propertyAddress,
      selectedClient?.city,
      selectedClient?.state,
      selectedClient?.zipCode,
    ].filter(Boolean);
    const address = addressParts.length ? addressParts.join(", ") : "";
    const projectName = clientName || "";
    setNewProjectForm({
      clientId,
      clientName,
      projectName,
      propertyAddress: address,
    });
    setClientSearchOpen(false);
  };

  const handleCreateProject = (event: FormEvent) => {
    event.preventDefault();
    if (!newProjectForm.clientId) {
      toast.error(t("constructionPage.toasts.clientRequired"));
      return;
    }
    const projectName = newProjectForm.projectName.trim() || newProjectForm.clientName.trim();
    if (!projectName) {
      toast.error(t("constructionPage.toasts.projectNameRequired"));
      return;
    }
    createProject.mutate({
      clientId: newProjectForm.clientId,
      projectName,
      propertyAddress: newProjectForm.propertyAddress || null,
      projectStatus: "PLANIFICACION",
      formStatus: "DRAFT",
    });
  };

  const openSetupDialog = (project: any) => {
    const roofDetails = parseJson(project.roofDetails, {});
    const exteriorDetails = parseJson(project.exteriorDetails, {});
    const interiorDetails = parseJson(project.interiorDetails, {});
    const scopeItems = parseJson(project.scopeItems, []) as string[];
    const existingOrderItems = (parseJson(project.materialOrderItems, []) as MaterialOrderItem[]).map((item) => ({
      id: item.id || crypto.randomUUID(),
      name: item.name || "",
      quantity: item.quantity || "",
      unit: item.unit || "",
      notes: item.notes || "",
      required: !!item.required,
    }));

    setSelectedProject(project);
    setSetupForm({
      scopeItems,
      scopeOther: project.scopeOther || "",
      roofType: project.roofType || "",
      roofColor: project.roofColor || "",
      roofSQ: project.roofSQ ? String(project.roofSQ) : "",
      roofLayers: roofDetails.layers ? String(roofDetails.layers) : "",
      roofPitch: roofDetails.pitch || "",
      chimneyCount: roofDetails.chimneyCount ? String(roofDetails.chimneyCount) : "",
      skylightCount: roofDetails.skylightCount ? String(roofDetails.skylightCount) : "",
      starterFeet: roofDetails.starterFeet ? String(roofDetails.starterFeet) : "",
      gutterApronFeet: roofDetails.gutterApronFeet ? String(roofDetails.gutterApronFeet) : "",
      dripEdgeFeet: roofDetails.dripEdgeFeet ? String(roofDetails.dripEdgeFeet) : "",
      flashingFeet: roofDetails.flashingFeet ? String(roofDetails.flashingFeet) : "",
      flashingNeeded: !!roofDetails.flashingNeeded,
      bootCount: roofDetails.bootCount ? String(roofDetails.bootCount) : "",
      electricBootCount: roofDetails.electricBootCount ? String(roofDetails.electricBootCount) : "",
      kitchenVentCount: roofDetails.kitchenVentCount ? String(roofDetails.kitchenVentCount) : "",
      ventType: roofDetails.ventType || "",
      ventCount: roofDetails.ventCount ? String(roofDetails.ventCount) : "",
      iceWaterSquares: roofDetails.iceWaterSquares ? String(roofDetails.iceWaterSquares) : "",
      iceWaterLines: roofDetails.iceWaterLines ? String(roofDetails.iceWaterLines) : "2",
      needsPlywood: !!roofDetails.needsPlywood,
      plywoodSheets: roofDetails.plywoodSheets ? String(roofDetails.plywoodSheets) : "",
      sidingType: project.sidingType || "",
      sidingColor: project.sidingColor || "",
      sidingSQ: project.sidingSQ ? String(project.sidingSQ) : "",
      gutters: !!exteriorDetails.gutters,
      windows: !!exteriorDetails.windows,
      garage: !!exteriorDetails.garage,
      garageDoor: !!exteriorDetails.garageDoor,
      interiorDrywall: !!interiorDetails.drywall,
      interiorPaint: !!interiorDetails.paint,
      interiorFlooring: !!interiorDetails.flooring,
      interiorInsulation: !!interiorDetails.insulation,
      interiorElectrical: !!interiorDetails.electrical,
      interiorHvac: !!interiorDetails.hvac,
      interiorNotes: interiorDetails.notes || "",
      permitStatus: project.permitStatus || "PENDIENTE",
      permitNumber: project.permitNumber || "",
      permitDate: toDateInput(project.permitDate),
      materialsOrdered: project.materialsOrdered === 1,
      crewAssigned: project.crewAssigned === 1,
      contractor: project.contractor || "",
      projectManager: project.projectManager || "",
      startDate: toDateInput(project.startDate),
      estimatedCompletionDate: toDateInput(project.estimatedCompletionDate),
      notes: project.notes || "",
    });
    setMaterialOrderItems(existingOrderItems);
    setMaterialOrderNotes(project.materialOrderNotes || "");
    setSetupOpen(true);
  };

  const toggleScopeItem = (value: string) => {
    setSetupForm((prev) => {
      const hasItem = prev.scopeItems.includes(value);
      const scopeItems = hasItem ? prev.scopeItems.filter((item) => item !== value) : [...prev.scopeItems, value];
      return { ...prev, scopeItems };
    });
  };

  const buildProjectPayload = () => ({
    roofType: setupForm.roofType || null,
    roofColor: setupForm.roofColor || null,
    roofSQ: toNumber(setupForm.roofSQ),
    sidingType: setupForm.sidingType || null,
    sidingColor: setupForm.sidingColor || null,
    sidingSQ: toNumber(setupForm.sidingSQ),
    permitStatus: setupForm.permitStatus,
    permitNumber: setupForm.permitNumber || null,
    permitDate: setupForm.permitDate ? new Date(setupForm.permitDate) : null,
    startDate: setupForm.startDate ? new Date(setupForm.startDate) : null,
    estimatedCompletionDate: setupForm.estimatedCompletionDate ? new Date(setupForm.estimatedCompletionDate) : null,
    materialsOrdered: setupForm.materialsOrdered,
    crewAssigned: setupForm.crewAssigned,
    contractor: setupForm.contractor || null,
    projectManager: setupForm.projectManager || null,
    notes: setupForm.notes || null,
    scopeItems: setupForm.scopeItems,
    scopeOther: setupForm.scopeOther || null,
    roofDetails: {
      layers: toNumber(setupForm.roofLayers),
      pitch: setupForm.roofPitch || null,
      chimneyCount: toNumber(setupForm.chimneyCount),
      skylightCount: toNumber(setupForm.skylightCount),
      starterFeet: toNumber(setupForm.starterFeet),
      gutterApronFeet: toNumber(setupForm.gutterApronFeet),
      dripEdgeFeet: toNumber(setupForm.dripEdgeFeet),
      flashingFeet: toNumber(setupForm.flashingFeet),
      flashingNeeded: setupForm.flashingNeeded,
      bootCount: toNumber(setupForm.bootCount),
      electricBootCount: toNumber(setupForm.electricBootCount),
      kitchenVentCount: toNumber(setupForm.kitchenVentCount),
      ventType: setupForm.ventType || null,
      ventCount: toNumber(setupForm.ventCount),
      iceWaterSquares: toNumber(setupForm.iceWaterSquares),
      iceWaterLines: toNumber(setupForm.iceWaterLines),
      needsPlywood: setupForm.needsPlywood,
      plywoodSheets: toNumber(setupForm.plywoodSheets),
    },
    exteriorDetails: {
      gutters: setupForm.gutters,
      windows: setupForm.windows,
      garage: setupForm.garage,
      garageDoor: setupForm.garageDoor,
    },
    interiorDetails: {
      drywall: setupForm.interiorDrywall,
      paint: setupForm.interiorPaint,
      flooring: setupForm.interiorFlooring,
      insulation: setupForm.interiorInsulation,
      electrical: setupForm.interiorElectrical,
      hvac: setupForm.interiorHvac,
      notes: setupForm.interiorNotes || null,
    },
    materialOrderItems: materialOrderItems.map((item) => ({
      name: item.name,
      quantity: toQuantity(item.quantity),
      unit: item.unit || null,
      notes: item.notes || null,
      required: item.required,
    })),
    materialOrderNotes: materialOrderNotes || null,
  });

  const handleSaveDraft = () => {
    if (!selectedProject) return;
    updateProject.mutate({
      id: selectedProject.id,
      data: {
        ...buildProjectPayload(),
        formStatus: "DRAFT",
      },
    });
  };

  const handleStartConstruction = () => {
    if (!selectedProject) return;
    updateProject.mutate({
      id: selectedProject.id,
      data: {
        ...buildProjectPayload(),
        formStatus: "READY",
        projectStatus: "EN_PROGRESO",
      },
    });
  };

  const addMaterialOrderLine = () => {
    setMaterialOrderItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "",
        quantity: "",
        unit: "",
        notes: "",
        required: false,
      },
    ]);
  };

  const updateMaterialOrderItem = (id: string, patch: Partial<MaterialOrderItem>) => {
    setMaterialOrderItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeMaterialOrderItem = (id: string) => {
    setMaterialOrderItems((prev) => prev.filter((item) => item.id !== id));
  };

  const generateMaterialOrder = () => {
    const roofSq = toQuantity(setupForm.roofSQ);
    const iceWaterLines = toQuantity(setupForm.iceWaterLines);
    const iceWaterSqInput = toQuantity(setupForm.iceWaterSquares);
    const iceWaterSq = iceWaterSqInput || (iceWaterLines > 0 ? Math.min(roofSq, iceWaterLines * 2) : 0);
    const paperSq = Math.max(0, roofSq - iceWaterSq);
    const paperRolls = paperSq > 0 ? Math.ceil(paperSq / 10) : 0;
    const iceWaterRolls = iceWaterSq > 0 ? Math.max(1, Math.ceil(iceWaterSq / 2)) : 0;
    const nailBoxes = roofSq > 0 ? Math.max(1, Math.ceil(roofSq / 18)) : 0;
    const stapleBoxes = roofSq > 0 ? Math.max(1, Math.ceil(roofSq / 10)) : 0;
    const plywoodNailBoxes = setupForm.needsPlywood ? Math.max(1, Math.ceil(roofSq / 18)) : 0;

    const items: MaterialOrderItem[] = [];

    if (paperRolls) {
      items.push({
        id: crypto.randomUUID(),
        name: t("constructionPage.materials.underlayment"),
        quantity: String(paperRolls),
        unit: t("constructionPage.materials.rolls"),
        notes: "",
        required: true,
      });
    }
    if (iceWaterRolls) {
      items.push({
        id: crypto.randomUUID(),
        name: t("constructionPage.materials.iceWater"),
        quantity: String(iceWaterRolls),
        unit: t("constructionPage.materials.rolls"),
        notes: "",
        required: true,
      });
    }
    if (setupForm.starterFeet) {
      items.push({
        id: crypto.randomUUID(),
        name: t("constructionPage.materials.starter"),
        quantity: setupForm.starterFeet,
        unit: t("constructionPage.materials.feet"),
        notes: "",
        required: true,
      });
    }
    if (setupForm.gutterApronFeet) {
      items.push({
        id: crypto.randomUUID(),
        name: t("constructionPage.materials.gutterApron"),
        quantity: setupForm.gutterApronFeet,
        unit: t("constructionPage.materials.feet"),
        notes: "",
        required: true,
      });
    }
    if (setupForm.dripEdgeFeet) {
      items.push({
        id: crypto.randomUUID(),
        name: t("constructionPage.materials.dripEdge"),
        quantity: setupForm.dripEdgeFeet,
        unit: t("constructionPage.materials.feet"),
        notes: "",
        required: true,
      });
    }
    if (setupForm.flashingNeeded && setupForm.flashingFeet) {
      items.push({
        id: crypto.randomUUID(),
        name: t("constructionPage.materials.flashing"),
        quantity: setupForm.flashingFeet,
        unit: t("constructionPage.materials.feet"),
        notes: "",
        required: true,
      });
    }
    if (setupForm.bootCount) {
      items.push({
        id: crypto.randomUUID(),
        name: t("constructionPage.materials.pipeBoots"),
        quantity: setupForm.bootCount,
        unit: t("constructionPage.materials.count"),
        notes: "",
        required: true,
      });
    }
    if (setupForm.electricBootCount) {
      items.push({
        id: crypto.randomUUID(),
        name: t("constructionPage.materials.electricBoots"),
        quantity: setupForm.electricBootCount,
        unit: t("constructionPage.materials.count"),
        notes: "",
        required: true,
      });
    }
    if (setupForm.chimneyCount) {
      items.push({
        id: crypto.randomUUID(),
        name: t("constructionPage.materials.chimneyCoil"),
        quantity: setupForm.chimneyCount,
        unit: t("constructionPage.materials.count"),
        notes: "",
        required: true,
      });
    }
    if (setupForm.kitchenVentCount) {
      items.push({
        id: crypto.randomUUID(),
        name: t("constructionPage.materials.kitchenVents"),
        quantity: setupForm.kitchenVentCount,
        unit: t("constructionPage.materials.count"),
        notes: "",
        required: true,
      });
    }
    if (setupForm.ventType && setupForm.ventCount) {
      items.push({
        id: crypto.randomUUID(),
        name: `${setupForm.ventType} ${t("constructionPage.materials.vents")}`,
        quantity: setupForm.ventCount,
        unit: t("constructionPage.materials.count"),
        notes: "",
        required: true,
      });
    }
    if (nailBoxes) {
      items.push({
        id: crypto.randomUUID(),
        name: t("constructionPage.materials.roofNails"),
        quantity: String(nailBoxes),
        unit: t("constructionPage.materials.boxes"),
        notes: t("constructionPage.materials.roofNailsNote"),
        required: true,
      });
    }
    if (roofSq > 0) {
      const roofNote = [setupForm.roofType, setupForm.roofColor].filter(Boolean).join(" / ");
      items.unshift({
        id: crypto.randomUUID(),
        name: t("constructionPage.materials.shingles"),
        quantity: String(roofSq),
        unit: t("constructionPage.materials.squareUnit"),
        notes: roofNote,
        required: true,
      });
    }
    if (plywoodNailBoxes) {
      items.push({
        id: crypto.randomUUID(),
        name: t("constructionPage.materials.plywoodNails"),
        quantity: String(plywoodNailBoxes),
        unit: t("constructionPage.materials.boxes"),
        notes: "",
        required: true,
      });
    }
    if (setupForm.needsPlywood && setupForm.plywoodSheets) {
      items.push({
        id: crypto.randomUUID(),
        name: t("constructionPage.materials.plywoodSheets"),
        quantity: setupForm.plywoodSheets,
        unit: t("constructionPage.materials.count"),
        notes: "",
        required: true,
      });
    }
    if (stapleBoxes) {
      items.push({
        id: crypto.randomUUID(),
        name: t("constructionPage.materials.staples"),
        quantity: String(stapleBoxes),
        unit: t("constructionPage.materials.boxes"),
        notes: "",
        required: true,
      });
    }
    items.push({
      id: crypto.randomUUID(),
      name: t("constructionPage.materials.caulking"),
      quantity: "2",
      unit: t("constructionPage.materials.tubes"),
      notes: "",
      required: true,
    });

    setMaterialOrderItems(items);
  };

  const handleSaveMaterialOrder = () => {
    if (!selectedProject) return;
    const cleanedItems = materialOrderItems
      .map((item) => ({
        ...item,
        name: item.name.trim(),
      }))
      .filter((item) => item.name && toQuantity(item.quantity) > 0);

    if (cleanedItems.length === 0) {
      toast.error(t("constructionPage.toasts.materialOrderMissing"));
      return;
    }
    saveMaterialOrder.mutate({
      projectId: selectedProject.id,
      items: cleanedItems.map((item) => ({
        name: item.name,
        quantity: toQuantity(item.quantity),
        unit: item.unit || null,
        notes: item.notes || null,
        required: item.required,
      })),
      notes: materialOrderNotes || null,
      roofType: setupForm.roofType || null,
      roofColor: setupForm.roofColor || null,
      roofSquares: toNumber(setupForm.roofSQ),
      scopeItems: setupForm.scopeItems,
      scopeOther: setupForm.scopeOther || null,
    });
  };

  const canStartConstruction = setupForm.permitStatus !== "RECHAZADO" && !!setupForm.permitStatus;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("constructionPage.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("constructionPage.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("constructionPage.actions.newProject")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[640px]">
                <form onSubmit={handleCreateProject}>
                  <DialogHeader>
                    <DialogTitle>{t("constructionPage.newProject.title")}</DialogTitle>
                    <DialogDescription>{t("constructionPage.newProject.subtitle")}</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>{t("constructionPage.newProject.clientLabel")}</Label>
                      <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" className="justify-between">
                            {newProjectForm.clientName || t("constructionPage.newProject.clientPlaceholder")}
                            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[520px] p-0">
                          <Command>
                            <CommandInput placeholder={t("constructionPage.newProject.clientSearch")} />
                            <CommandList>
                              <CommandEmpty>{t("constructionPage.newProject.clientEmpty")}</CommandEmpty>
                              <CommandGroup>
                                {clients?.map((client: any) => {
                                  const fullName = `${client.firstName} ${client.lastName}`;
                                  const isAssigned = existingClientIds.has(client.id);
                                  return (
                                    <CommandItem
                                      key={client.id}
                                      value={fullName}
                                      disabled={isAssigned}
                                      onSelect={() => handleClientSelect(client.id, fullName)}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          newProjectForm.clientId === client.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div className="flex flex-col">
                                        <span className="font-medium">{fullName}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {client.phone || client.email || `ID: ${client.id}`}
                                        </span>
                                      </div>
                                      {isAssigned && (
                                        <span className="ml-auto text-xs text-muted-foreground">
                                          {t("constructionPage.newProject.alreadyAssigned")}
                                        </span>
                                      )}
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="projectName">{t("constructionPage.newProject.projectName")}</Label>
                      <Input
                        id="projectName"
                        value={newProjectForm.projectName}
                        onChange={(event) => setNewProjectForm((prev) => ({ ...prev, projectName: event.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="propertyAddress">{t("constructionPage.newProject.address")}</Label>
                      <Input
                        id="propertyAddress"
                        value={newProjectForm.propertyAddress}
                        onChange={(event) => setNewProjectForm((prev) => ({ ...prev, propertyAddress: event.target.value }))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setNewProjectOpen(false)}>
                      {t("constructionPage.actions.cancel")}
                    </Button>
                    <Button type="submit" disabled={createProject.isPending}>
                      {createProject.isPending ? t("constructionPage.actions.saving") : t("constructionPage.actions.createProject")}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
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
                          onClick={() => openSetupDialog(project)}
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
              <Button className="mt-4" onClick={() => { setStatusFilter("all"); setNewProjectOpen(true); }}>
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openSetupDialog(project)}
                      >
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

      <Dialog
        open={setupOpen}
        onOpenChange={(open) => {
          setSetupOpen(open);
          if (!open) setSelectedProject(null);
        }}
      >
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("constructionPage.setup.title")}</DialogTitle>
            <DialogDescription>
              {selectedProject?.projectName || t("constructionPage.setup.subtitle")}
            </DialogDescription>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasEstimate || generateScope.isPending || !selectedProject}
                onClick={() => {
                  if (!selectedProject) return;
                  generateScope.mutate({ projectId: selectedProject.id });
                }}
              >
                {generateScope.isPending
                  ? t("constructionPage.setup.generatingScope")
                  : t("constructionPage.setup.generateScope")}
              </Button>
              {!hasEstimate && (
                <span className="text-xs text-muted-foreground">
                  {t("constructionPage.setup.missingEstimate")}
                </span>
              )}
            </div>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid gap-3">
              <p className="text-sm font-semibold">{t("constructionPage.setup.scopeTitle")}</p>
              <div className="grid gap-3 md:grid-cols-2">
                {scopeOptions.map((option) => (
                  <label key={option.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={setupForm.scopeItems.includes(option.id)}
                      onCheckedChange={() => toggleScopeItem(option.id)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
              {setupForm.scopeItems.includes("OTHER") && (
                <div className="grid gap-2">
                  <Label htmlFor="scopeOther">{t("constructionPage.setup.scopeOther")}</Label>
                  <Input
                    id="scopeOther"
                    value={setupForm.scopeOther}
                    onChange={(event) => setSetupForm((prev) => ({ ...prev, scopeOther: event.target.value }))}
                  />
                </div>
              )}
            </div>

            <div className="grid gap-3">
              <p className="text-sm font-semibold">{t("constructionPage.setup.roofTitle")}</p>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label>{t("constructionPage.setup.roofMaterial")}</Label>
                  <Input
                    value={setupForm.roofType}
                    onChange={(event) => setSetupForm((prev) => ({ ...prev, roofType: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("constructionPage.setup.roofColor")}</Label>
                  <Input
                    value={setupForm.roofColor}
                    onChange={(event) => setSetupForm((prev) => ({ ...prev, roofColor: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("constructionPage.setup.roofSquares")}</Label>
                  <Input
                    value={setupForm.roofSQ}
                    onChange={(event) => setSetupForm((prev) => ({ ...prev, roofSQ: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("constructionPage.setup.roofLayers")}</Label>
                  <Input
                    value={setupForm.roofLayers}
                    onChange={(event) => setSetupForm((prev) => ({ ...prev, roofLayers: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("constructionPage.setup.roofPitch")}</Label>
                  <Input
                    value={setupForm.roofPitch}
                    onChange={(event) => setSetupForm((prev) => ({ ...prev, roofPitch: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("constructionPage.setup.chimneyCount")}</Label>
                  <Input
                    value={setupForm.chimneyCount}
                    onChange={(event) => setSetupForm((prev) => ({ ...prev, chimneyCount: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("constructionPage.setup.skylightCount")}</Label>
                  <Input
                    value={setupForm.skylightCount}
                    onChange={(event) => setSetupForm((prev) => ({ ...prev, skylightCount: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("constructionPage.setup.starterFeet")}</Label>
                  <Input
                    value={setupForm.starterFeet}
                    onChange={(event) => setSetupForm((prev) => ({ ...prev, starterFeet: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("constructionPage.setup.gutterApronFeet")}</Label>
                  <Input
                    value={setupForm.gutterApronFeet}
                    onChange={(event) => setSetupForm((prev) => ({ ...prev, gutterApronFeet: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("constructionPage.setup.dripEdgeFeet")}</Label>
                  <Input
                    value={setupForm.dripEdgeFeet}
                    onChange={(event) => setSetupForm((prev) => ({ ...prev, dripEdgeFeet: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("constructionPage.setup.flashingFeet")}</Label>
                  <Input
                    value={setupForm.flashingFeet}
                    onChange={(event) => setSetupForm((prev) => ({ ...prev, flashingFeet: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("constructionPage.setup.bootCount")}</Label>
                  <Input
                    value={setupForm.bootCount}
                    onChange={(event) => setSetupForm((prev) => ({ ...prev, bootCount: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("constructionPage.setup.electricBootCount")}</Label>
                  <Input
                    value={setupForm.electricBootCount}
                    onChange={(event) => setSetupForm((prev) => ({ ...prev, electricBootCount: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("constructionPage.setup.kitchenVentCount")}</Label>
                  <Input
                    value={setupForm.kitchenVentCount}
                    onChange={(event) => setSetupForm((prev) => ({ ...prev, kitchenVentCount: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("constructionPage.setup.ventType")}</Label>
                  <Input
                    value={setupForm.ventType}
                    onChange={(event) => setSetupForm((prev) => ({ ...prev, ventType: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("constructionPage.setup.ventCount")}</Label>
                  <Input
                    value={setupForm.ventCount}
                    onChange={(event) => setSetupForm((prev) => ({ ...prev, ventCount: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("constructionPage.setup.iceWaterSquares")}</Label>
                  <Input
                    value={setupForm.iceWaterSquares}
                    onChange={(event) => setSetupForm((prev) => ({ ...prev, iceWaterSquares: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("constructionPage.setup.iceWaterLines")}</Label>
                  <Input
                    value={setupForm.iceWaterLines}
                    onChange={(event) => setSetupForm((prev) => ({ ...prev, iceWaterLines: event.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={setupForm.flashingNeeded}
                    onCheckedChange={() => setSetupForm((prev) => ({ ...prev, flashingNeeded: !prev.flashingNeeded }))}
                  />
                  {t("constructionPage.setup.flashingNeeded")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={setupForm.needsPlywood}
                    onCheckedChange={() => setSetupForm((prev) => ({ ...prev, needsPlywood: !prev.needsPlywood }))}
                  />
                  {t("constructionPage.setup.needsPlywood")}
                </label>
              </div>
              {setupForm.needsPlywood && (
                <div className="grid gap-2">
                  <Label>{t("constructionPage.setup.plywoodSheets")}</Label>
                  <Input
                    value={setupForm.plywoodSheets}
                    onChange={(event) => setSetupForm((prev) => ({ ...prev, plywoodSheets: event.target.value }))}
                  />
                </div>
              )}
            </div>

            <div className="grid gap-3">
              <p className="text-sm font-semibold">{t("constructionPage.setup.exteriorTitle")}</p>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label>{t("constructionPage.setup.sidingType")}</Label>
                  <Input
                    value={setupForm.sidingType}
                    onChange={(event) => setSetupForm((prev) => ({ ...prev, sidingType: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("constructionPage.setup.sidingColor")}</Label>
                  <Input
                    value={setupForm.sidingColor}
                    onChange={(event) => setSetupForm((prev) => ({ ...prev, sidingColor: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("constructionPage.setup.sidingSquares")}</Label>
                  <Input
                    value={setupForm.sidingSQ}
                    onChange={(event) => setSetupForm((prev) => ({ ...prev, sidingSQ: event.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={setupForm.gutters}
                    onCheckedChange={() => setSetupForm((prev) => ({ ...prev, gutters: !prev.gutters }))}
                  />
                  {t("constructionPage.setup.gutters")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={setupForm.windows}
                    onCheckedChange={() => setSetupForm((prev) => ({ ...prev, windows: !prev.windows }))}
                  />
                  {t("constructionPage.setup.windows")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={setupForm.garage}
                    onCheckedChange={() => setSetupForm((prev) => ({ ...prev, garage: !prev.garage }))}
                  />
                  {t("constructionPage.setup.garage")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={setupForm.garageDoor}
                    onCheckedChange={() => setSetupForm((prev) => ({ ...prev, garageDoor: !prev.garageDoor }))}
                  />
                  {t("constructionPage.setup.garageDoor")}
                </label>
              </div>
            </div>

            <div className="grid gap-3">
              <p className="text-sm font-semibold">{t("constructionPage.setup.interiorTitle")}</p>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={setupForm.interiorDrywall}
                    onCheckedChange={() => setSetupForm((prev) => ({ ...prev, interiorDrywall: !prev.interiorDrywall }))}
                  />
                  {t("constructionPage.setup.interiorDrywall")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={setupForm.interiorPaint}
                    onCheckedChange={() => setSetupForm((prev) => ({ ...prev, interiorPaint: !prev.interiorPaint }))}
                  />
                  {t("constructionPage.setup.interiorPaint")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={setupForm.interiorFlooring}
                    onCheckedChange={() => setSetupForm((prev) => ({ ...prev, interiorFlooring: !prev.interiorFlooring }))}
                  />
                  {t("constructionPage.setup.interiorFlooring")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={setupForm.interiorInsulation}
                    onCheckedChange={() => setSetupForm((prev) => ({ ...prev, interiorInsulation: !prev.interiorInsulation }))}
                  />
                  {t("constructionPage.setup.interiorInsulation")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={setupForm.interiorElectrical}
                    onCheckedChange={() => setSetupForm((prev) => ({ ...prev, interiorElectrical: !prev.interiorElectrical }))}
                  />
                  {t("constructionPage.setup.interiorElectrical")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={setupForm.interiorHvac}
                    onCheckedChange={() => setSetupForm((prev) => ({ ...prev, interiorHvac: !prev.interiorHvac }))}
                  />
                  {t("constructionPage.setup.interiorHvac")}
                </label>
              </div>
              <div className="grid gap-2">
                <Label>{t("constructionPage.setup.interiorNotes")}</Label>
                <Textarea
                  value={setupForm.interiorNotes}
                  onChange={(event) => setSetupForm((prev) => ({ ...prev, interiorNotes: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-3">
              <p className="text-sm font-semibold">{t("constructionPage.setup.permitTitle")}</p>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label>{t("constructionPage.setup.permitStatus")}</Label>
                  <Select
                    value={setupForm.permitStatus}
                    onValueChange={(value) => setSetupForm((prev) => ({ ...prev, permitStatus: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("constructionPage.setup.permitStatus")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDIENTE">{t("constructionPage.setup.permitPending")}</SelectItem>
                      <SelectItem value="APROBADO">{t("constructionPage.setup.permitApproved")}</SelectItem>
                      <SelectItem value="RECHAZADO">{t("constructionPage.setup.permitRejected")}</SelectItem>
                      <SelectItem value="NO_REQUERIDO">{t("constructionPage.setup.permitNotRequired")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{t("constructionPage.setup.permitNumber")}</Label>
                  <Input
                    value={setupForm.permitNumber}
                    onChange={(event) => setSetupForm((prev) => ({ ...prev, permitNumber: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("constructionPage.setup.permitDate")}</Label>
                  <Input
                    type="date"
                    value={setupForm.permitDate}
                    onChange={(event) => setSetupForm((prev) => ({ ...prev, permitDate: event.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <p className="text-sm font-semibold">{t("constructionPage.setup.scheduleTitle")}</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>{t("constructionPage.setup.startDate")}</Label>
                  <Input
                    type="date"
                    value={setupForm.startDate}
                    onChange={(event) => setSetupForm((prev) => ({ ...prev, startDate: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("constructionPage.setup.estimatedCompletionDate")}</Label>
                  <Input
                    type="date"
                    value={setupForm.estimatedCompletionDate}
                    onChange={(event) => setSetupForm((prev) => ({ ...prev, estimatedCompletionDate: event.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <p className="text-sm font-semibold">{t("constructionPage.setup.teamTitle")}</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>{t("constructionPage.setup.contractor")}</Label>
                  <Input
                    value={setupForm.contractor}
                    onChange={(event) => setSetupForm((prev) => ({ ...prev, contractor: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("constructionPage.setup.projectManager")}</Label>
                  <Input
                    value={setupForm.projectManager}
                    onChange={(event) => setSetupForm((prev) => ({ ...prev, projectManager: event.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={setupForm.materialsOrdered}
                    onCheckedChange={() => setSetupForm((prev) => ({ ...prev, materialsOrdered: !prev.materialsOrdered }))}
                  />
                  {t("constructionPage.setup.materialsOrdered")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={setupForm.crewAssigned}
                    onCheckedChange={() => setSetupForm((prev) => ({ ...prev, crewAssigned: !prev.crewAssigned }))}
                  />
                  {t("constructionPage.setup.crewAssigned")}
                </label>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>{t("constructionPage.setup.notes")}</Label>
              <Textarea
                value={setupForm.notes}
                onChange={(event) => setSetupForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </div>

            <div className="grid gap-3 border-t border-border pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{t("constructionPage.materialOrder.title")}</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={generateMaterialOrder}>
                    {t("constructionPage.materialOrder.generate")}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={addMaterialOrderLine}>
                    {t("constructionPage.materialOrder.addLine")}
                  </Button>
                </div>
              </div>
              {materialOrderItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("constructionPage.materialOrder.empty")}</p>
              ) : (
                <div className="space-y-2">
                  {materialOrderItems.map((item) => (
                    <div key={item.id} className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr_auto] items-center">
                      <Input
                        value={item.name}
                        placeholder={t("constructionPage.materialOrder.itemName")}
                        onChange={(event) => updateMaterialOrderItem(item.id, { name: event.target.value })}
                      />
                      <Input
                        value={item.quantity}
                        placeholder={t("constructionPage.materialOrder.quantity")}
                        onChange={(event) => updateMaterialOrderItem(item.id, { quantity: event.target.value })}
                      />
                      <Input
                        value={item.unit}
                        placeholder={t("constructionPage.materialOrder.unit")}
                        onChange={(event) => updateMaterialOrderItem(item.id, { unit: event.target.value })}
                      />
                      <Input
                        value={item.notes}
                        placeholder={t("constructionPage.materialOrder.notes")}
                        onChange={(event) => updateMaterialOrderItem(item.id, { notes: event.target.value })}
                      />
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-xs">
                          <Checkbox
                            checked={item.required}
                            onCheckedChange={() => updateMaterialOrderItem(item.id, { required: !item.required })}
                          />
                          {t("constructionPage.materialOrder.required")}
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMaterialOrderItem(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid gap-2">
                <Label>{t("constructionPage.materialOrder.orderNotes")}</Label>
                <Textarea
                  value={materialOrderNotes}
                  onChange={(event) => setMaterialOrderNotes(event.target.value)}
                />
              </div>
              <Button
                type="button"
                onClick={handleSaveMaterialOrder}
                disabled={saveMaterialOrder.isPending || materialOrderItems.length === 0}
              >
                {saveMaterialOrder.isPending
                  ? t("constructionPage.materialOrder.saving")
                  : t("constructionPage.materialOrder.savePdf")}
              </Button>
            </div>

            {selectedProject?.clientId && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSetupOpen(false);
                  setLocation(`/clients/${selectedProject.clientId}`);
                }}
              >
                {t("constructionPage.actions.viewClient")}
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={updateProject.isPending}>
              {t("constructionPage.actions.saveDraft")}
            </Button>
            <Button type="button" onClick={handleStartConstruction} disabled={updateProject.isPending || !canStartConstruction}>
              {t("constructionPage.actions.startConstruction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
