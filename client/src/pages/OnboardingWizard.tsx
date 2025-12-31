import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Building2, Users, CheckCircle2, Copy, Download } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getGoogleLoginUrl } from "@/const";

const BUSINESS_TYPES = [
  { value: "Public Adjusters", labelKey: "onboarding.businessTypes.publicAdjusters" },
  { value: "Insurance", labelKey: "onboarding.businessTypes.insurance" },
  { value: "Real Estate", labelKey: "onboarding.businessTypes.realEstate" },
  { value: "Construction", labelKey: "onboarding.businessTypes.construction" },
  { value: "Legal", labelKey: "onboarding.businessTypes.legal" },
  { value: "Healthcare", labelKey: "onboarding.businessTypes.healthcare" },
  { value: "Other", labelKey: "onboarding.businessTypes.other" },
];

interface GeneratedUser {
  username: string;
  password: string;
  role: string;
}

export default function OnboardingWizard() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const [step, setStep] = useState(2); // Empezar en paso 2 (usuario ya está logueado)

  // Step 2: Organization Info
  const [orgName, setOrgName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [logo, setLogo] = useState("");

  // Step 3: Users
  const [memberCount, setMemberCount] = useState(5);
  const [generatedUsers, setGeneratedUsers] = useState<GeneratedUser[]>([]);
  const [organizationId, setOrganizationId] = useState<number | null>(null);

  const createOrgMutation = trpc.organizations.create.useMutation({
    onSuccess: (data) => {
      setOrganizationId(data.organizationId);
      setGeneratedUsers(data.generatedUsers);
      setStep(3);
      toast.success(t("onboarding.createSuccess"));
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleCreateOrganization = () => {
    if (!orgName.trim()) {
      toast.error(t("onboarding.validation.orgNameRequired"));
      return;
    }
    if (!businessType) {
      toast.error(t("onboarding.validation.businessTypeRequired"));
      return;
    }

    createOrgMutation.mutate({
      name: orgName,
      businessType,
      logo: logo || null,
      memberCount,
    });
  };

  const handleCopyCredentials = () => {
    const text = generatedUsers
      .map((u) => `${u.username} | ${u.password} | ${u.role}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    toast.success(t("onboarding.toasts.credentialsCopied"));
  };

  const handleDownloadCSV = () => {
    const csv = [
      "Username,Password,Role",
      ...generatedUsers.map((u) => `${u.username},${u.password},${u.role}`),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${orgName.toLowerCase().replace(/\s+/g, "-")}-usuarios.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("onboarding.toasts.csvDownloaded"));
  };

  const handleFinish = () => {
    // Redirigir al login para que el usuario inicie sesión con sus credenciales
    setLocation("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.loginMethod !== "google") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="text-2xl">{t("onboarding.authRequired.title")}</CardTitle>
            <CardDescription>{t("onboarding.authRequired.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => {
                window.location.href = getGoogleLoginUrl("/onboarding");
              }}
            >
              {t("onboarding.authRequired.cta")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">{t("onboarding.title")}</CardTitle>
          <CardDescription>
            {t("onboarding.stepDescription", { step })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 1: Welcome (Auto-skip, user already logged in) */}

          {/* Step 2: Organization Info */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{t("onboarding.orgInfo.title")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("onboarding.orgInfo.subtitle")}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="orgName">{t("onboarding.orgInfo.orgNameLabel")}</Label>
                  <Input
                    id="orgName"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder={t("onboarding.orgInfo.orgNamePlaceholder")}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="businessType">{t("onboarding.orgInfo.businessTypeLabel")}</Label>
                  <Select value={businessType} onValueChange={setBusinessType}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t("onboarding.orgInfo.businessTypePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {t(type.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="logo">{t("onboarding.orgInfo.logoLabel")}</Label>
                  <Input
                    id="logo"
                    value={logo}
                    onChange={(e) => setLogo(e.target.value)}
                    placeholder={t("onboarding.orgInfo.logoPlaceholder")}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("onboarding.orgInfo.logoHint")}
                  </p>
                </div>

                <div>
                  <Label htmlFor="memberCount">{t("onboarding.orgInfo.memberCountLabel")}</Label>
                  <Input
                    id="memberCount"
                    type="number"
                    min={1}
                    max={20}
                    value={memberCount}
                    onChange={(e) => setMemberCount(parseInt(e.target.value) || 1)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("onboarding.orgInfo.memberCountHint")}
                  </p>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" disabled>
                  {t("onboarding.actions.previous")}
                </Button>
                <Button
                  onClick={handleCreateOrganization}
                  disabled={createOrgMutation.isPending}
                >
                  {createOrgMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('onboarding.creating')}
                    </>
                  ) : (
                    t('onboarding.createOrganization')
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Generated Users */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{t("onboarding.users.title")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("onboarding.users.subtitle")}
                  </p>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>{t("onboarding.users.importantLabel")}</strong> {t("onboarding.users.importantText")}
                </p>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-medium">{t("onboarding.users.table.user")}</th>
                      <th className="text-left p-3 font-medium">{t("onboarding.users.table.password")}</th>
                      <th className="text-left p-3 font-medium">{t("onboarding.users.table.role")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedUsers.map((user, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-3 font-mono text-sm">{user.username}</td>
                        <td className="p-3 font-mono text-sm">{user.password}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${user.role === 'CO_ADMIN'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                            }`}>
                            {user.role === 'CO_ADMIN' ? t("onboarding.users.roles.coAdmin") : t("onboarding.users.roles.seller")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleCopyCredentials}
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {t("onboarding.users.copyAll")}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadCSV}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t("onboarding.users.downloadCsv")}
                </Button>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleFinish} size="lg">
                  {t("onboarding.users.goToLogin")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
