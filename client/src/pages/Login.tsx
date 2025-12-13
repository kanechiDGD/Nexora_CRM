import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Building2, LogIn, Languages } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { APP_LOGO, getLoginUrl } from "@/const";
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
      // Redirigir al dashboard después del login exitoso
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
    // Redirigir directamente a la página de onboarding
    setLocation("/onboarding");
  };

  const handleShowLoginForm = () => {
    setShowLoginForm(true);
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="w-full max-w-[95%] sm:max-w-md md:max-w-lg space-y-4 sm:space-y-6">
        {/* Selector de idioma */}
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                <Languages className="h-4 w-4 mr-2" />
                {i18n.language === 'es' ? 'Español' : 'English'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
              <DropdownMenuItem
                onClick={() => changeLanguage('es')}
                className="text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer"
              >
                🇪🇸 Español
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => changeLanguage('en')}
                className="text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer"
              >
                🇺🇸 English
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Logo y título */}
        <div className="text-center space-y-2 px-2">
          {APP_LOGO && (
            <img
              src={APP_LOGO}
              alt={t('login.appTitle')}
              className="h-12 sm:h-14 md:h-16 lg:h-20 mx-auto mb-3 sm:mb-4"
            />
          )}
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white break-words">
            {t('login.appTitle')}
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-slate-400">
            {t('login.appSubtitle')}
          </p>
        </div>

        {!showLoginForm ? (
          /* Pantalla de selección de opción */
          <div className="space-y-3 sm:space-y-4">
            <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="text-lg sm:text-xl md:text-2xl text-white text-center">
                  {t('login.welcome')}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm md:text-base text-slate-400 text-center">
                  {t('login.selectOption')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-6">
                {/* Botón para iniciar sesión con organización existente */}
                <Button
                  type="button"
                  className="w-full h-auto py-3 sm:py-4 md:py-5 lg:py-6 px-2 sm:px-3 md:px-4 flex items-start gap-2 bg-blue-600 hover:bg-blue-700 text-left overflow-hidden"
                  onClick={handleShowLoginForm}
                >
                  <LogIn className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold leading-tight break-words">
                      {t('login.loginExisting')}
                    </div>
                    <div className="text-[10px] sm:text-xs md:text-sm text-blue-100 font-normal break-words mt-0.5 sm:mt-1">
                      {t('login.loginExistingDesc')}
                    </div>
                  </div>
                </Button>

                {/* Botón para crear nueva organización */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-auto py-3 sm:py-4 md:py-5 lg:py-6 px-2 sm:px-3 md:px-4 flex items-start gap-2 border-slate-600 bg-slate-900/50 text-white hover:bg-slate-700 text-left overflow-hidden"
                  onClick={handleCreateOrganization}
                >
                  <Building2 className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold leading-tight break-words">
                      {t('login.createNew')}
                    </div>
                    <div className="text-[10px] sm:text-xs md:text-sm text-slate-400 font-normal break-words mt-0.5 sm:mt-1">
                      {t('login.createNewDesc')}
                    </div>
                  </div>
                </Button>
              </CardContent>
            </Card>

            <p className="text-center text-xs sm:text-sm text-slate-500 px-4 break-words">
              {t('login.needHelp')}
            </p>
          </div>
        ) : (
          /* Formulario de login */
          <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-lg sm:text-xl md:text-2xl text-white">
                {t('login.loginTitle')}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm md:text-base text-slate-400">
                {t('login.loginDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-3 sm:p-4 md:p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-xs sm:text-sm md:text-base text-slate-200">
                    {t('login.username')}
                  </Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    placeholder={t('login.usernamePlaceholder')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 h-9 sm:h-10 md:h-11 text-sm sm:text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs sm:text-sm md:text-base text-slate-200">
                    {t('login.password')}
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder={t('login.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 h-9 sm:h-10 md:h-11 text-sm sm:text-base"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                    className="border-slate-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
                  />
                  <Label
                    htmlFor="remember-me"
                    className="text-xs sm:text-sm text-slate-300 cursor-pointer"
                  >
                    {t('login.rememberMe')}
                  </Label>
                </div>

                {error && (
                  <Alert variant="destructive" className="bg-red-900/50 border-red-700">
                    <AlertDescription className="text-xs sm:text-sm">{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full h-9 sm:h-10 md:h-11 text-sm sm:text-base"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('login.loggingIn')}
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      {t('login.loginButton')}
                    </>
                  )}
                </Button>
              </form>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-xs sm:text-sm md:text-base text-slate-400 hover:text-white h-9 sm:h-10 md:h-11"
                onClick={() => setShowLoginForm(false)}
              >
                {t('login.backToOptions')}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
