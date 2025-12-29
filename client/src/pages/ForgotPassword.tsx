import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Mail } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const resetMutation = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setError("");
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    resetMutation.mutate({ email });
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
              {t("forgotPassword.eyebrow")}
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold">
              {t("forgotPassword.title")}
            </h1>
            <p className="text-sm text-slate-400">
              {t("forgotPassword.subtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-slate-200">
                {t("forgotPassword.emailLabel")}
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder={t("forgotPassword.emailPlaceholder")}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
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
                  {t("forgotPassword.confirmation")}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full h-10 bg-teal-500 text-slate-900 hover:bg-teal-400"
              disabled={resetMutation.isPending}
            >
              <Mail className="mr-2 h-4 w-4" />
              {resetMutation.isPending
                ? t("forgotPassword.sending")
                : t("forgotPassword.sendButton")}
            </Button>
          </form>

          <Button
            type="button"
            variant="ghost"
            className="mt-4 w-full text-xs sm:text-sm text-slate-400 hover:text-white h-10"
            onClick={() => setLocation("/login")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("forgotPassword.backToLogin")}
          </Button>
        </div>
      </div>
    </div>
  );
}
