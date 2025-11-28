import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Building2, Users, CheckCircle2, Copy, Download } from "lucide-react";

const BUSINESS_TYPES = [
  "Public Adjusters",
  "Insurance",
  "Real Estate",
  "Construction",
  "Legal",
  "Healthcare",
  "Other"
];

interface GeneratedUser {
  username: string;
  password: string;
  role: string;
}

export default function OnboardingWizard() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(2); // Empezar en paso 2 (usuario ya está logueado)

  // Step 2: Organization Info
  const [orgName, setOrgName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [logo, setLogo] = useState("");

  // Step 3: Users
  const [memberCount, setMemberCount] = useState(5);
  const [generatedUsers, setGeneratedUsers] = useState<GeneratedUser[]>([]);
  const [organizationId, setOrganizationId] = useState<number | null>(null);

  const createOrgMutation = trpc.organizations.create.useMutation({
    onSuccess: (data) => {
      setOrganizationId(data.organizationId);
      setGeneratedUsers(data.generatedUsers);
      setStep(3);
      toast.success("¡Organización creada exitosamente!");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleCreateOrganization = () => {
    if (!orgName.trim()) {
      toast.error("Por favor ingresa el nombre de la organización");
      return;
    }
    if (!businessType) {
      toast.error("Por favor selecciona el tipo de negocio");
      return;
    }

    createOrgMutation.mutate({
      name: orgName,
      businessType,
      logo: logo || null,
      memberCount,
    });
  };

  const handleCopyCredentials = () => {
    const text = generatedUsers
      .map((u) => `${u.username} | ${u.password} | ${u.role}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Credenciales copiadas al portapapeles");
  };

  const handleDownloadCSV = () => {
    const csv = [
      "Username,Password,Role",
      ...generatedUsers.map((u) => `${u.username},${u.password},${u.role}`),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${orgName.toLowerCase().replace(/\s+/g, "-")}-usuarios.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV descargado");
  };

  const handleFinish = () => {
    // Redirigir al login para que el usuario inicie sesión con sus credenciales
    setLocation("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Configuración Inicial</CardTitle>
          <CardDescription>
            Paso {step} de 3 - Configura tu organización
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 1: Welcome (Auto-skip, user already logged in) */}

          {/* Step 2: Organization Info */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Información de la Organización</h3>
                  <p className="text-sm text-muted-foreground">
                    Cuéntanos sobre tu empresa
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="orgName">Nombre de la Organización *</Label>
                  <Input
                    id="orgName"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Ej: Acme Public Adjusters"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="businessType">Tipo de Negocio *</Label>
                  <Select value={businessType} onValueChange={setBusinessType}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecciona el tipo de negocio" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="logo">Logo URL (Opcional)</Label>
                  <Input
                    id="logo"
                    value={logo}
                    onChange={(e) => setLogo(e.target.value)}
                    placeholder="https://ejemplo.com/logo.png"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Puedes agregar o cambiar el logo más tarde desde la configuración
                  </p>
                </div>

                <div>
                  <Label htmlFor="memberCount">Cantidad de Miembros del Equipo (1-20)</Label>
                  <Input
                    id="memberCount"
                    type="number"
                    min={1}
                    max={20}
                    value={memberCount}
                    onChange={(e) => setMemberCount(parseInt(e.target.value) || 1)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Incluye a todos los miembros que necesitarán acceso al CRM
                  </p>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" disabled>
                  Anterior
                </Button>
                <Button
                  onClick={handleCreateOrganization}
                  disabled={createOrgMutation.isPending}
                >
                  {createOrgMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    "Crear Organización"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Generated Users */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">¡Organización Creada!</h3>
                  <p className="text-sm text-muted-foreground">
                    Aquí están las credenciales de tus usuarios
                  </p>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Importante:</strong> Guarda estas credenciales en un lugar seguro.
                  No podrás verlas nuevamente después de cerrar esta ventana.
                </p>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-medium">Usuario</th>
                      <th className="text-left p-3 font-medium">Contraseña</th>
                      <th className="text-left p-3 font-medium">Rol</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedUsers.map((user, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-3 font-mono text-sm">{user.username}</td>
                        <td className="p-3 font-mono text-sm">{user.password}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${user.role === 'CO_ADMIN'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                            }`}>
                            {user.role === 'CO_ADMIN' ? 'Co-Admin' : 'Vendedor'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleCopyCredentials}
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Todo
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadCSV}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar CSV
                </Button>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleFinish} size="lg">
                  Ir al Login
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
