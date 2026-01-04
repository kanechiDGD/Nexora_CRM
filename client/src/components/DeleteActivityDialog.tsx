import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface DeleteActivityDialogProps {
  logId: number;
  clientId: string;
  subject?: string | null;
}

export function DeleteActivityDialog({ logId, clientId, subject }: DeleteActivityDialogProps) {
  const { t } = useTranslation();
  const utils = trpc.useUtils();
  const deleteActivity = trpc.activityLogs.delete.useMutation({
    onSuccess: () => {
      toast.success(t("activityDialog.delete.success", { defaultValue: "Activity deleted" }));
      utils.activityLogs.getRecent.invalidate();
      utils.activityLogs.getByClientId.invalidate({ clientId });
    },
    onError: (error) => {
      toast.error(t("activityDialog.delete.error", { defaultValue: error.message }));
    },
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("activityDialog.delete.title", { defaultValue: "Delete activity?" })}</AlertDialogTitle>
          <AlertDialogDescription>
            {subject
              ? t("activityDialog.delete.descriptionWithSubject", {
                  defaultValue: `This will delete "${subject}" permanently.`,
                })
              : t("activityDialog.delete.description", {
                  defaultValue: "This action cannot be undone.",
                })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("activityDialog.new.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteActivity.mutate({ id: logId })}
            disabled={deleteActivity.isPending}
          >
            {deleteActivity.isPending
              ? t("activityDialog.delete.deleting", { defaultValue: "Deleting..." })
              : t("activityDialog.delete.confirm", { defaultValue: "Delete" })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
