import { useMemo, useState, type ChangeEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { ChevronDown, Eye, Plus, Search, Upload } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useLocation, useSearch } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { useTranslation } from "react-i18next";
import { getClaimStatusDisplayName } from "@/utils/claimStatus";

type ImportError = { row: number; message: string };

type ClientImportRow = {
  rowNumber?: number;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  propertyAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  propertyType?: string | null;
  insuranceCompany?: string | null;
  policyNumber?: string | null;
  claimNumber?: string | null;
  deductible?: number | null;
  coverageAmount?: number | null;
  claimStatus?: string | null;
  suplementado?: "si" | "no";
  primerCheque?: "OBTENIDO" | "PENDIENTE";
  dateOfLoss?: Date | null;
  claimSubmittedDate?: Date | null;
  scheduledVisit?: Date | null;
  adjustmentDate?: Date | null;
  lastContactDate?: Date | null;
  nextContactDate?: Date | null;
  salesPerson?: string | null;
  assignedAdjuster?: string | null;
  damageType?: string | null;
  damageDescription?: string | null;
  estimatedLoss?: number | null;
  insuranceEstimate?: number | null;
  firstCheckAmount?: number | null;
  actualPayout?: number | null;
  notes?: string | null;
  internalNotes?: string | null;
  constructionStatus?: string | null;
};

const CLIENT_IMPORT_HEADER_MAP: Record<string, keyof ClientImportRow | "fullName"> = {
  firstname: "firstName",
  nombre: "firstName",
  nombres: "firstName",
  lastname: "lastName",
  apellido: "lastName",
  apellidos: "lastName",
  fullname: "fullName",
  nombrecompleto: "fullName",
  name: "fullName",
  email: "email",
  correo: "email",
  correoelectronico: "email",
  phone: "phone",
  telefono: "phone",
  numero: "phone",
  numerodetelefono: "phone",
  celular: "phone",
  mobile: "phone",
  alternatephone: "alternatePhone",
  telefonoalterno: "alternatePhone",
  telefonoalternativo: "alternatePhone",
  address: "propertyAddress",
  direccion: "propertyAddress",
  propertyaddress: "propertyAddress",
  city: "city",
  ciudad: "city",
  state: "state",
  estado: "state",
  zipcode: "zipCode",
  zip: "zipCode",
  codigopostal: "zipCode",
  postalcode: "zipCode",
  propertytype: "propertyType",
  tipodepropiedad: "propertyType",
  insurancecompany: "insuranceCompany",
  aseguradora: "insuranceCompany",
  companiaaseguradora: "insuranceCompany",
  policynumber: "policyNumber",
  numerodepoliza: "policyNumber",
  claimnumber: "claimNumber",
  numerodereclamo: "claimNumber",
  claimstatus: "claimStatus",
  estatus: "claimStatus",
  status: "claimStatus",
  estadoreclamo: "claimStatus",
  suplementado: "suplementado",
  supplemented: "suplementado",
  primercheque: "primerCheque",
  firstcheck: "primerCheque",
  dateofloss: "dateOfLoss",
  fechadeperdida: "dateOfLoss",
  claimsubmitteddate: "claimSubmittedDate",
  fechasometida: "claimSubmittedDate",
  scheduledvisit: "scheduledVisit",
  visitaprogramada: "scheduledVisit",
  adjustmentdate: "adjustmentDate",
  fechadeajuste: "adjustmentDate",
  lastcontactdate: "lastContactDate",
  ultimocontacto: "lastContactDate",
  nextcontactdate: "nextContactDate",
  proximocontacto: "nextContactDate",
  salesperson: "salesPerson",
  vendedor: "salesPerson",
  assignedadjuster: "assignedAdjuster",
  ajustadorasignado: "assignedAdjuster",
  damagetype: "damageType",
  tipodedano: "damageType",
  damagedescription: "damageDescription",
  descripciondedano: "damageDescription",
  estimatedloss: "estimatedLoss",
  perdidaestimada: "estimatedLoss",
  insuranceestimate: "insuranceEstimate",
  estimadoaseguradora: "insuranceEstimate",
  firstcheckamount: "firstCheckAmount",
  montoprimercheque: "firstCheckAmount",
  actualpayout: "actualPayout",
  pagoreal: "actualPayout",
  notes: "notes",
  notas: "notes",
  internalnotes: "internalNotes",
  notasinternas: "internalNotes",
  constructionstatus: "constructionStatus",
  estadoconstruccion: "constructionStatus",
  deductible: "deductible",
  deducible: "deductible",
  coverageamount: "coverageAmount",
  montocobertura: "coverageAmount",
};

