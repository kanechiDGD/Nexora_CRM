import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, UserCheck } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function AcceptInvite() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("token") || "";
  }, []);

  const acceptMutation = trpc.organizations.acceptInvite.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setError("");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 400);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!token) {
      setError(t("invite.missingToken"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("invite.passwordMismatch"));
      return;
    }

    acceptMutation.mutate({ token, name, password });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b1522] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.18),_rgba(15,23,42,0))]" />
      <div className="pointer-events-none absolute -top-24 right-10 h-64 w-64 rounded-full bg-teal-400/25 blur-3xl animate-[pulse_10s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute -bottom-32 left-10 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl animate-[pulse_12s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:48px_48px] opacity-20" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-lg items-center px-4 py-12">
        <div className="w-full rounded-3xl border border-slate-800/80 bg-[#0f2233]/85 p-6 sm:p-8 shadow-[0_20px_80px_-40px_rgba(14,165,233,0.55)] backdrop-blur">
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.4em] text-slate-400">
              {t("invite.eyebrow")}
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold">
              {t("invite.title")}
            </h1>
            <p className="text-sm text-slate-400">
              {t("invite.subtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm text-slate-200">
                {t("invite.nameLabel")}
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder={t("invite.namePlaceholder")}
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="bg-slate-900/60 border-slate-700 text-white placeholder:text-slate-500 h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-slate-200">
                {t("invite.passwordLabel")}
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder={t("invite.passwordPlaceholder")}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="bg-slate-900/60 border-slate-700 text-white placeholder:text-slate-500 h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm text-slate-200">
                {t("invite.confirmPasswordLabel")}
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder={t("invite.confirmPasswordPlaceholder")}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                className="bg-slate-900/60 border-slate-700 text-white placeholder:text-slate-500 h-10"
              />
            </div>

            {error && (
              <Alert variant="destructive" className="bg-red-900/50 border-red-700">
                <AlertDescription className="text-xs sm:text-sm">{error}</AlertDescription>
              </Alert>
            )}

            {submitted && (
              <Alert className="border-emerald-500/40 bg-emerald-500/10 text-emerald-100">
                <AlertDescription className="text-xs sm:text-sm">
                  {t("invite.success")}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full h-10 bg-teal-500 text-slate-900 hover:bg-teal-400"
              disabled={acceptMutation.isPending}
            >
              <UserCheck className="mr-2 h-4 w-4" />
              {acceptMutation.isPending ? t("invite.submitting") : t("invite.acceptButton")}
            </Button>
          </form>

          <Button
            type="button"
            variant="ghost"
            className="mt-4 w-full text-xs sm:text-sm text-slate-400 hover:text-white h-10"
            onClick={() => setLocation("/login")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("invite.backToLogin")}
          </Button>
        </div>
      </div>
    </div>
  );
}
