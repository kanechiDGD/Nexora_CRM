import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, UserPlus, Trash2, KeyRound, AlertCircle, AlertTriangle, MailPlus, XCircle, RotateCcw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format } from "date-fns";
import { enUS, es } from "date-fns/locale";
import DashboardLayout from "@/components/DashboardLayout";

type OrgMember = {
  id: number;
  username: string;
  role: "ADMIN" | "CO_ADMIN" | "VENDEDOR";
  createdAt: string | Date;
};

type OrgInvite = {
  id: number;
  email: string;
  role: "ADMIN" | "CO_ADMIN" | "VENDEDOR";
  createdAt: string | Date;
  expiresAt: string | Date;
  acceptedAt?: string | Date | null;
  revokedAt?: string | Date | null;
};

export default function Users() {
  const { t, i18n } = useTranslation();
  const [, setLocation] = useLocation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showSeatDialog, setShowSeatDialog] = useState(false);
  const [showReleaseDialog, setShowReleaseDialog] = useState(false);
  const [releaseConfirmName, setReleaseConfirmName] = useState("");
  const [seatCoupon, setSeatCoupon] = useState("");
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");

  // Form state
  const [newUsername, setNewUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"ADMIN" | "CO_ADMIN" | "VENDEDOR">("VENDEDOR");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "CO_ADMIN" | "VENDEDOR">("VENDEDOR");

  const utils = trpc.useUtils();
  const { data: members, isLoading } = trpc.organizations.getMembers.useQuery();
  const { data: membership } = trpc.organizations.checkMembership.useQuery();
  const invitesEnabled = import.meta.env.VITE_INVITES_ENABLED === "true";
  const { data: invites, isLoading: isInvitesLoading } = trpc.organizations.listInvites.useQuery(
    undefined,
    { enabled: invitesEnabled }
  );

  const updateRoleMutation = trpc.organizations.updateMemberRole.useMutation({
    onSuccess: () => {
      toast.success(t("usersPage.toasts.roleUpdated"));
      utils.organizations.getMembers.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMemberMutation = trpc.organizations.deleteMember.useMutation({
    onSuccess: () => {
      toast.success(t("usersPage.toasts.memberDeleted"));
      utils.organizations.getMembers.invalidate();
      setShowDeleteDialog(false);
      setSelectedMember(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const addMemberMutation = trpc.organizations.addMember.useMutation({
    onSuccess: () => {
      toast.success(t("usersPage.toasts.memberAdded"));
      utils.organizations.getMembers.invalidate();
      setShowAddDialog(false);
      setNewUsername("");
      setNewUserPassword("");
      setNewUserRole("VENDEDOR");
    },
    onError: (error) => {
      if (error.message === "SEAT_LIMIT_REACHED") {
        setShowSeatDialog(true);
        return;
      }
      toast.error(error.message);
    },
  });

  const resetPasswordMutation = trpc.organizations.resetMemberPassword.useMutation({
    onSuccess: (data) => {
      setNewPassword(data.newPassword);
      toast.success(t("usersPage.toasts.passwordReset"));
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const inviteMemberMutation = trpc.organizations.inviteMember.useMutation({
    onSuccess: () => {
      toast.success(t("usersPage.toasts.inviteSent"));
      utils.organizations.listInvites.invalidate();
      setShowInviteDialog(false);
      setInviteEmail("");
      setInviteRole("VENDEDOR");
    },
    onError: (error) => {
      if (error.message === "SEAT_LIMIT_REACHED") {
        setShowSeatDialog(true);
        return;
      }
      toast.error(error.message);
    },
  });

  const checkoutMutation = trpc.billing.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => toast.error(error.message),
  });

  const addSeatMutation = trpc.billing.addExtraSeat.useMutation({
    onSuccess: () => {
      toast.success(t("usersPage.seats.added"));
      utils.organizations.checkMembership.invalidate();
      utils.organizations.getMembers.invalidate();
      setShowSeatDialog(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const applySeatCouponMutation = trpc.billing.applySeatCoupon.useMutation({
    onSuccess: () => {
      toast.success(t("usersPage.seats.couponApplied"));
      utils.organizations.checkMembership.invalidate();
      utils.organizations.getMembers.invalidate();
      setSeatCoupon("");
      setShowSeatDialog(false);
    },
    onError: (error) => {
      toast.error(error.message || t("usersPage.seats.couponInvalid"));
    },
  });

  const revokeInviteMutation = trpc.organizations.revokeInvite.useMutation({
    onSuccess: () => {
      toast.success(t("usersPage.toasts.inviteRevoked"));
      utils.organizations.listInvites.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteInviteMutation = trpc.organizations.deleteInvite.useMutation({
    onSuccess: () => {
      toast.success(t("usersPage.toasts.inviteDeleted"));
      utils.organizations.listInvites.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const releaseOrganizationMutation = trpc.organizations.releaseOrganization.useMutation({
    onSuccess: () => {
      toast.success(t("usersPage.toasts.organizationReleased"));
      utils.organizations.checkMembership.invalidate();
      utils.organizations.getMembers.invalidate();
      utils.organizations.listInvites.invalidate();
      setShowReleaseDialog(false);
      setReleaseConfirmName("");
      setLocation("/onboarding");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleRoleChange = (memberId: number, newRole: "ADMIN" | "CO_ADMIN" | "VENDEDOR") => {
    updateRoleMutation.mutate({ memberId, newRole });
  };

  const handleDeleteMember = () => {
    if (selectedMember) {
      deleteMemberMutation.mutate({ memberId: selectedMember.id });
    }
  };

  const handleAddMember = () => {
    if (!newUsername || !newUserPassword) {
      toast.error(t("usersPage.validation.completeAllFields"));
      return;
    }
    const allowedSeats = membership?.billing?.allowedSeats ?? 0;
    const memberCount = (members as OrgMember[] | undefined)?.length ?? 0;
    if (allowedSeats > 0 && memberCount >= allowedSeats) {
      setShowSeatDialog(true);
      return;
    }
    addMemberMutation.mutate({
      username: newUsername,
      password: newUserPassword,
      role: newUserRole,
    });
  };

  const handleResetPassword = () => {
    if (selectedMember) {
      resetPasswordMutation.mutate({ memberId: selectedMember.id });
    }
  };

    const handleInviteMember = () => {
      if (!inviteEmail) {
        toast.error(t("usersPage.validation.completeAllFields"));
        return;
      }
    const allowedSeats = membership?.billing?.allowedSeats ?? 0;
    const memberCount = (members as OrgMember[] | undefined)?.length ?? 0;
    if (allowedSeats > 0 && memberCount >= allowedSeats) {
      setShowSeatDialog(true);
      return;
    }
      inviteMemberMutation.mutate({ email: inviteEmail, role: inviteRole });
    };

    const handleResendInvite = (invite: OrgInvite) => {
      inviteMemberMutation.mutate({ email: invite.email, role: invite.role });
    };

  const memberCount = (members as OrgMember[] | undefined)?.length ?? 0;
  const allowedSeats = membership?.billing?.allowedSeats ?? 0;
  const seatsRemaining = allowedSeats > 0 ? Math.max(0, allowedSeats - memberCount) : 0;
  const planTier = membership?.billing?.planTier ?? "starter";
  const hasSubscription = Boolean(membership?.organization?.stripeSubscriptionId);

  const handlePurchaseSeat = () => {
    if (hasSubscription) {
      addSeatMutation.mutate();
      return;
    }
    checkoutMutation.mutate({
      planTier,
      requestedSeats: memberCount + 1,
      successPath: "/users?seat=success",
      cancelPath: "/users?seat=cancel",
    });
  };

  const handleApplySeatCoupon = () => {
    if (!seatCoupon.trim()) {
      toast.error(t("usersPage.seats.couponInvalid"));
      return;
    }
    applySeatCouponMutation.mutate({ code: seatCoupon });
  };

  const handleReleaseOrganization = () => {
    releaseOrganizationMutation.mutate();
  };

  const releaseNameMatches = releaseConfirmName.trim() === (membership?.organization?.name ?? "");

  const getRoleBadge = (role: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline"; label: string }> = {
      ADMIN: { variant: "default", label: t("usersPage.roles.admin") },
      CO_ADMIN: { variant: "secondary", label: t("usersPage.roles.coAdmin") },
      VENDEDOR: { variant: "outline", label: t("usersPage.roles.seller") },
    };
    const config = variants[role] || variants.VENDEDOR;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getInviteStatusBadge = (invite: OrgInvite) => {
    if (invite.revokedAt) {
      return <Badge variant="outline">{t("usersPage.invites.status.revoked")}</Badge>;
    }
    if (invite.acceptedAt) {
      return <Badge variant="secondary">{t("usersPage.invites.status.accepted")}</Badge>;
    }
    const isExpired = new Date(invite.expiresAt).getTime() < Date.now();
    if (isExpired) {
      return <Badge variant="outline">{t("usersPage.invites.status.expired")}</Badge>;
    }
    return <Badge variant="default">{t("usersPage.invites.status.pending")}</Badge>;
  };

  const dateLocale = i18n.language.startsWith("es") ? es : enUS;
  const inviteRows = (invites as OrgInvite[] | undefined) ?? [];

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("usersPage.title")}</h1>
            <p className="text-muted-foreground">{t("usersPage.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            {invitesEnabled && (
              <Button variant="outline" onClick={() => setShowInviteDialog(true)}>
                <MailPlus className="mr-2 h-4 w-4" />
                {t("usersPage.actions.inviteUser")}
              </Button>
            )}
            <Button onClick={() => setShowAddDialog(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              {t("usersPage.actions.addUser")}
            </Button>
          </div>
        </div>

        {allowedSeats > 0 && (
          <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">{t("usersPage.seats.title")}</p>
              <p className="text-sm text-muted-foreground">
                {t("usersPage.seats.used", { used: memberCount, total: allowedSeats })}
              </p>
            </div>
            {seatsRemaining <= 0 && (
              <Button variant="outline" onClick={() => setShowSeatDialog(true)}>
                {t("usersPage.seats.addSeat")}
              </Button>
            )}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t("usersPage.membersTitle")}</CardTitle>
            <CardDescription>
              {t("usersPage.membersDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("usersPage.table.user")}</TableHead>
                    <TableHead>{t("usersPage.table.role")}</TableHead>
                    <TableHead>{t("usersPage.table.createdAt")}</TableHead>
                    <TableHead className="text-right">{t("usersPage.table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(members as OrgMember[] | undefined)?.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.username}</TableCell>
                      <TableCell>
                        <Select
                          value={member.role}
                          onValueChange={(value) => handleRoleChange(member.id, value as any)}
                          disabled={updateRoleMutation.isPending}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">{t("usersPage.roles.admin")}</SelectItem>
                            <SelectItem value="CO_ADMIN">{t("usersPage.roles.coAdmin")}</SelectItem>
                            <SelectItem value="VENDEDOR">{t("usersPage.roles.seller")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {format(new Date(member.createdAt), "dd/MM/yyyy", { locale: dateLocale })}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedMember(member);
                            setShowResetDialog(true);
                            setNewPassword("");
                          }}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedMember(member);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {invitesEnabled && (
          <Card>
            <CardHeader>
              <CardTitle>{t("usersPage.invites.title")}</CardTitle>
              <CardDescription>{t("usersPage.invites.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              {isInvitesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : inviteRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("usersPage.invites.empty")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("usersPage.invites.table.email")}</TableHead>
                      <TableHead>{t("usersPage.invites.table.role")}</TableHead>
                      <TableHead>{t("usersPage.invites.table.status")}</TableHead>
                      <TableHead>{t("usersPage.invites.table.expires")}</TableHead>
                      <TableHead className="text-right">{t("usersPage.invites.table.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inviteRows.map((invite) => {
                      const isExpired = new Date(invite.expiresAt).getTime() < Date.now();
                      const canRevoke = !invite.acceptedAt && !invite.revokedAt && !isExpired;
                      const canDelete = Boolean(invite.revokedAt) || isExpired;
                      return (
                        <TableRow key={invite.id}>
                          <TableCell className="font-medium">{invite.email}</TableCell>
                          <TableCell>{getRoleBadge(invite.role)}</TableCell>
                          <TableCell>{getInviteStatusBadge(invite)}</TableCell>
                          <TableCell>
                            {format(new Date(invite.expiresAt), "dd/MM/yyyy", { locale: dateLocale })}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            {!invite.acceptedAt && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={inviteMemberMutation.isPending}
                                onClick={() => handleResendInvite(invite)}
                                title={t("usersPage.actions.sendInvite")}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                            {canRevoke ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={revokeInviteMutation.isPending}
                                onClick={() => revokeInviteMutation.mutate({ id: invite.id })}
                                title={t("usersPage.invites.status.revoked")}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            ) : canDelete ? (
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={deleteInviteMutation.isPending}
                                onClick={() => deleteInviteMutation.mutate({ id: invite.id })}
                                title={t("usersPage.actions.delete")}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {membership?.member?.role === "ADMIN" && (
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle>{t("usersPage.organization.title")}</CardTitle>
              <CardDescription>{t("usersPage.organization.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert className="border-destructive/40">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {t("usersPage.organization.warning")}
                </AlertDescription>
              </Alert>
              <Button
                variant="destructive"
                onClick={() => setShowReleaseDialog(true)}
              >
                {t("usersPage.organization.action")}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Dialog: Invitar Usuario */}
        {invitesEnabled && (
          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("usersPage.dialogs.invite.title")}</DialogTitle>
              <DialogDescription>
                {t("usersPage.dialogs.invite.description")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="inviteEmail">{t("usersPage.fields.email")}</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  placeholder={t("usersPage.placeholders.email")}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("usersPage.fields.role")}</Label>
                <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">{t("usersPage.roles.admin")}</SelectItem>
                    <SelectItem value="CO_ADMIN">{t("usersPage.roles.coAdmin")}</SelectItem>
                    <SelectItem value="VENDEDOR">{t("usersPage.roles.seller")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Alert className="bg-slate-900/60 border-slate-700">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs sm:text-sm">
                  {t("usersPage.dialogs.invite.notice")}
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                {t("usersPage.actions.cancel")}
              </Button>
              <Button
                onClick={handleInviteMember}
                disabled={inviteMemberMutation.isPending}
              >
                {inviteMemberMutation.isPending
                  ? t("usersPage.actions.sending")
                  : t("usersPage.actions.sendInvite")}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        )}

        {/* Dialog: Agregar Usuario */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("usersPage.dialogs.add.title")}</DialogTitle>
              <DialogDescription>
                {t("usersPage.dialogs.add.description")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="username">{t("usersPage.fields.username")}</Label>
                <Input
                  id="username"
                  placeholder={t("usersPage.placeholders.username")}
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("usersPage.fields.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t("usersPage.placeholders.password")}
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">{t("usersPage.fields.role")}</Label>
                <Select value={newUserRole} onValueChange={(value: any) => setNewUserRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">{t("usersPage.roles.admin")}</SelectItem>
                    <SelectItem value="CO_ADMIN">{t("usersPage.roles.coAdmin")}</SelectItem>
                    <SelectItem value="VENDEDOR">{t("usersPage.roles.seller")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                {t("usersPage.actions.cancel")}
              </Button>
              <Button onClick={handleAddMember} disabled={addMemberMutation.isPending}>
                {addMemberMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("usersPage.actions.adding")}
                  </>
                ) : (
                  t("usersPage.actions.addUser")
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: {t('usersPage.delete')} Usuario */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("usersPage.dialogs.delete.title")}</DialogTitle>
              <DialogDescription>
                {t("usersPage.dialogs.delete.description", { name: selectedMember?.username })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                {t("usersPage.actions.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteMember}
                disabled={deleteMemberMutation.isPending}
              >
                {deleteMemberMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("usersPage.actions.deleting")}
                  </>
                ) : (
                  t("usersPage.actions.delete")
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Extra Seat */}
          <Dialog open={showSeatDialog} onOpenChange={setShowSeatDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("usersPage.seats.upgradeTitle")}</DialogTitle>
                <DialogDescription>
                  {t("usersPage.seats.upgradeDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="seatCoupon">{t("usersPage.seats.couponLabel")}</Label>
                  <Input
                    id="seatCoupon"
                    value={seatCoupon}
                    onChange={(e) => setSeatCoupon(e.target.value)}
                    placeholder={t("usersPage.seats.couponPlaceholder")}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={handleApplySeatCoupon}
                  disabled={applySeatCouponMutation.isPending}
                >
                  {applySeatCouponMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("usersPage.seats.processing")}
                    </>
                  ) : (
                    t("usersPage.seats.couponApply")
                  )}
                </Button>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSeatDialog(false)}>
                  {t("usersPage.seats.cancel")}
                </Button>
                <Button
                onClick={handlePurchaseSeat}
                disabled={checkoutMutation.isPending || addSeatMutation.isPending}
              >
                {checkoutMutation.isPending || addSeatMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("usersPage.seats.processing")}
                  </>
                ) : (
                  t("usersPage.seats.confirm")
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Resetear Contraseña */}
        <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("usersPage.dialogs.reset.title")}</DialogTitle>
              <DialogDescription>
                {t("usersPage.dialogs.reset.description", { name: selectedMember?.username })}
              </DialogDescription>
            </DialogHeader>
            {newPassword ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">{t("usersPage.dialogs.reset.generatedLabel")}</p>
                    <div className="bg-muted p-3 rounded-md font-mono text-lg">
                      {newPassword}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t("usersPage.dialogs.reset.generatedHint")}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <p>{t("usersPage.dialogs.reset.pendingText")}</p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowResetDialog(false);
                setNewPassword("");
                setSelectedMember(null);
              }}>
                {t("usersPage.actions.close")}
              </Button>
              {!newPassword && (
                <Button
                  onClick={handleResetPassword}
                  disabled={resetPasswordMutation.isPending}
                >
                  {resetPasswordMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("usersPage.actions.generating")}
                    </>
                  ) : (
                    t("usersPage.actions.generatePassword")
                  )}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Liberar organizacion */}
        <Dialog open={showReleaseDialog} onOpenChange={setShowReleaseDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("usersPage.organization.confirmTitle")}</DialogTitle>
              <DialogDescription>{t("usersPage.organization.confirmDescription")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="releaseOrgName">{t("usersPage.organization.confirmLabel")}</Label>
              <Input
                id="releaseOrgName"
                value={releaseConfirmName}
                onChange={(e) => setReleaseConfirmName(e.target.value)}
                placeholder={t("usersPage.organization.confirmPlaceholder", {
                  name: membership?.organization?.name ?? "",
                })}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReleaseDialog(false)}>
                {t("usersPage.organization.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleReleaseOrganization}
                disabled={releaseOrganizationMutation.isPending || !releaseNameMatches}
              >
                {releaseOrganizationMutation.isPending
                  ? t("usersPage.organization.processing")
                  : t("usersPage.organization.confirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
