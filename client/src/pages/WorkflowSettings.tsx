import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { usePermissions } from "@/hooks/usePermissions";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const activityTypeOptions = [
  { value: "AJUSTACION_REALIZADA", labelKey: "activityDialog.new.types.adjustmentCompleted" },
  { value: "SCOPE_SOLICITADO", labelKey: "activityDialog.new.types.scopeRequested" },
  { value: "SCOPE_RECIBIDO", labelKey: "activityDialog.new.types.scopeReceived" },
  { value: "SCOPE_ENVIADO", labelKey: "activityDialog.new.types.scopeSent" },
  { value: "RESPUESTA_FAVORABLE", labelKey: "activityDialog.new.types.responseFavorable" },
  { value: "RESPUESTA_NEGATIVA", labelKey: "activityDialog.new.types.responseNegative" },
  { value: "INICIO_APPRAISAL", labelKey: "activityDialog.new.types.appraisalStarted" },
  { value: "CARTA_APPRAISAL_ENVIADA", labelKey: "activityDialog.new.types.appraisalLetterSent" },
  { value: "RELEASE_LETTER_REQUERIDA", labelKey: "activityDialog.new.types.releaseLetterRequired" },
  { value: "ITEL_SOLICITADO", labelKey: "activityDialog.new.types.itelRequested" },
  { value: "REINSPECCION_SOLICITADA", labelKey: "activityDialog.new.types.reinspectionRequested" },
];

