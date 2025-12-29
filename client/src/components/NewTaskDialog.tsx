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
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export function NewTaskDialog() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "OTRO" as "DOCUMENTACION" | "SEGUIMIENTO" | "ESTIMADO" | "REUNION" | "REVISION" | "OTRO",
    priority: "MEDIA" as "ALTA" | "MEDIA" | "BAJA",
    dueDate: "",
    clientId: null as string | null,
    clientName: "",
    assignedTo: user?.id || null as number | null,
  });

  const { data: clients } = trpc.clients.list.useQuery();
  const { data: allUsers } = trpc.organizations.getMembers.useQuery();
  const utils = trpc.useUtils();
  
  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      toast.success(t('taskDialogs.new.success'));
      utils.tasks.list.invalidate();
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(t('taskDialogs.new.error', { message: error.message }));
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "OTRO",
      priority: "MEDIA",
      dueDate: "",
      clientId: null,
      clientName: "",
      assignedTo: user?.id || null,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title) {
      toast.error(t("taskDialogs.new.validation.titleRequired"));
      return;
    }

    createTask.mutate({
      title: formData.title,
      description: formData.description || null,
      category: formData.category,
      priority: formData.priority,
      dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
      clientId: formData.clientId,
      assignedTo: formData.assignedTo,
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
          <Plus className="h-4 w-4 mr-2" />
          {t('taskDialogs.new.trigger')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('taskDialogs.new.title')}</DialogTitle>
            <DialogDescription>
              {t('taskDialogs.new.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">{t("taskDialogs.new.titleLabel")}</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t('taskDialogs.new.titlePlaceholder')}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">{t('taskDialogs.new.descriptionLabel')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('taskDialogs.new.descriptionPlaceholder')}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">{t('taskDialogs.new.categoryLabel')}</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value as typeof formData.category })
                  }
                >
                  <SelectTrigger id="category">
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
                <Label htmlFor="priority">{t('taskDialogs.new.priorityLabel')}</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    setFormData({ ...formData, priority: value as typeof formData.priority })
                  }
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALTA">{t('taskDialogs.edit.priorities.high')}</SelectItem>
                    <SelectItem value="MEDIA">{t('taskDialogs.edit.priorities.medium')}</SelectItem>
                    <SelectItem value="BAJA">{t('taskDialogs.edit.priorities.low')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dueDate">{t("taskDialogs.new.dueDateLabel")}</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>{t('taskDialogs.new.assignedToLabel')}</Label>
              <Select
                value={formData.assignedTo?.toString() || ""}
                onValueChange={(value) =>
                  setFormData({ ...formData, assignedTo: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('taskDialogs.new.assignedToPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{t('taskDialogs.new.assignedToNone')}</SelectItem>
                  {allUsers?.map((member: any) => (
                    <SelectItem key={member.id} value={member.userId.toString()}>
                      {member.username} ({member.role})
                      {member.userId === user?.id ? ` - ${t('taskDialogs.new.assignedToYou')}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>{t('taskDialogs.new.clientLabel')}</Label>
              <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientSearchOpen}
                    className="justify-between"
                  >
                    {formData.clientName || t('taskDialogs.new.clientPlaceholder')}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0">
                  <Command>
                    <CommandInput placeholder={t('taskDialogs.new.clientSearchPlaceholder')} />
                    <CommandList>
                      <CommandEmpty>{t('taskDialogs.new.noClients')}</CommandEmpty>
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
                              <span>{client.firstName} {client.lastName}</span>
                              <span className="text-sm text-muted-foreground">
                                {client.phone || client.email}
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
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('taskDialogs.new.cancel')}
            </Button>
            <Button type="submit" disabled={createTask.isPending}>
              {createTask.isPending ? t('taskDialogs.new.creating') : t('taskDialogs.new.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
