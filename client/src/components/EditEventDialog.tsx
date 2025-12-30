import { useState, useEffect, useRef } from "react";
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
import { Edit, Check, ChevronsUpDown } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface EditEventDialogProps {
  event: any;
}

export function EditEventDialog({ event }: EditEventDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [attendeeSearchOpen, setAttendeeSearchOpen] = useState(false);
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const [formData, setFormData] = useState({
    eventType: event.eventType || "MEETING",
    title: event.title || "",
    description: event.description || "",
    eventDate: event.eventDate ? new Date(event.eventDate).toISOString().split('T')[0] : "",
    eventTime: event.eventTime || "",
    address: event.address || "",
    notes: event.notes || "",
    attendeeIds: [] as number[],
  });

  const utils = trpc.useUtils();
  const { data: organizationMembers = [] } = trpc.organizations.getMembers.useQuery();
  const { data: attendees = [] } = trpc.events.getAttendees.useQuery(
    { eventId: event.id },
    { enabled: open && !!event?.id }
  );
  
  const updateEvent = trpc.events.update.useMutation({
    onSuccess: () => {
      toast.success(t('eventDialogs.edit.success'));
      utils.events.list.invalidate();
      setOpen(false);
    },
    onError: (error) => {
      toast.error(t('eventDialogs.edit.error', { message: error.message }));
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
        attendeeIds: attendees.map((attendee: any) => attendee.memberId),
      });
    }
  }, [open, event, attendees]);

  useEffect(() => {
    if (!open) return;
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
    if (!apiKey) return;

    let autocomplete: any = null;
    let listener: any = null;
    const w = window as any;

    const loadScript = () => {
      if (w.google?.maps?.places) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("google-maps-load-failed"));
        document.head.appendChild(script);
      });
    };

    loadScript()
      .then(() => {
        const input = addressInputRef.current;
        if (!input || !w.google?.maps?.places) return;
        autocomplete = new w.google.maps.places.Autocomplete(input, {
          types: ["address"],
          fields: ["formatted_address"],
        });
        listener = autocomplete.addListener("place_changed", () => {
          const place = autocomplete?.getPlace();
          if (!place?.formatted_address) return;
          setFormData((prev) => ({
            ...prev,
            address: place.formatted_address,
          }));
        });
      })
      .catch(() => {});

    return () => {
      if (listener) listener.remove();
      if (autocomplete) {
        w.google?.maps?.event?.clearInstanceListeners(autocomplete);
      }
    };
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.eventDate) {
      toast.error(t('eventDialogs.edit.missingRequired'));
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
      attendeeIds: formData.attendeeIds,
    });
  };

  const toggleAttendee = (memberId: number) => {
    setFormData((prev) => {
      const isSelected = prev.attendeeIds.includes(memberId);
      return {
        ...prev,
        attendeeIds: isSelected
          ? prev.attendeeIds.filter((id) => id !== memberId)
          : [...prev.attendeeIds, memberId],
      };
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
            <DialogTitle>{t('eventDialogs.edit.title')}</DialogTitle>
            <DialogDescription>
              {t('eventDialogs.edit.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-eventType">{t('eventDialogs.edit.eventTypeLabel')}</Label>
              <Select
                value={formData.eventType}
                onValueChange={(value) => setFormData({ ...formData, eventType: value })}
              >
                <SelectTrigger id="edit-eventType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEETING">{t('dashboard.calendar.newEvent.types.MEETING')}</SelectItem>
                  <SelectItem value="ADJUSTMENT">{t('dashboard.calendar.newEvent.types.ADJUSTMENT')}</SelectItem>
                  <SelectItem value="ESTIMATE">{t('dashboard.calendar.newEvent.types.ESTIMATE')}</SelectItem>
                  <SelectItem value="INSPECTION">{t('dashboard.calendar.newEvent.types.INSPECTION')}</SelectItem>
                  <SelectItem value="APPOINTMENT">{t('dashboard.calendar.newEvent.types.APPOINTMENT')}</SelectItem>
                  <SelectItem value="DEADLINE">{t('dashboard.calendar.newEvent.types.DEADLINE')}</SelectItem>
                  <SelectItem value="OTHER">{t('dashboard.calendar.newEvent.types.OTHER')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-event-title">{t('eventDialogs.edit.titleLabel')}</Label>
              <Input
                id="edit-event-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label>{t('dashboard.calendar.newEvent.attendees')}</Label>
              <Popover open={attendeeSearchOpen} onOpenChange={setAttendeeSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={attendeeSearchOpen}
                    className="justify-between"
                  >
                    {formData.attendeeIds.length > 0
                      ? t('dashboard.calendar.newEvent.attendeesSelected', { count: formData.attendeeIds.length })
                      : t('dashboard.calendar.newEvent.attendeesPlaceholder')}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0">
                  <Command>
                    <CommandInput placeholder={t('dashboard.calendar.newEvent.attendeesPlaceholder')} />
                    <CommandList>
                      <CommandEmpty>{t('dashboard.calendar.newEvent.attendeesEmpty')}</CommandEmpty>
                      <CommandGroup>
                        {organizationMembers.map((member: any) => (
                          <CommandItem
                            key={member.id}
                            value={member.username}
                            onSelect={() => toggleAttendee(member.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.attendeeIds.includes(member.id)
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{member.username}</span>
                              <span className="text-xs text-muted-foreground">{member.role}</span>
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
                <Label htmlFor="edit-eventDate">{t('eventDialogs.edit.dateLabel')}</Label>
                <Input
                  id="edit-eventDate"
                  type="date"
                  value={formData.eventDate}
                  onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-eventTime">{t('eventDialogs.edit.timeLabel')}</Label>
                <Input
                  id="edit-eventTime"
                  type="time"
                  value={formData.eventTime}
                  onChange={(e) => setFormData({ ...formData, eventTime: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-address">{t('eventDialogs.edit.addressLabel')}</Label>
              <Input
                id="edit-address"
                ref={addressInputRef}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-event-description">{t('eventDialogs.edit.descriptionLabel')}</Label>
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
              {t('eventDialogs.edit.cancel')}
            </Button>
            <Button type="submit" disabled={updateEvent.isPending}>
              {updateEvent.isPending ? t('eventDialogs.edit.saving') : t('eventDialogs.edit.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