export default function WorkflowSettings() {
  const { t } = useTranslation();
  const { canEdit } = usePermissions();
  const utils = trpc.useUtils();

  const { data: members = [] } = trpc.organizations.getMembers.useQuery(undefined, {
    enabled: canEdit,
  });
  const { data: roles = [] } = trpc.workflowRoles.list.useQuery(undefined, {
    enabled: canEdit,
  });
  const { data: roleMembers = [] } = trpc.workflowRoles.listAllMembers.useQuery(undefined, {
    enabled: canEdit,
  });
  const { data: rules = [] } = trpc.activityAutomationRules.list.useQuery(undefined, {
    enabled: canEdit,
  });

  const createRole = trpc.workflowRoles.create.useMutation({
    onSuccess: () => {
      toast.success(t("workflowSettings.roles.createSuccess"));
      utils.workflowRoles.list.invalidate();
      utils.workflowRoles.listAllMembers.invalidate();
      setRoleForm({
        name: "",
        description: "",
        primaryUserId: "sin_asignar",
        secondaryUserIds: [],
      });
    },
    onError: (error) => {
      toast.error(error.message || t("workflowSettings.roles.createError"));
    },
  });

  const updateRole = trpc.workflowRoles.update.useMutation({
    onSuccess: () => {
      toast.success(t("workflowSettings.roles.updateSuccess"));
      utils.workflowRoles.list.invalidate();
      utils.workflowRoles.listAllMembers.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || t("workflowSettings.roles.updateError"));
    },
  });

  const createRule = trpc.activityAutomationRules.create.useMutation({
    onSuccess: () => {
      toast.success(t("workflowSettings.rules.createSuccess"));
      utils.activityAutomationRules.list.invalidate();
      setRuleForm({
        activityType: "SCOPE_RECIBIDO",
        taskTitle: "",
        taskDescription: "",
        roleId: "sin_asignar",
        category: "OTRO",
        priority: "MEDIA",
        dueInDays: "",
      });
    },
    onError: (error) => {
      toast.error(error.message || t("workflowSettings.rules.createError"));
    },
  });

  const updateRule = trpc.activityAutomationRules.update.useMutation({
    onSuccess: () => {
      utils.activityAutomationRules.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || t("workflowSettings.rules.updateError"));
    },
  });

  const [roleForm, setRoleForm] = useState({
    name: "",
    description: "",
    primaryUserId: "sin_asignar",
    secondaryUserIds: [] as number[],
  });

  const [ruleForm, setRuleForm] = useState({
    activityType: "SCOPE_RECIBIDO",
    taskTitle: "",
    taskDescription: "",
    roleId: "sin_asignar",
    category: "OTRO",
    priority: "MEDIA",
    dueInDays: "",
  });

  const memberOptions = useMemo(
    () =>
      members.map((member: any) => ({
        id: member.userId || member.id,
        label: member.username || member.name || member.email || `ID ${member.id}`,
      })),
    [members]
  );

  const membersByRoleId = useMemo(() => {
    const map = new Map<number, any[]>();
    roleMembers.forEach((member: any) => {
      const list = map.get(member.roleId) || [];
      list.push(member);
      map.set(member.roleId, list);
    });
    return map;
  }, [roleMembers]);

  if (!canEdit) {
    return (
      <DashboardLayout>
        <Card>
          <CardHeader>
            <CardTitle>{t("workflowSettings.title")}</CardTitle>
            <CardDescription>{t("workflowSettings.noAccess")}</CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("workflowSettings.title")}</h1>
          <p className="text-muted-foreground mt-2">{t("workflowSettings.subtitle")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("workflowSettings.roles.title")}</CardTitle>
            <CardDescription>{t("workflowSettings.roles.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("workflowSettings.roles.fields.name")}</Label>
                <Input
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("workflowSettings.roles.fields.primary")}</Label>
                <Select
                  value={roleForm.primaryUserId}
                  onValueChange={(value) => setRoleForm({ ...roleForm, primaryUserId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("workflowSettings.roles.fields.primaryPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sin_asignar">{t("workflowSettings.roles.unassigned")}</SelectItem>
                    {memberOptions.map((member) => (
                      <SelectItem key={member.id} value={String(member.id)}>
                        {member.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("workflowSettings.roles.fields.description")}</Label>
              <Textarea
                rows={3}
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("workflowSettings.roles.fields.secondary")}</Label>
              <div className="grid gap-2 md:grid-cols-2">
                {memberOptions.map((member) => {
                  const checked = roleForm.secondaryUserIds.includes(member.id);
                  return (
                    <label key={member.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => {
                          const next = value
                            ? [...roleForm.secondaryUserIds, member.id]
                            : roleForm.secondaryUserIds.filter((id) => id !== member.id);
                          setRoleForm({ ...roleForm, secondaryUserIds: next });
                        }}
                      />
                      <span>{member.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <Button
              onClick={() =>
                createRole.mutate({
                  name: roleForm.name.trim(),
                  description: roleForm.description || null,
                  primaryUserId:
                    roleForm.primaryUserId === "sin_asignar"
                      ? null
                      : Number(roleForm.primaryUserId),
                  secondaryUserIds: roleForm.secondaryUserIds,
                })
              }
              disabled={!roleForm.name.trim() || createRole.isPending}
            >
              {t("workflowSettings.roles.createButton")}
            </Button>

            <div className="space-y-3">
              {roles.map((role: any) => {
                const membersList = membersByRoleId.get(role.id) || [];
                const primary = membersList.find((member: any) => member.isPrimary === 1);
                const secondary = membersList.filter((member: any) => member.isPrimary === 0);
                const primaryLabel = memberOptions.find((m) => m.id === primary?.userId)?.label || "-";
                const secondaryLabels = secondary
                  .map((member: any) => memberOptions.find((m) => m.id === member.userId)?.label || `ID ${member.userId}`)
                  .join(", ");

                return (
                  <Card key={role.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{role.name}</p>
                          <p className="text-xs text-muted-foreground">{role.description || "-"}</p>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Checkbox
                            checked={role.isActive === 1}
                            onCheckedChange={(value) =>
                              updateRole.mutate({ id: role.id, isActive: value ? 1 : 0 })
                            }
                          />
                          {t("workflowSettings.roles.active")}
                        </label>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("workflowSettings.roles.primaryLabel")}: {primaryLabel}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("workflowSettings.roles.secondaryLabel")}: {secondaryLabels || "-"}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("workflowSettings.rules.title")}</CardTitle>
            <CardDescription>{t("workflowSettings.rules.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("workflowSettings.rules.fields.activityType")}</Label>
                <Select
                  value={ruleForm.activityType}
                  onValueChange={(value) => setRuleForm({ ...ruleForm, activityType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {activityTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("workflowSettings.rules.fields.role")}</Label>
                <Select
                  value={ruleForm.roleId}
                  onValueChange={(value) => setRuleForm({ ...ruleForm, roleId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("workflowSettings.rules.fields.rolePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sin_asignar">{t("workflowSettings.roles.unassigned")}</SelectItem>
                    {roles.map((role: any) => (
                      <SelectItem key={role.id} value={String(role.id)}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("workflowSettings.rules.fields.taskTitle")}</Label>
              <Input
                value={ruleForm.taskTitle}
                onChange={(e) => setRuleForm({ ...ruleForm, taskTitle: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("workflowSettings.rules.fields.taskDescription")}</Label>
              <Textarea
                rows={3}
                value={ruleForm.taskDescription}
                onChange={(e) => setRuleForm({ ...ruleForm, taskDescription: e.target.value })}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>{t("workflowSettings.rules.fields.category")}</Label>
                <Select
                  value={ruleForm.category}
                  onValueChange={(value) => setRuleForm({ ...ruleForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DOCUMENTACION">{t("tasksPage.categories.documentation")}</SelectItem>
                    <SelectItem value="SEGUIMIENTO">{t("taskDialogs.edit.categories.followUp")}</SelectItem>
                    <SelectItem value="ESTIMADO">{t("taskDialogs.edit.categories.estimate")}</SelectItem>
                    <SelectItem value="REUNION">{t("tasksPage.categories.meeting")}</SelectItem>
                    <SelectItem value="REVISION">{t("tasksPage.categories.review")}</SelectItem>
                    <SelectItem value="OTRO">{t("taskDialogs.edit.categories.other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("workflowSettings.rules.fields.priority")}</Label>
                <Select
                  value={ruleForm.priority}
                  onValueChange={(value) => setRuleForm({ ...ruleForm, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALTA">{t("tasksPage.priority.high")}</SelectItem>
                    <SelectItem value="MEDIA">{t("tasksPage.priority.medium")}</SelectItem>
                    <SelectItem value="BAJA">{t("tasksPage.priority.low")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("workflowSettings.rules.fields.dueInDays")}</Label>
                <Input
                  type="number"
                  min="0"
                  value={ruleForm.dueInDays}
                  onChange={(e) => setRuleForm({ ...ruleForm, dueInDays: e.target.value })}
                />
              </div>
            </div>

            <Button
              onClick={() =>
                createRule.mutate({
                  activityType: ruleForm.activityType as any,
                  taskTitle: ruleForm.taskTitle.trim(),
                  taskDescription: ruleForm.taskDescription || null,
                  roleId: ruleForm.roleId === "sin_asignar" ? null : Number(ruleForm.roleId),
                  category: ruleForm.category as any,
                  priority: ruleForm.priority as any,
                  dueInDays: ruleForm.dueInDays ? Number(ruleForm.dueInDays) : null,
                })
              }
              disabled={!ruleForm.taskTitle.trim() || createRule.isPending}
            >
              {t("workflowSettings.rules.createButton")}
            </Button>

            <div className="space-y-3">
              {rules.map((rule: any) => (
                <Card key={rule.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{rule.taskTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {t(
                            activityTypeOptions.find((option) => option.value === rule.activityType)?.labelKey ||
                              "workflowSettings.rules.unknownActivity"
                          )}
                        </p>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Checkbox
                          checked={rule.isActive === 1}
                          onCheckedChange={(value) =>
                            updateRule.mutate({ id: rule.id, isActive: value ? 1 : 0 })
                          }
                        />
                        {t("workflowSettings.rules.active")}
                      </label>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t("workflowSettings.rules.roleLabel")}:{" "}
                      {roles.find((role: any) => role.id === rule.roleId)?.name ||
                        t("workflowSettings.roles.unassigned")}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t("workflowSettings.rules.dueLabel")}:{" "}
                      {rule.dueInDays ?? "-"}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