const CLIENT_IMPORT_NUMBER_FIELDS = new Set<keyof ClientImportRow>([
  "deductible",
  "coverageAmount",
  "estimatedLoss",
  "insuranceEstimate",
  "firstCheckAmount",
  "actualPayout",
]);

const CLIENT_IMPORT_DATE_FIELDS = new Set<keyof ClientImportRow>([
  "dateOfLoss",
  "claimSubmittedDate",
  "scheduledVisit",
  "adjustmentDate",
  "lastContactDate",
  "nextContactDate",
]);

const normalizeHeader = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const parseNumberValue = (value: unknown) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/[$,]/g, "").trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseDateValue = (value: unknown) => {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const normalizeSuplementado = (value: unknown): "si" | "no" | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (["si", "yes", "y"].includes(normalized)) return "si";
  if (["no", "n"].includes(normalized)) return "no";
  return undefined;
};

const normalizePrimerCheque = (value: unknown): "OBTENIDO" | "PENDIENTE" | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (["obtenido", "recibido", "received"].includes(normalized)) return "OBTENIDO";
  if (["pendiente", "pending"].includes(normalized)) return "PENDIENTE";
  return undefined;
};

const normalizeLookupKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const DEFAULT_CLAIM_STATUSES = new Set([
  "NO_SOMETIDA",
  "SOMETIDA",
  "AJUSTACION_PROGRAMADA",
  "AJUSTACION_TERMINADA",
  "EN_PROCESO",
  "APROVADA",
  "LISTA_PARA_CONSTRUIR",
  "RECHAZADA",
  "CERRADA",
]);

const CLAIM_STATUS_MAP: Record<string, string> = {
  "no sometida": "NO_SOMETIDA",
  "no sometido": "NO_SOMETIDA",
  "no presentada": "NO_SOMETIDA",
  "no presentado": "NO_SOMETIDA",
  "not submitted": "NO_SOMETIDA",
  "not filed": "NO_SOMETIDA",
  "unsubmitted": "NO_SOMETIDA",
  sometida: "SOMETIDA",
  sometido: "SOMETIDA",
  presentada: "SOMETIDA",
  presentado: "SOMETIDA",
  submitted: "SOMETIDA",
  filed: "SOMETIDA",
  "ajustacion programada": "AJUSTACION_PROGRAMADA",
  "ajuste programado": "AJUSTACION_PROGRAMADA",
  "adjustment scheduled": "AJUSTACION_PROGRAMADA",
  "scheduled adjustment": "AJUSTACION_PROGRAMADA",
  "ajustacion terminada": "AJUSTACION_TERMINADA",
  "ajuste terminado": "AJUSTACION_TERMINADA",
  "ajuste completado": "AJUSTACION_TERMINADA",
  "adjustment completed": "AJUSTACION_TERMINADA",
  "adjustment done": "AJUSTACION_TERMINADA",
  "en proceso": "EN_PROCESO",
  "en progreso": "EN_PROCESO",
  "in process": "EN_PROCESO",
  "in progress": "EN_PROCESO",
  aprobada: "APROVADA",
  aprovado: "APROVADA",
  aprobados: "APROVADA",
  approved: "APROVADA",
  "lista para construir": "LISTA_PARA_CONSTRUIR",
  "ready for construction": "LISTA_PARA_CONSTRUIR",
  "ready to build": "LISTA_PARA_CONSTRUIR",
  "ready for build": "LISTA_PARA_CONSTRUIR",
  construction: "LISTA_PARA_CONSTRUIR",
  construccion: "LISTA_PARA_CONSTRUIR",
  rechazada: "RECHAZADA",
  rechazado: "RECHAZADA",
  denied: "RECHAZADA",
  rejected: "RECHAZADA",
  declined: "RECHAZADA",
  cerrada: "CERRADA",
  cerrado: "CERRADA",
  closed: "CERRADA",
};

