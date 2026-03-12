import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Share2, Copy, Check, RefreshCw, Trash2, Link } from "lucide-react";

interface ShareClientDialogProps {
  clientId: string;
}

export function ShareClientDialog({ clientId }: ShareClientDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const utils = trpc.useUtils();
  const { data: share, isLoading } = trpc.clientShares.get.useQuery(
    { clientId },
    { enabled: open }
  );

  const generate = trpc.clientShares.generate.useMutation({
    onSuccess: () => utils.clientShares.get.invalidate({ clientId }),
  });

  const revoke = trpc.clientShares.revoke.useMutation({
    onSuccess: () => utils.clientShares.get.invalidate({ clientId }),
  });

  const shareUrl = share?.shareToken
    ? `${window.location.origin}/share/${share.shareToken}`
    : null;

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerate = () => generate.mutate({ clientId });
  const handleRevoke = () => revoke.mutate({ clientId });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          {t("share.button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            {t("share.title")}
          </DialogTitle>
          <DialogDescription>
            {t("share.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("share.loading")}
            </p>
          ) : shareUrl ? (
            <>
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="text-xs font-mono"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  title={t("share.copyLink")}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("share.publicNote")}
              </p>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={generate.isPending}
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t("share.regenerate")}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRevoke}
                  disabled={revoke.isPending}
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("share.revoke")}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground text-center py-2">
                {t("share.noLink")}
              </p>
              <Button
                onClick={handleGenerate}
                disabled={generate.isPending}
                className="w-full"
              >
                <Share2 className="h-4 w-4 mr-2" />
                {t("share.generate")}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
