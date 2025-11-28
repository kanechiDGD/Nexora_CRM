import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Check, ChevronsUpDown } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function NewActivityDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [formData, setFormData] = useState({
    activityType: "LLAMADA" as "LLAMADA" | "CORREO" | "VISITA" | "NOTA" | "DOCUMENTO" | "CAMBIO_ESTADO",
    subject: "",
    description: "",
    clientId: null as string | null,
    clientName: "",
  });

  const { data: clients } = trpc.clients.list.useQuery();
  const utils = trpc.useUtils();
  const createActivity = trpc.activityLogs.create.useMutation({
    onSuccess: () => {
      toast.success("Actividad registrada exitosamente");
      utils.activityLogs.getRecent.invalidate();
      setOpen(false);
      setFormData({
        activityType: "LLAMADA",
        subject: "",
        description: "",
        clientId: null,
        clientName: "",
      });
    },
    onError: (error) => {
      toast.error(`Error al registrar actividad: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject || !formData.description) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    createActivity.mutate({
      activityType: formData.activityType,
      subject: formData.subject,
      description: formData.description,
      clientId: formData.clientId,
      outcome: null,
      contactMethod: null,
      duration: null,
    });
  };

  const handleClientSelect = (clientId: string, clientName: string) => {
    setFormData({ ...formData, clientId, clientName });
    setClientSearchOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Actividad
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Registrar Nueva Actividad</DialogTitle>
            <DialogDescription>
              Registra una llamada, reunión, email o nota. El sistema guardará automáticamente quién realizó la actividad.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="user">Realizado por</Label>
              <Input
                id="user"
                value={user?.name || "Usuario"}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Se detecta automáticamente el usuario actual
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="activityType">Tipo de Actividad *</Label>
              <Select
                value={formData.activityType}
                onValueChange={(value) =>
                  setFormData({ ...formData, activityType: value as typeof formData.activityType })
                }
              >
                <SelectTrigger id="activityType">
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LLAMADA">Llamada</SelectItem>
                  <SelectItem value="CORREO">Email</SelectItem>
                  <SelectItem value="VISITA">Visita/Reunión</SelectItem>
                  <SelectItem value="NOTA">Nota</SelectItem>
                  <SelectItem value="DOCUMENTO">Documento</SelectItem>
                  <SelectItem value="CAMBIO_ESTADO">Cambio de Estado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Cliente (opcional)</Label>
              <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientSearchOpen}
                    className="justify-between"
                  >
                    {formData.clientName || "Buscar cliente..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Escribe el nombre del cliente..." />
                    <CommandList>
                      <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                      <CommandGroup>
                        {clients?.map((client: any) => (
                          <CommandItem
                            key={client.id}
                            value={`${client.firstName} ${client.lastName}`}
                            onSelect={() =>
                              handleClientSelect(
                                client.id,
                                `${client.firstName} ${client.lastName}`
                              )
                            }
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.clientId === client.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {client.firstName} {client.lastName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {client.phone || client.email || `ID: ${client.id}`}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Busca y selecciona un cliente o déjalo vacío para una actividad general
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="subject">Asunto *</Label>
              <Input
                id="subject"
                placeholder="Ej: Seguimiento de reclamo"
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descripción *</Label>
              <Textarea
                id="description"
                placeholder="Describe qué se habló, acordó o realizó..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createActivity.isPending}>
              {createActivity.isPending ? "Guardando..." : "Guardar Actividad"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
