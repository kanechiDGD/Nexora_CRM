import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Building2,
  LogIn,
  Languages,
  Chrome,
  Sparkles,
  ShieldCheck,
  LineChart,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { APP_LOGO, getGoogleLoginUrl } from "@/const";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Login() {
  const { t, i18n } = useTranslation();
  const [, setLocation] = useLocation();
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");

  const loginMutation = trpc.auth.loginWithCredentials.useMutation({
    onSuccess: () => {
      // Redirigir al dashboard despuAcs del login exitoso
      window.location.href = "/dashboard";
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate({ username, password, rememberMe });
  };

  const handleCreateOrganization = () => {
    // Redirigir directamente a la pA?gina de onboarding
    setLocation("/onboarding");
  };

  const handleShowLoginForm = () => {
    setShowLoginForm(true);
  };

  const handleGoogleLogin = () => {
    window.location.href = getGoogleLoginUrl("/dashboard");
  };

  const handleForgotPassword = () => {
    setLocation("/forgot-password");
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const features = [
    {
      icon: Sparkles,
      title: t("login.featureOneTitle"),
      description: t("login.featureOneDesc"),
    },
    {
      icon: ShieldCheck,
      title: t("login.featureTwoTitle"),
      description: t("login.featureTwoDesc"),
    },
    {
      icon: LineChart,
      title: t("login.featureThreeTitle"),
      description: t("login.featureThreeDesc"),
    },
  ];

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#0b1522] text-white"
      style={{
        fontFamily:
          "'Space Grotesk', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.18),_rgba(15,23,42,0))]" />
      <div className="pointer-events-none absolute -top-24 right-10 h-64 w-64 rounded-full bg-teal-400/25 blur-3xl animate-[pulse_10s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute -bottom-32 left-10 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl animate-[pulse_12s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:48px_48px] opacity-20" />

      <div className="absolute right-4 top-4 z-20">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 bg-slate-900/70 text-slate-200 hover:bg-slate-800"
            >
              <Languages className="h-4 w-4 mr-2" />
              {i18n.language === "es"
                ? t("login.languageSpanish")
                : t("login.languageEnglish")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700">
            <DropdownMenuItem
              onClick={() => changeLanguage("es")}
              className="text-slate-200 hover:bg-slate-800 cursor-pointer"
            >
              ES - {t("login.languageSpanish")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => changeLanguage("en")}
              className="text-slate-200 hover:bg-slate-800 cursor-pointer"
            >
              EN - {t("login.languageEnglish")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-12 lg:grid lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="order-2 lg:order-1 space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {APP_LOGO ? (
                <img
                  src={APP_LOGO}
                  alt={t("login.appTitle")}
                  className="h-12 w-12 rounded-xl bg-[#0f2233]/70 p-2"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0f2233]/70 text-lg font-semibold">
                  N
                </div>
              )}
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">
                  {t("login.heroEyebrow")}
                </p>
                <h1
                  className="text-3xl sm:text-4xl md:text-5xl font-semibold"
                  style={{ fontFamily: "'Fraunces', 'Times New Roman', serif" }}
                >
                  {t("login.appTitle")}
                </h1>
                <p className="text-sm sm:text-base text-slate-300">
                  {t("login.appSubtitle")}
                </p>
              </div>
            </div>
            <p className="max-w-xl text-sm sm:text-base text-slate-300">
              {t("login.heroDescription")}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-slate-800/80 bg-[#0f2233]/70 p-4 shadow-[0_10px_40px_-30px_rgba(45,212,191,0.6)]"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-slate-800/80 p-2 text-slate-100">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white">{feature.title}</p>
                      <p className="text-xs text-slate-400">{feature.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <span className="h-px flex-1 bg-slate-800" />
            {t("login.trustLine")}
            <span className="h-px flex-1 bg-slate-800" />
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <div className="rounded-3xl border border-slate-800/80 bg-[#0f2233]/80 p-6 sm:p-8 shadow-[0_20px_80px_-40px_rgba(14,165,233,0.55)] backdrop-blur">
            {!showLoginForm ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.4em] text-slate-400">
                    {t("login.accessEyebrow")}
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-semibold">
                    {t("login.accessTitle")}
                  </h2>
                  <p className="text-sm text-slate-400">
                    {t("login.accessSubtitle")}
                  </p>
                </div>

                <div className="space-y-4">
                  <Button
                    type="button"
                    className="w-full h-auto py-4 px-4 flex items-start gap-3 bg-[#f8fafc] text-slate-900 hover:bg-white"
                    onClick={handleGoogleLogin}
                  >
                    <Chrome className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <div className="text-left">
                      <div className="text-sm sm:text-base font-semibold">
                        {t("login.googleSignIn")}
                      </div>
                      <div className="text-xs text-slate-500">
                        {t("login.googleSignInDesc")}
                      </div>
                    </div>
                  </Button>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="h-px flex-1 bg-slate-800" />
                    {t("login.or")}
                    <span className="h-px flex-1 bg-slate-800" />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-auto py-4 px-4 flex items-start gap-3 border-slate-700 bg-[#0b1d2e]/80 text-white hover:bg-[#12263a]"
                    onClick={handleShowLoginForm}
                  >
                    <LogIn className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <div className="text-left">
                      <div className="text-sm sm:text-base font-semibold">
                        {t("login.loginExisting")}
                      </div>
                      <div className="text-xs text-slate-400">
                        {t("login.loginExistingDesc")}
                      </div>
                    </div>
                  </Button>
                </div>

                <div className="rounded-2xl border border-slate-800/80 bg-[#0b1d2e]/80 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-slate-800/80 p-2 text-slate-100">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-semibold text-white">
                        {t("login.createNew")}
                      </p>
                      <p className="text-xs text-slate-400">
                        {t("login.createNewDesc")}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    className="mt-4 w-full bg-teal-500 text-slate-900 hover:bg-teal-400"
                    onClick={handleCreateOrganization}
                  >
                    {t("login.createNewAction")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.4em] text-slate-400">
                    {t("login.loginEyebrow")}
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-semibold">
                    {t("login.loginTitle")}
                  </h2>
                  <p className="text-sm text-slate-400">
                    {t("login.loginDescription")}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm text-slate-200">
                      {t("login.username")}
                    </Label>
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      placeholder={t("login.usernamePlaceholder")}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="bg-slate-900/60 border-slate-700 text-white placeholder:text-slate-500 h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm text-slate-200">
                      {t("login.password")}
                    </Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      placeholder={t("login.passwordPlaceholder")}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-slate-900/60 border-slate-700 text-white placeholder:text-slate-500 h-10"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember-me"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                        className="border-slate-600 data-[state=checked]:bg-teal-500 data-[state=checked]:text-slate-900"
                      />
                      <Label htmlFor="remember-me" className="text-xs text-slate-300 cursor-pointer">
                        {t("login.rememberMe")}
                      </Label>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto px-0 text-xs text-slate-400 hover:text-white"
                      onClick={handleForgotPassword}
                    >
                      {t("login.forgotPassword")}
                    </Button>
                  </div>

                  {error && (
                    <Alert variant="destructive" className="bg-red-900/50 border-red-700">
                      <AlertDescription className="text-xs sm:text-sm">{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-10"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("login.loggingIn")}
                      </>
                    ) : (
                      <>
                        <LogIn className="mr-2 h-4 w-4" />
                        {t("login.loginButton")}
                      </>
                    )}
                  </Button>
                </form>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-xs sm:text-sm text-slate-400 hover:text-white h-10"
                  onClick={() => setShowLoginForm(false)}
                >
                  {t("login.backToOptions")}
                </Button>
              </div>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-slate-500">
            {t("login.needHelp")}
          </p>
        </div>
      </div>
    </div>
  );
}
