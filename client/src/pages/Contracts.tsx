import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileSignature, Download, Eye, Plus } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export default function Contracts() {
  // Datos de ejemplo - en el futuro se conectarán a la base de datos
  const contracts = [
    {
      id: 1,
      clientName: "Juan Pérez",
      contractType: "Contrato de Servicios",
      status: "Firmado",
      date: "2024-01-15",
      amount: 5000,
    },
    {
      id: 2,
      clientName: "María González",
      contractType: "Contrato de Ajuste",
      status: "Pendiente",
      date: "2024-01-20",
      amount: 3500,
    },
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      'Firmado': { variant: 'default', label: 'Firmado' },
      'Pendiente': { variant: 'secondary', label: 'Pendiente' },
      'Cancelado': { variant: 'destructive', label: 'Cancelado' },
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
            <h1 className="text-3xl font-bold text-foreground">Contratos</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona los contratos de tus clientes
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Contrato
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
                  <p className="text-sm text-muted-foreground">Total Contratos</p>
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
                  <p className="text-sm text-muted-foreground">Firmados</p>
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
                  <p className="text-sm text-muted-foreground">Pendientes</p>
                  <p className="text-2xl font-bold">1</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contracts List */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Lista de Contratos</CardTitle>
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
                      <p className="font-medium">{contract.contractType}</p>
                      <p className="text-sm text-muted-foreground">
                        Cliente: {contract.clientName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Fecha: {new Date(contract.date).toLocaleDateString('es-ES', {
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
                    No hay contratos registrados
                  </p>
                  <Button className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Primer Contrato
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card className="border-border bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">Información sobre Contratos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              • Los contratos se generan automáticamente cuando un cliente acepta los servicios
            </p>
            <p>
              • Puedes descargar contratos en formato PDF para impresión o envío por email
            </p>
            <p>
              • Los contratos firmados digitalmente tienen validez legal en Illinois
            </p>
            <p>
              • Todos los cambios en contratos quedan registrados en el log de auditoría
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
