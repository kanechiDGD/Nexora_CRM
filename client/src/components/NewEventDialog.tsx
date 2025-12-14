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
import { Plus, Check, ChevronsUpDown, Calendar } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function NewEventDialog() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [formData, setFormData] = useState({
    eventType: "MEETING" as "MEETING" | "ADJUSTMENT" | "ESTIMATE" | "INSPECTION" | "APPOINTMENT" | "DEADLINE" | "OTHER",
    title: "",
    description: "",
    eventDate: "",
    eventTime: "",
    endTime: "",
    address: "",
    clientId: null as string | null,
    clientName: "",
    // Campos específicos para ajustaciones
    adjusterNumber: "",
    adjusterName: "",
    adjusterPhone: "",
    adjusterEmail: "",
    insuranceCompany: "",
    claimNumber: "",
    notes: "",
  });

  const { data: clients } = trpc.clients.list.useQuery();
  const utils = trpc.useUtils();
  
  const createEvent = trpc.events.create.useMutation({
    onSuccess: () => {
      toast.success("Evento creado exitosamente y sincronizado con el calendario");
      utils.events.list.invalidate();
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Error al crear evento: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      eventType: "MEETING",
      title: "",
      description: "",
      eventDate: "",
      eventTime: "",
      endTime: "",
      address: "",
      clientId: null,
      clientName: "",
      adjusterNumber: "",
      adjusterName: "",
      adjusterPhone: "",
      adjusterEmail: "",
      insuranceCompany: "",
      claimNumber: "",
      notes: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.eventDate) {
      toast.error("Por favor completa los campos requeridos (Título y Fecha)");
      return;
    }

    createEvent.mutate({
      eventType: formData.eventType,
      title: formData.title,
      description: formData.description || null,
      eventDate: new Date(formData.eventDate + (formData.eventTime ? `T${formData.eventTime}` : 'T00:00')),
      eventTime: formData.eventTime || null,
      endTime: formData.endTime || null,
      address: formData.address || null,
      clientId: formData.clientId,
      adjusterNumber: formData.adjusterNumber || null,
      adjusterName: formData.adjusterName || null,
      adjusterPhone: formData.adjusterPhone || null,
      adjusterEmail: formData.adjusterEmail || null,
      insuranceCompany: formData.insuranceCompany || null,
      claimNumber: formData.claimNumber || null,
      notes: formData.notes || null,
    });
  };

  const handleClientSelect = (clientId: string, clientName: string) => {
    setFormData({ ...formData, clientId, clientName });
    setClientSearchOpen(false);
  };

  const isAdjustment = formData.eventType === "ADJUSTMENT";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {t('calendar.newEvent.button')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t('calendar.newEvent.title')}
            </DialogTitle>
            <DialogDescription>
              {t('calendar.newEvent.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="eventType">{t('calendar.newEvent.type')} *</Label>
              <Select
                value={formData.eventType}
                onValueChange={(value) =>
                  setFormData({ ...formData, eventType: value as typeof formData.eventType })
                }
              >
                <SelectTrigger id="eventType">
                  <SelectValue placeholder={t('calendar.newEvent.selectType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEETING">{t('calendar.newEvent.types.MEETING')}</SelectItem>
                  <SelectItem value="ADJUSTMENT">{t('calendar.newEvent.types.ADJUSTMENT')}</SelectItem>
                  <SelectItem value="ESTIMATE">{t('calendar.newEvent.types.ESTIMATE')}</SelectItem>
                  <SelectItem value="INSPECTION">{t('calendar.newEvent.types.INSPECTION')}</SelectItem>
                  <SelectItem value="APPOINTMENT">{t('calendar.newEvent.types.APPOINTMENT')}</SelectItem>
                  <SelectItem value="DEADLINE">{t('calendar.newEvent.types.DEADLINE')}</SelectItem>
                  <SelectItem value="OTHER">{t('calendar.newEvent.types.OTHER')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="title">{t('calendar.newEvent.eventTitle')} *</Label>
              <Input
                id="title"
                placeholder={t('calendar.newEvent.titlePlaceholder')}
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label>{t('calendar.newEvent.relatedClient')}</Label>
              <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientSearchOpen}
                    className="justify-between"
                  >
                    {formData.clientName || t('calendar.newEvent.searchClient')}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0">
                  <Command>
                    <CommandInput placeholder={t('calendar.newEvent.searchClient')} />
                    <CommandList>
                      <CommandEmpty>No clients found.</CommandEmpty>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="eventDate">{t('calendar.newEvent.date')} *</Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={formData.eventDate}
                  onChange={(e) =>
                    setFormData({ ...formData, eventDate: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="eventTime">{t('calendar.newEvent.time')}</Label>
                <Input
                  id="eventTime"
                  type="time"
                  value={formData.eventTime}
                  onChange={(e) =>
                    setFormData({ ...formData, eventTime: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">{t('calendar.newEvent.address')}</Label>
              <Input
                id="address"
                placeholder={t('calendar.newEvent.addressPlaceholder')}
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>

            {/* Campos específicos para ajustaciones */}
            {isAdjustment && (
              <div className="border-t pt-4 mt-2 space-y-4">
                <h3 className="font-semibold text-lg">{t('calendar.newEvent.adjustmentInfo')}</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="adjusterNumber">{t('calendar.newEvent.adjusterNumber')}</Label>
                    <Input
                      id="adjusterNumber"
                      value={formData.adjusterNumber}
                      onChange={(e) => setFormData({ ...formData, adjusterNumber: e.target.value })}
                      placeholder="Ej: ADJ-12345"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="adjusterName">{t('calendar.newEvent.adjusterName')}</Label>
                    <Input
                      id="adjusterName"
                      value={formData.adjusterName}
                      onChange={(e) => setFormData({ ...formData, adjusterName: e.target.value })}
                      placeholder="Nombre completo"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="adjusterPhone">{t('calendar.newEvent.adjusterPhone')}</Label>
                    <Input
                      id="adjusterPhone"
                      value={formData.adjusterPhone}
                      onChange={(e) => setFormData({ ...formData, adjusterPhone: e.target.value })}
                      placeholder="(123) 456-7890"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="adjusterEmail">{t('calendar.newEvent.adjusterEmail')}</Label>
                    <Input
                      id="adjusterEmail"
                      type="email"
                      value={formData.adjusterEmail}
                      onChange={(e) => setFormData({ ...formData, adjusterEmail: e.target.value })}
                      placeholder="email@ejemplo.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="insuranceCompany">{t('calendar.newEvent.insuranceCompany')}</Label>
                    <Input
                      id="insuranceCompany"
                      value={formData.insuranceCompany}
                      onChange={(e) => setFormData({ ...formData, insuranceCompany: e.target.value })}
                      placeholder="Nombre de la aseguradora"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="claimNumber">{t('calendar.newEvent.claimNumber')}</Label>
                    <Input
                      id="claimNumber"
                      value={formData.claimNumber}
                      onChange={(e) => setFormData({ ...formData, claimNumber: e.target.value })}
                      placeholder="CLM-12345"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="description">{t('calendar.newEvent.notes')}</Label>
              <Textarea
                id="description"
                placeholder={t('calendar.newEvent.notesPlaceholder')}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {t('calendar.newEvent.cancel')}
            </Button>
            <Button type="submit" disabled={createEvent.isPending}>
              {createEvent.isPending ? t('calendar.newEvent.saving') : t('calendar.newEvent.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
