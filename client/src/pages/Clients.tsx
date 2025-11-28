import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Search, Plus, Eye } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation, useSearch } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";

export default function Clients() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const filterParam = searchParams.get('filter') || 'all';
  
  const [searchTerm, setSearchTerm] = useState("");

  // Obtener todos los clientes
  const { data: allClients, isLoading } = trpc.clients.list.useQuery();

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
          client => client.claimStatus === 'APROVADA' && client.primerCheque === 'OBTENIDO'
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

    // Aplicar búsqueda por texto
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(client => 
        `${client.firstName} ${client.lastName}`.toLowerCase().includes(term) ||
        client.email?.toLowerCase().includes(term) ||
        client.phone?.toLowerCase().includes(term) ||
        client.claimNumber?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [allClients, filterParam, searchTerm]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      'NO_SOMETIDA': { variant: 'outline', label: 'No Sometida' },
      'EN_PROCESO': { variant: 'secondary', label: 'En Proceso' },
      'APROVADA': { variant: 'default', label: 'Aprobada' },
      'RECHAZADA': { variant: 'destructive', label: 'Rechazada' },
      'CERRADA': { variant: 'outline', label: 'Cerrada' },
    };
    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getFilterTitle = () => {
    const titles: Record<string, string> = {
      'all': 'Todos los Clientes',
      'late-contact': 'Clientes con Contacto Atrasado',
      'not-supplemented': 'Clientes No Suplementados',
      'pending-submission': 'Reclamos Pendientes por Someter',
      'ready-construction': 'Clientes Listos para Construcción',
      'upcoming-contacts': 'Próximos Contactos',
    };
    return titles[filterParam] || 'Clientes';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{getFilterTitle()}</h1>
            <p className="text-muted-foreground mt-2">
              {filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''} encontrado{filteredClients.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={() => setLocation('/clients/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Cliente
          </Button>
        </div>

        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, email, teléfono o número de reclamo..."
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
                Cargando clientes...
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron clientes
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Aseguradora</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Suplementado</TableHead>
                    <TableHead>Último Contacto</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
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
                          {client.suplementado === 'si' ? 'Sí' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {client.lastContactDate 
                          ? new Date(client.lastContactDate).toLocaleDateString('es-ES')
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
