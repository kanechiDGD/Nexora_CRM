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
import { useTranslation } from "react-i18next";

interface DeleteEventDialogProps {
  event: any;
}

export function DeleteEventDialog({ event }: DeleteEventDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();
  
  const deleteEvent = trpc.events.delete.useMutation({
    onSuccess: () => {
      toast.success(t('eventDialogs.delete.success'));
      utils.events.list.invalidate();
      setOpen(false);
    },
    onError: (error) => {
      toast.error(t('eventDialogs.delete.error', { message: error.message }));
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
          <DialogTitle>{t('eventDialogs.delete.title')}</DialogTitle>
          <DialogDescription>
            {t('eventDialogs.delete.description', { title: event.title })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('eventDialogs.delete.cancel')}
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={deleteEvent.isPending}
          >
            {deleteEvent.isPending ? t('eventDialogs.delete.deleting') : t('eventDialogs.delete.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