const CONSTRUCTION_STATUS_MAP: Record<string, string> = {
  pendiente: "PENDING",
  pending: "PENDING",
  "en progreso": "IN_PROGRESS",
  "en proceso": "IN_PROGRESS",
  "in progress": "IN_PROGRESS",
  completado: "COMPLETED",
  completada: "COMPLETED",
  terminado: "COMPLETED",
  terminada: "COMPLETED",
  completed: "COMPLETED",
  done: "COMPLETED",
  "en pausa": "ON_HOLD",
  pausado: "ON_HOLD",
  pausada: "ON_HOLD",
  "en espera": "ON_HOLD",
  "on hold": "ON_HOLD",
  onhold: "ON_HOLD",
  hold: "ON_HOLD",
};

const normalizeClaimStatus = (
  value: unknown,
  customStatuses: Array<{ name: string; displayName?: string | null }>
) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const normalized = normalizeLookupKey(trimmed);
  if (!normalized) return undefined;

  const directCode = normalized.replace(/\s+/g, "_").toUpperCase();
  if (DEFAULT_CLAIM_STATUSES.has(directCode)) return directCode;

  const mapped = CLAIM_STATUS_MAP[normalized];
  if (mapped) return mapped;

  const customMatch = customStatuses.find((status) => {
    const nameKey = normalizeLookupKey(status.name);
    const displayKey = status.displayName ? normalizeLookupKey(status.displayName) : "";
    return normalized === nameKey || (displayKey && normalized === displayKey);
  });
  if (customMatch) return customMatch.name;

  return trimmed;
};

const normalizeConstructionStatus = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const normalized = normalizeLookupKey(trimmed);
  if (!normalized) return undefined;
  const directCode = normalized.replace(/\s+/g, "_").toUpperCase();
  if (["PENDING", "IN_PROGRESS", "COMPLETED", "ON_HOLD"].includes(directCode)) {
    return directCode;
  }
  return CONSTRUCTION_STATUS_MAP[normalized] ?? trimmed;
};

