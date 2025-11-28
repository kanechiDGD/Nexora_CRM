import { useState, useEffect } from "react";
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
import { Edit } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface EditEventDialogProps {
  event: any;
}

export function EditEventDialog({ event }: EditEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    eventType: event.eventType || "MEETING",
    title: event.title || "",
    description: event.description || "",
    eventDate: event.eventDate ? new Date(event.eventDate).toISOString().split('T')[0] : "",
    eventTime: event.eventTime || "",
    address: event.address || "",
    notes: event.notes || "",
  });

  const utils = trpc.useUtils();
  
  const updateEvent = trpc.events.update.useMutation({
    onSuccess: () => {
      toast.success("Evento actualizado exitosamente");
      utils.events.list.invalidate();
      setOpen(false);
    },
    onError: (error) => {
      toast.error(`Error al actualizar evento: ${error.message}`);
    },
  });

  useEffect(() => {
    if (open) {
      setFormData({
        eventType: event.eventType || "MEETING",
        title: event.title || "",
        description: event.description || "",
        eventDate: event.eventDate ? new Date(event.eventDate).toISOString().split('T')[0] : "",
        eventTime: event.eventTime || "",
        address: event.address || "",
        notes: event.notes || "",
      });
    }
  }, [open, event]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.eventDate) {
      toast.error("Título y fecha son requeridos");
      return;
    }

    updateEvent.mutate({
      id: event.id,
      eventType: formData.eventType as any,
      title: formData.title,
      description: formData.description || null,
      eventDate: new Date(formData.eventDate + (formData.eventTime ? `T${formData.eventTime}` : 'T00:00')),
      eventTime: formData.eventTime || null,
      address: formData.address || null,
      notes: formData.notes || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar Evento</DialogTitle>
            <DialogDescription>
              Actualiza los detalles del evento.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-eventType">Tipo de Evento</Label>
              <Select
                value={formData.eventType}
                onValueChange={(value) => setFormData({ ...formData, eventType: value })}
              >
                <SelectTrigger id="edit-eventType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEETING">Reunión</SelectItem>
                  <SelectItem value="ADJUSTMENT">Ajustación</SelectItem>
                  <SelectItem value="ESTIMATE">Estimado</SelectItem>
                  <SelectItem value="INSPECTION">Inspección</SelectItem>
                  <SelectItem value="APPOINTMENT">Cita</SelectItem>
                  <SelectItem value="DEADLINE">Fecha Límite</SelectItem>
                  <SelectItem value="OTHER">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-event-title">Título *</Label>
              <Input
                id="edit-event-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-eventDate">Fecha *</Label>
                <Input
                  id="edit-eventDate"
                  type="date"
                  value={formData.eventDate}
                  onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-eventTime">Hora</Label>
                <Input
                  id="edit-eventTime"
                  type="time"
                  value={formData.eventTime}
                  onChange={(e) => setFormData({ ...formData, eventTime: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-address">Dirección</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-event-description">Descripción</Label>
              <Textarea
                id="edit-event-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateEvent.isPending}>
              {updateEvent.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
