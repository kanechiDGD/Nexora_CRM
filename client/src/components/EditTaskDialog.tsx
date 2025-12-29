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
import { useTranslation } from "react-i18next";

interface EditTaskDialogProps {
  task: any;
}

export function EditTaskDialog({ task }: EditTaskDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: task.title || "",
    description: task.description || "",
    category: task.category || "OTRO",
    priority: task.priority || "MEDIA",
    status: task.status || "PENDIENTE",
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "",
  });

  const utils = trpc.useUtils();
  
  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => {
      toast.success(t('taskDialogs.edit.success'));
      utils.tasks.list.invalidate();
      setOpen(false);
    },
    onError: (error) => {
      toast.error(t('taskDialogs.edit.error', { message: error.message }));
    },
  });

  useEffect(() => {
    if (open) {
      setFormData({
        title: task.title || "",
        description: task.description || "",
        category: task.category || "OTRO",
        priority: task.priority || "MEDIA",
        status: task.status || "PENDIENTE",
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "",
      });
    }
  }, [open, task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title) {
      toast.error(t('taskDialogs.edit.missingTitle'));
      return;
    }

    updateTask.mutate({
      id: task.id,
      title: formData.title,
      description: formData.description || null,
      category: formData.category as any,
      priority: formData.priority as any,
      status: formData.status as any,
      dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
      completedAt: formData.status === "COMPLETADA" ? new Date() : null,
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
            <DialogTitle>{t('taskDialogs.edit.title')}</DialogTitle>
            <DialogDescription>
              {t('taskDialogs.edit.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">{t('taskDialogs.edit.titleLabel')}</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-description">{t('taskDialogs.edit.descriptionLabel')}</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-category">{t('taskDialogs.edit.categoryLabel')}</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="edit-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DOCUMENTACION">{t('taskDialogs.edit.categories.documentation')}</SelectItem>
                    <SelectItem value="SEGUIMIENTO">{t('taskDialogs.edit.categories.followUp')}</SelectItem>
                    <SelectItem value="ESTIMADO">{t('taskDialogs.edit.categories.estimate')}</SelectItem>
                    <SelectItem value="REUNION">{t('taskDialogs.edit.categories.meeting')}</SelectItem>
                    <SelectItem value="REVISION">{t('taskDialogs.edit.categories.review')}</SelectItem>
                    <SelectItem value="OTRO">{t('taskDialogs.edit.categories.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-priority">{t('taskDialogs.edit.priorityLabel')}</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger id="edit-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALTA">{t('taskDialogs.edit.priorities.high')}</SelectItem>
                    <SelectItem value="MEDIA">{t('taskDialogs.edit.priorities.medium')}</SelectItem>
                    <SelectItem value="BAJA">{t('taskDialogs.edit.priorities.low')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-status">{t('taskDialogs.edit.statusLabel')}</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDIENTE">{t('taskDialogs.edit.status.pending')}</SelectItem>
                    <SelectItem value="EN_PROGRESO">{t('taskDialogs.edit.status.inProgress')}</SelectItem>
                    <SelectItem value="COMPLETADA">{t('taskDialogs.edit.status.completed')}</SelectItem>
                    <SelectItem value="CANCELADA">{t('taskDialogs.edit.status.canceled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-dueDate">{t('taskDialogs.edit.dueDateLabel')}</Label>
                <Input
                  id="edit-dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('taskDialogs.edit.cancel')}
            </Button>
            <Button type="submit" disabled={updateTask.isPending}>
              {updateTask.isPending ? t('taskDialogs.edit.saving') : t('taskDialogs.edit.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