const coerceImportValue = (field: keyof ClientImportRow, value: unknown) => {
  if (value === null || value === undefined) return undefined;

  if (field === "suplementado") return normalizeSuplementado(value);
  if (field === "primerCheque") return normalizePrimerCheque(value);

  if (CLIENT_IMPORT_NUMBER_FIELDS.has(field)) {
    return parseNumberValue(value);
  }

  if (CLIENT_IMPORT_DATE_FIELDS.has(field)) {
    return parseDateValue(value);
  }

  if (typeof value === "number") {
    return value.toString();
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  return value;
};

const buildImportRows = (rows: Array<Record<string, unknown>>) =>
  rows
    .map((row, index) => {
      const result: ClientImportRow = { rowNumber: index + 2 };
      let fullName: string | undefined;

      Object.entries(row).forEach(([key, value]) => {
        const normalizedKey = normalizeHeader(key);
        const mappedKey = CLIENT_IMPORT_HEADER_MAP[normalizedKey];

        if (!mappedKey) return;

        if (mappedKey === "fullName") {
          if (typeof value === "string" && value.trim()) {
            fullName = value.trim();
          }
          return;
        }

        const coerced = coerceImportValue(mappedKey, value);
        if (coerced !== undefined) {
          result[mappedKey] = coerced as never;
        }
      });

      if (fullName && (!result.firstName || !result.lastName)) {
        const parts = fullName.split(/\s+/).filter(Boolean);
        if (parts.length > 1) {
          if (!result.firstName) {
            result.firstName = parts.slice(0, -1).join(" ");
          }
          if (!result.lastName) {
            result.lastName = parts[parts.length - 1];
          }
        } else if (parts.length === 1) {
          if (!result.firstName) {
            result.firstName = parts[0];
          }
          if (!result.lastName) {
            result.lastName = "Non";
          }
        }
      }

      return result;
    })
    .filter((row) => {
      const { rowNumber: _rowNumber, ...rest } = row;
      return Object.values(rest).some((value) => value !== undefined && value !== null && value !== "");
    });

export default function Clients() {
  const { t, i18n } = useTranslation();
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const filterParam = searchParams.get('filter') || 'all';
  
  const [searchTerm, setSearchTerm] = useState("");

  const utils = trpc.useUtils();
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [importSummary, setImportSummary] = useState<{ created: number; failed: number } | null>(null);
  const [nameSort, setNameSort] = useState<"none" | "asc" | "desc">("none");
  const [statusSort, setStatusSort] = useState<"none" | "asc" | "desc">("none");
  const [insuranceSort, setInsuranceSort] = useState<"none" | "asc" | "desc">("none");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplementedFilter, setSupplementedFilter] = useState("all");
  const bulkImportMutation = trpc.clients.bulkImport.useMutation();
  const deleteAllMutation = trpc.clients.deleteAll.useMutation();
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const isImporting = importing || bulkImportMutation.isPending;


  // Obtener todos los clientes
  const { data: allClients, isLoading } = trpc.clients.list.useQuery(undefined, {
    refetchOnMount: "always",
  });
  const { data: customStatuses = [] } = trpc.customClaimStatuses.list.useQuery();

  const getStatusDisplayName = (status: string) =>
    getClaimStatusDisplayName(status, {
      t,
      language: i18n.language,
      customStatuses,
    });

  const statusOptions = useMemo(() => {
    const defaultStatuses = [
      "NO_SOMETIDA",
      "SOMETIDA",
      "AJUSTACION_PROGRAMADA",
      "AJUSTACION_TERMINADA",
      "EN_PROCESO",
      "APROVADA",
      "LISTA_PARA_CONSTRUIR",
      "RECHAZADA",
      "CERRADA",
    ];
    const options = defaultStatuses.map(status => ({
      value: status,
      label: getStatusDisplayName(status),
    }));

    customStatuses.forEach((customStatus: any) => {
      const value = customStatus.name;
      if (options.some(option => option.value === value)) return;
      options.push({
        value,
        label: customStatus.displayName || getStatusDisplayName(value),
      });
    });

    options.sort((a, b) =>
      a.label.localeCompare(b.label, i18n.language, { sensitivity: "base" })
    );

    return options;
  }, [customStatuses, i18n.language, t]);

  // Filtrar clientes según el parámetro de filtro
  const filteredClients = useMemo(() => {
    if (!allClients) return [];

    let filtered = [...allClients];

    // Aplicar filtro de KPI
    switch (filterParam) {
      case 'late-contact':
        filtered = filtered.filter(client => {
          if (!client.lastContactDate) return false;
          const daysSince = Math.floor(
            (Date.now() - new Date(client.lastContactDate).getTime()) / (1000 * 60 * 60 * 24)
          );
          return daysSince > 7;
        });
        break;
      case 'not-supplemented':
        filtered = filtered.filter(client => client.suplementado === 'no');
        break;
      case 'pending-submission':
        filtered = filtered.filter(client => client.claimStatus === 'NO_SOMETIDA');
        break;
      case 'ready-construction':
        filtered = filtered.filter(
          client => client.claimStatus === 'LISTA_PARA_CONSTRUIR'
        );
        break;
      case 'upcoming-contacts':
        filtered = filtered.filter(client => {
          if (!client.nextContactDate) return false;
          const daysUntil = Math.floor(
            (new Date(client.nextContactDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          return daysUntil >= 0 && daysUntil <= 7;
        });
        break;
      default:
        // 'all' - no filter
        break;
    }

    // Aplicar busqueda por texto
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(client => 
        `${client.firstName} ${client.lastName}`.toLowerCase().includes(term) ||
        client.email?.toLowerCase().includes(term) ||
        client.phone?.toLowerCase().includes(term) ||
        client.claimNumber?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(client => (client.claimStatus || "NO_SOMETIDA") === statusFilter);
    }

    if (supplementedFilter !== "all") {
      const expected = supplementedFilter === "yes" ? "si" : "no";
      filtered = filtered.filter(client => client.suplementado === expected);
    }

    if (nameSort !== "none") {
      filtered.sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`.trim();
        const nameB = `${b.firstName} ${b.lastName}`.trim();
        const comparison = nameA.localeCompare(nameB, i18n.language, { sensitivity: "base" });
        return nameSort === "asc" ? comparison : -comparison;
      });
    }

    if (insuranceSort !== "none") {
      filtered.sort((a, b) => {
        const insuranceA = a.insuranceCompany || "";
        const insuranceB = b.insuranceCompany || "";
        const comparison = insuranceA.localeCompare(insuranceB, i18n.language, { sensitivity: "base" });
        return insuranceSort === "asc" ? comparison : -comparison;
      });
    }

    if (statusSort !== "none") {
      filtered.sort((a, b) => {
        const statusA = getStatusDisplayName(a.claimStatus || "NO_SOMETIDA");
        const statusB = getStatusDisplayName(b.claimStatus || "NO_SOMETIDA");
        const comparison = statusA.localeCompare(statusB, i18n.language, { sensitivity: "base" });
        return statusSort === "asc" ? comparison : -comparison;
      });
    }

    return filtered;
  }, [
    allClients,
    filterParam,
    searchTerm,
    nameSort,
    statusSort,
    insuranceSort,
    i18n.language,
    customStatuses,
    statusFilter,
    supplementedFilter,
  ]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" }> = {
      'NO_SOMETIDA': { variant: 'outline' },
      'SOMETIDA': { variant: 'outline' },
      'AJUSTACION_PROGRAMADA': { variant: 'outline' },
      'AJUSTACION_TERMINADA': { variant: 'secondary' },
      'EN_PROCESO': { variant: 'secondary' },
      'APROVADA': { variant: 'default' },
      'LISTA_PARA_CONSTRUIR': { variant: 'default' },
      'RECHAZADA': { variant: 'destructive' },
      'CERRADA': { variant: 'outline' },
    };
    const config = variants[status] || { variant: 'outline' };
    return <Badge variant={config.variant}>{getStatusDisplayName(status)}</Badge>;
  };

  const getFilterTitle = () => {
    const titles: Record<string, string> = {
      'all': t('dashboard.kpis.totalClients.title'),
      'late-contact': t('dashboard.kpis.lateContact.title'),
      'not-supplemented': t('dashboard.kpis.notSupplemented.title'),
      'pending-submission': t('dashboard.kpis.pendingSubmission.title'),
      'ready-construction': t('dashboard.kpis.readyConstruction.title'),
      'upcoming-contacts': t('dashboard.kpis.upcomingContacts.title'),
    };
    return titles[filterParam] || t('dashboard.menu.clients');
  };

  const handleImportClose = (open: boolean) => {
    setImportOpen(open);
    if (!open) {
      setImportErrors([]);
      setImportSummary(null);
      setImporting(false);
    }
  };

  const handleImportFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setImportErrors([]);
    setImportSummary(null);
    setImporting(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        toast.error(t("clients.import.noRows"));
        return;
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        workbook.Sheets[sheetName],
        { defval: "" }
      );

      if (!rows.length) {
        toast.error(t("clients.import.noRows"));
        return;
      }

      const payloadRows = buildImportRows(rows);

      if (!payloadRows.length) {
        toast.error(t("clients.import.noRows"));
        return;
      }

      const normalizedRows = payloadRows.map((row) => {
        const next = { ...row };
        if (next.claimStatus) {
          next.claimStatus = normalizeClaimStatus(next.claimStatus, customStatuses);
        }
        if (next.constructionStatus) {
          next.constructionStatus = normalizeConstructionStatus(next.constructionStatus);
        }
        return next;
      });

      const result = await bulkImportMutation.mutateAsync({ rows: normalizedRows });

      setImportSummary({ created: result.created, failed: result.errors.length });
      setImportErrors(result.errors);

      if (result.created > 0) {
        toast.success(t("clients.import.success", { count: result.created }));
      }
      if (result.errors.length > 0) {
        toast.error(t("clients.import.partial", { count: result.errors.length }));
      }

      utils.clients.list.invalidate();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(t("clients.import.error", { message }));
    } finally {
      setImporting(false);
      input.value = "";
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllMutation.mutateAsync();
      toast.success(t("clients.deleteAll.success"));
      utils.clients.list.invalidate();
      setDeleteAllOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(t("clients.deleteAll.error", { message }));
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{getFilterTitle()}</h1>
            <p className="text-muted-foreground mt-2">
              {filteredClients.length} {filteredClients.length === 1 ? t('clients.clientFound') : t('clients.clientsFound')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)} disabled={isImporting}>
              <Upload className="mr-2 h-4 w-4" />
              {t('clients.import.button')}
            </Button>
            <Button variant="destructive" onClick={() => setDeleteAllOpen(true)} disabled={deleteAllMutation.isPending}>
              {t('clients.deleteAll.button')}
            </Button>
            <Button onClick={() => setLocation('/clients/new')}>
              <Plus className="mr-2 h-4 w-4" />
              {t('clients.newClient')}
            </Button>
          </div>
        </div>

        <Dialog open={importOpen} onOpenChange={handleImportClose}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('clients.import.title')}</DialogTitle>
              <DialogDescription>{t('clients.import.description')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="inline-flex">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleImportFileChange}
                    disabled={isImporting}
                    className="sr-only"
                  />
                  <span className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50">
                    {t('clients.import.chooseFile')}
                  </span>
                </label>
                <p className="text-sm text-muted-foreground">{t('clients.import.help')}</p>
              </div>
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                <p className="font-medium">{t('clients.import.headersTitle')}</p>
                <p className="text-muted-foreground">{t('clients.import.headers')}</p>
              </div>
              {isImporting && (
                <p className="text-sm text-muted-foreground">{t('clients.import.processing')}</p>
              )}
              {importSummary && (
                <div className="rounded-md border border-border p-3 text-sm">
                  <p className="font-medium">{t('clients.import.success', { count: importSummary.created })}</p>
                  {importSummary.failed > 0 && (
                    <p className="text-muted-foreground">{t('clients.import.partial', { count: importSummary.failed })}</p>
                  )}
                </div>
              )}
              {importErrors.length > 0 && (
                <div className="rounded-md border border-border p-3 text-sm">
                  <p className="font-medium">{t('clients.import.errorsTitle')}</p>
                  <div className="mt-2 max-h-40 space-y-1 overflow-auto text-muted-foreground">
                    {importErrors.map((error, index) => (
                      <div key={`${error.row}-${index}`}>
                        {t('clients.import.errorRow', { row: error.row, message: error.message })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setImportOpen(false)}>
                {t('clients.import.close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('clients.deleteAll.title')}</DialogTitle>
              <DialogDescription>{t('clients.deleteAll.description')}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteAllOpen(false)} disabled={deleteAllMutation.isPending}>
                {t('clients.deleteAll.cancel')}
              </Button>
              <Button variant="destructive" onClick={handleDeleteAll} disabled={deleteAllMutation.isPending}>
                {deleteAllMutation.isPending ? t('clients.deleteAll.deleting') : t('clients.deleteAll.confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card className="border-border">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('clients.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('common.loading')}
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('clients.noClientsFound')}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <span>{t('clients.table.name')}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                              aria-label={t('clients.sort.name')}
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuLabel>{t('clients.menu.sort')}</DropdownMenuLabel>
                            <DropdownMenuRadioGroup
                              value={nameSort}
                              onValueChange={(value) => setNameSort(value as "none" | "asc" | "desc")}
                            >
                              <DropdownMenuRadioItem value="none">{t('clients.sort.none')}</DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="asc">{t('clients.sort.asc')}</DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="desc">{t('clients.sort.desc')}</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableHead>
                    <TableHead>{t('clients.table.contact')}</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <span>{t('clients.table.insurance')}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                              aria-label={t('clients.sort.insurance')}
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuLabel>{t('clients.menu.sort')}</DropdownMenuLabel>
                            <DropdownMenuRadioGroup
                              value={insuranceSort}
                              onValueChange={(value) => setInsuranceSort(value as "none" | "asc" | "desc")}
                            >
                              <DropdownMenuRadioItem value="none">{t('clients.sort.none')}</DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="asc">{t('clients.sort.asc')}</DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="desc">{t('clients.sort.desc')}</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <span>{t('clients.table.status')}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                              aria-label={t('clients.filters.status')}
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuLabel>{t('clients.menu.filter')}</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
                              <DropdownMenuRadioItem value="all">
                                {t('clients.filters.statusAll')}
                              </DropdownMenuRadioItem>
                              {statusOptions.map((option) => (
                                <DropdownMenuRadioItem key={option.value} value={option.value}>
                                  {option.label}
                                </DropdownMenuRadioItem>
                              ))}
                            </DropdownMenuRadioGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>{t('clients.menu.sort')}</DropdownMenuLabel>
                            <DropdownMenuRadioGroup
                              value={statusSort}
                              onValueChange={(value) => setStatusSort(value as "none" | "asc" | "desc")}
                            >
                              <DropdownMenuRadioItem value="none">{t('clients.sort.none')}</DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="asc">{t('clients.sort.asc')}</DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="desc">{t('clients.sort.desc')}</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <span>{t('clients.table.supplemented')}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                              aria-label={t('clients.filters.supplemented')}
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuLabel>{t('clients.menu.filter')}</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={supplementedFilter} onValueChange={setSupplementedFilter}>
                              <DropdownMenuRadioItem value="all">{t('clients.filters.all')}</DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="yes">{t('common.yes')}</DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="no">{t('common.no')}</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableHead>
                    <TableHead>{t('clients.table.lastContact')}</TableHead>
                    <TableHead className="text-right">{t('clients.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow 
                      key={client.id}
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => setLocation(`/clients/${client.id.toString()}`)}
                    >
                      <TableCell className="font-medium">
                        {client.firstName} {client.lastName}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {client.phone && <div>{client.phone}</div>}
                          {client.email && <div className="text-muted-foreground">{client.email}</div>}
                        </div>
                      </TableCell>
                      <TableCell>{client.insuranceCompany || '-'}</TableCell>
                      <TableCell>{getStatusBadge(client.claimStatus || 'NO_SOMETIDA')}</TableCell>
                      <TableCell>
                        <Badge variant={client.suplementado === 'si' ? 'default' : 'outline'}>
                          {client.suplementado === 'si' ? t('common.yes') : t('common.no')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {client.lastContactDate 
                          ? new Date(client.lastContactDate).toLocaleDateString(i18n.language)
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLocation(`/clients/${client.id.toString()}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
