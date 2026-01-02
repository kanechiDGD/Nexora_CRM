import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Mail, Calendar, Shield, Edit, Save, X, Upload } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function Profile() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { role, isAdmin, isCoAdmin, isVendedor } = usePermissions();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const utils = trpc.useUtils();
  const { data: gmailStatus } = trpc.gmail.status.useQuery();
  const disconnectGmail = trpc.gmail.disconnect.useMutation({
    onSuccess: () => {
      toast.success(t("profile.gmail.disconnected"));
      utils.gmail.status.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || t("profile.gmail.disconnectFailed"));
    },
  });

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success(t("profile.toasts.passwordUpdated"));
      setFormData({
        ...formData,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleChangePassword = () => {
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      toast.error(t("profile.validation.completePasswordFields"));
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error(t("profile.validation.passwordsMismatch"));
      return;
    }
    if (formData.newPassword.length < 8) {
      toast.error(t("profile.validation.passwordTooShort"));
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword,
    });
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">{t("profile.loading")}</p>
        </div>
      </DashboardLayout>
    );
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString(i18n.language.startsWith('es') ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSave = () => {
    // Validaciones
    if (!formData.name.trim()) {
      toast.error(t("profile.validation.nameRequired"));
      return;
    }

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      toast.error(t("profile.validation.passwordsMismatch"));
      return;
    }

    if (formData.newPassword && formData.newPassword.length < 8) {
      toast.error(t("profile.validation.passwordTooShort"));
      return;
    }

    // TODO: Implementar actualización cuando exista el endpoint
    toast.info(t("profile.toasts.editComingSoon"));
    setIsEditing(false);
    
    // updateProfile.mutate({
    //   name: formData.name,
    //   email: formData.email,
    //   currentPassword: formData.currentPassword || undefined,
    //   newPassword: formData.newPassword || undefined,
    // });
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || "",
      email: user?.email || "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setIsEditing(false);
  };

  const handlePhotoUpload = () => {
    // TODO: Implementar subida de foto a S3
    toast.info(t("profile.toasts.photoComingSoon"));
  };

  const handleGmailConnect = () => {
    const returnTo = window.location.pathname + window.location.search;
    window.location.href = `/api/gmail/connect?returnTo=${encodeURIComponent(returnTo)}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("profile.title")}</h1>
            <p className="text-muted-foreground mt-1">
              {t("profile.subtitle")}
            </p>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              {t("profile.actions.edit")}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                {t("profile.actions.cancel")}
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                {t("profile.actions.save")}
              </Button>
            </div>
          )}
        </div>

        {/* Profile Photo */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>{t("profile.photo.title")}</CardTitle>
            <CardDescription>{t("profile.photo.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src="" />
                <AvatarFallback className="text-2xl">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {t("profile.photo.hint")}
                </p>
                <Button variant="outline" size="sm" onClick={handlePhotoUpload} disabled={!isEditing}>
                  <Upload className="h-4 w-4 mr-2" />
                  {t("profile.photo.change")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gmail Connection */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>{t("profile.gmail.title")}</CardTitle>
            <CardDescription>{t("profile.gmail.description")}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {gmailStatus?.connected ? t("profile.gmail.connected") : t("profile.gmail.notConnected")}
              </p>
              {gmailStatus?.email && (
                <p className="text-sm text-muted-foreground">{gmailStatus.email}</p>
              )}
            </div>
            {gmailStatus?.connected ? (
              <Button
                variant="outline"
                onClick={() => disconnectGmail.mutate()}
                disabled={disconnectGmail.isLoading}
              >
                {t("profile.gmail.disconnect")}
              </Button>
            ) : (
              <Button onClick={handleGmailConnect}>{t("profile.gmail.connect")}</Button>
            )}
          </CardContent>
        </Card>

        {/* Profile Information */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t("profile.personal.title")}
            </CardTitle>
            <CardDescription>{t("profile.personal.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">{t("profile.personal.fullName")}</Label>
                <Input
                  id="name"
                  value={isEditing ? formData.name : (user.name || '-')}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-muted" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("profile.personal.email")}</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={isEditing ? formData.email : (user.email || '-')}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!isEditing}
                    className={!isEditing ? "bg-muted" : ""}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("profile.personal.role")}</Label>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <Badge variant={isAdmin ? 'default' : isCoAdmin ? 'secondary' : 'outline'}>
                    {isAdmin ? t("profile.roles.admin") : isCoAdmin ? t("profile.roles.coAdmin") : t("profile.roles.seller")}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("profile.personal.loginMethod")}</Label>
                <Input
                  value={user.loginMethod || '-'}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t("profile.personal.createdAt")}
                </Label>
                <Input
                  value={formatDate(user.createdAt)}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t("profile.personal.lastSignIn")}
                </Label>
                <Input
                  value={formatDate(user.lastSignedIn)}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>{t("profile.password.title")}</CardTitle>
            <CardDescription>
              {t("profile.password.description")}
            </CardDescription>
          </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">{t("profile.password.current")}</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                  placeholder={t("profile.password.currentPlaceholder")}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">{t("profile.password.new")}</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    placeholder={t("profile.password.newPlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t("profile.password.confirm")}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder={t("profile.password.confirmPlaceholder")}
                  />
                </div>
              </div>
              <Button 
                onClick={handleChangePassword} 
                disabled={changePasswordMutation.isPending}
                className="w-full"
              >
                {changePasswordMutation.isPending ? t("profile.password.updating") : t("profile.password.update")}
              </Button>
            </CardContent>
          </Card>

        {/* Account Settings */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>{t("profile.settings.title")}</CardTitle>
            <CardDescription>
              {t("profile.settings.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <p className="font-medium">{t("profile.settings.emailNotifications")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("profile.settings.emailNotificationsHint")}
                </p>
              </div>
              <Button variant="outline" disabled>
                {t("profile.settings.comingSoon")}
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <p className="font-medium">{t("profile.settings.languagePreferences")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("profile.settings.languageHint")}
                </p>
              </div>
              <Badge variant="outline">{t("profile.settings.languageLabel")}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>{t("profile.system.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("profile.system.userId")}:</span>
              <span className="font-mono">{user.id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("profile.system.openId")}:</span>
              <span className="font-mono text-xs">{user.openId}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
