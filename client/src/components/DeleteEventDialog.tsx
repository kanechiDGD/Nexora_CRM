import { useState } from "react";
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
import { Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface DeleteEventDialogProps {
  event: any;
}

export function DeleteEventDialog({ event }: DeleteEventDialogProps) {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();
  
  const deleteEvent = trpc.events.delete.useMutation({
    onSuccess: () => {
      toast.success("Evento eliminado exitosamente");
      utils.events.list.invalidate();
      setOpen(false);
    },
    onError: (error) => {
      toast.error(`Error al eliminar evento: ${error.message}`);
    },
  });

  const handleDelete = () => {
    deleteEvent.mutate({ id: event.id });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Eliminar Evento?</DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. El evento "{event.title}" será eliminado permanentemente del calendario.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={deleteEvent.isPending}
          >
            {deleteEvent.isPending ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
