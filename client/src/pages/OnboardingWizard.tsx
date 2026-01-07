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
import { Loader2, Building2 } from "lucide-react";
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

export default function OnboardingWizard() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const [step] = useState(2); // Empezar en paso 2 (usuario ya está logueado)
  const initialPlan = (() => {
    const value = new URLSearchParams(window.location.search).get("plan");
    if (value === "professional" || value === "enterprise") {
      return value;
    }
    return "starter";
  })();
  const [planTier] = useState<"starter" | "professional" | "enterprise">(initialPlan);

  // Step 2: Organization Info
  const [orgName, setOrgName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [logo, setLogo] = useState("");

  const createOrgMutation = trpc.organizations.create.useMutation({
    onSuccess: (data) => {
      toast.success(t("onboarding.createSuccess"));
      setLocation(`/billing?plan=${planTier}`);
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
      planTier,
    });
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
                <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                  {t("onboarding.planLabel")}: <span className="font-medium text-foreground capitalize">{planTier}</span>
                </div>
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

        </CardContent>
      </Card>
    </div>
  );
}
