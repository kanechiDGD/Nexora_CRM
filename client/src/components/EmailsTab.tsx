import { useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mail, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface EmailsTabProps {
  clientId: string;
  clientEmail?: string | null;
}

export default function EmailsTab({ clientId, clientEmail }: EmailsTabProps) {
  const { t } = useTranslation();
  const { data: status } = trpc.gmail.status.useQuery();
  const { data: emails } = trpc.gmail.listByClient.useQuery(
    { clientId },
    { enabled: !!clientId && !!status?.connected }
  );
  const utils = trpc.useUtils();
  const sendMutation = trpc.gmail.send.useMutation({
    onSuccess: () => {
      toast.success(t("emails.sentSuccess"));
      utils.gmail.listByClient.invalidate({ clientId });
      setFormState((prev) => ({ ...prev, subject: "", body: "" }));
    },
    onError: (error) => {
      toast.error(error.message || t("emails.sendFailed"));
    },
  });
  const syncMutation = trpc.gmail.syncNow.useMutation({
    onMutate: () => {
      toast.info(t("emails.syncingNotice"));
    },
    onSuccess: (data) => {
      toast.success(t("emails.syncSuccess", { count: data.processed || 0 }));
      utils.gmail.listByClient.invalidate({ clientId });
    },
    onError: (error) => {
      toast.error(error.message || t("emails.syncFailed"));
    },
  });

  const [formState, setFormState] = useState({
    to: clientEmail || "",
    subject: "",
    body: "",
  });

  const handleConnect = () => {
    const returnTo = window.location.pathname + window.location.search;
    window.location.href = `/api/gmail/connect?returnTo=${encodeURIComponent(returnTo)}`;
  };

  const handleSend = () => {
    if (!formState.to || !formState.subject || !formState.body) {
      toast.error(t("emails.validation.required"));
      return;
    }
    sendMutation.mutate({
      clientId,
      to: formState.to,
      subject: formState.subject,
      bodyText: formState.body,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          {t("emails.title")}
        </CardTitle>
        {!status?.connected ? (
          <Button size="sm" onClick={handleConnect}>
            {t("emails.connect")}
          </Button>
        ) : (
          <Badge variant="outline">{status.email}</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {!status?.connected ? (
          <p className="text-sm text-muted-foreground">{t("emails.connectHint")}</p>
        ) : (
          <>
            <div className="space-y-3 border rounded-lg p-4">
              <p className="text-sm font-semibold">{t("emails.composeTitle")}</p>
              <Input
                placeholder={t("emails.fields.to")}
                value={formState.to}
                onChange={(e) => setFormState({ ...formState, to: e.target.value })}
              />
              <Input
                placeholder={t("emails.fields.subject")}
                value={formState.subject}
                onChange={(e) => setFormState({ ...formState, subject: e.target.value })}
              />
              <Textarea
                placeholder={t("emails.fields.body")}
                value={formState.body}
                onChange={(e) => setFormState({ ...formState, body: e.target.value })}
                rows={4}
              />
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  className="mr-2"
                  onClick={() => syncMutation.mutate({})}
                  disabled={syncMutation.isLoading}
                >
                  {syncMutation.isLoading ? t("emails.syncing") : t("emails.sync")}
                </Button>
                <Button onClick={handleSend} disabled={sendMutation.isLoading}>
                  {sendMutation.isLoading ? t("emails.sending") : t("emails.send")}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold">{t("emails.historyTitle")}</p>
              {!emails || emails.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("emails.empty")}</p>
              ) : (
                <div className="space-y-2">
                  {emails.map((email: any) => (
                    <div
                      key={email.id}
                      className={`border rounded-lg p-3 ${!email.isRead ? "bg-primary/5 border-primary/20" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{email.subject || t("emails.noSubject")}</p>
                          <p className="text-xs text-muted-foreground">
                            {email.fromEmail || "-"} → {email.toEmails || "-"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!email.isRead && (
                            <Badge variant="secondary">{t("emails.unread")}</Badge>
                          )}
                          {email.gmailLink && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(email.gmailLink, "_blank")}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              {t("emails.openInGmail")}
                            </Button>
                          )}
                        </div>
                      </div>
                      {email.snippet && (
                        <p className="text-xs text-muted-foreground mt-2">{email.snippet}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
