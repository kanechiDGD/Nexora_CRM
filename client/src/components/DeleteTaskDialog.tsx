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

interface DeleteTaskDialogProps {
  task: any;
}

export function DeleteTaskDialog({ task }: DeleteTaskDialogProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();
  
  const deleteTask = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      toast.success(t('taskDialogs.delete.success'));
      utils.tasks.list.invalidate();
      setOpen(false);
    },
    onError: (error) => {
      toast.error(t('taskDialogs.delete.error', { message: error.message }));
    },
  });

  const handleDelete = () => {
    deleteTask.mutate({ id: task.id });
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
          <DialogTitle>{t('taskDialogs.delete.title')}</DialogTitle>
          <DialogDescription>
            {t('taskDialogs.delete.description', { title: task.title })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('taskDialogs.delete.cancel')}
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={deleteTask.isPending}
          >
            {deleteTask.isPending ? t('taskDialogs.delete.deleting') : t('taskDialogs.delete.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
