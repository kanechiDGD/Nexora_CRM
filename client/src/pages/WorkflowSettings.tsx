import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { usePermissions } from "@/hooks/usePermissions";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DEFAULT_DEPARTMENTS = ["Office", "Public Adjuster", "Construction"];

const DEPARTMENT_STYLES: Record<string, { accent: string; badge: string; text: string }> = {
  office: { accent: "border-amber-300", badge: "bg-amber-100 text-amber-900", text: "text-amber-800" },
  "public adjuster": { accent: "border-sky-300", badge: "bg-sky-100 text-sky-900", text: "text-sky-800" },
  construction: { accent: "border-emerald-300", badge: "bg-emerald-100 text-emerald-900", text: "text-emerald-800" },
};

type DepartmentDraft = {
  ownerUserId: string;
  supervisorUserId: string;
  memberUserIds: number[];
};

export default function WorkflowSettings() {
  const { t } = useTranslation();
  const { canEdit } = usePermissions();
  const utils = trpc.useUtils();

  const { data: members = [] } = trpc.organizations.getMembers.useQuery(undefined, {
    enabled: canEdit,
  });
  const { data: departments = [] } = trpc.workflowRoles.list.useQuery(undefined, {
    enabled: canEdit,
  });
  const { data: roleMembers = [] } = trpc.workflowRoles.listAllMembers.useQuery(undefined, {
    enabled: canEdit,
  });
  const { data: tasksData } = trpc.workflowTaskTemplates.list.useQuery(undefined, {
    enabled: canEdit,
  });

  const [departmentForm, setDepartmentForm] = useState({
    name: "",
    ownerUserId: "",
  });
  const [departmentDrafts, setDepartmentDrafts] = useState<Record<number, DepartmentDraft>>({});
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  const createDepartment = trpc.workflowRoles.create.useMutation({
    onSuccess: () => {
      toast.success(t("workflowSettings.departments.createSuccess"));
      utils.workflowRoles.list.invalidate();
      setDepartmentForm({ name: "", ownerUserId: "" });
    },
    onError: (error) => {
      toast.error(error.message || t("workflowSettings.departments.createError"));
    },
  });

  const updateDepartment = trpc.workflowRoles.update.useMutation({
    onSuccess: () => {
      toast.success(t("workflowSettings.departments.updateSuccess"));
      utils.workflowRoles.list.invalidate();
      utils.workflowRoles.listAllMembers.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || t("workflowSettings.departments.updateError"));
    },
  });

  const updateTemplate = trpc.workflowTaskTemplates.update.useMutation({
    onSuccess: () => {
      utils.workflowTaskTemplates.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || t("workflowSettings.tasks.updateError"));
    },
  });

  const memberOptions = useMemo(
    () =>
      members.map((member: any) => ({
        id: member.userId || member.id,
        label: member.username || member.name || member.email || `ID ${member.id}`,
      })),
    [members]
  );

  const tasks = tasksData?.templates ?? [];
  const assignees = tasksData?.assignees ?? [];

  const assigneesByTaskId = useMemo(() => {
    const map = new Map<number, number[]>();
    assignees.forEach((assignment: any) => {
      const list = map.get(assignment.templateId) || [];
      list.push(assignment.userId);
      map.set(assignment.templateId, list);
    });
    return map;
  }, [assignees]);

  const membersByRoleId = useMemo(() => {
    const map = new Map<number, { supervisorId: number | null; memberIds: number[] }>();
    roleMembers.forEach((member: any) => {
      const existing = map.get(member.roleId) || { supervisorId: null, memberIds: [] };
      if (member.isPrimary === 1) {
        existing.supervisorId = member.userId;
      } else {
        existing.memberIds.push(member.userId);
      }
      map.set(member.roleId, existing);
    });
    return map;
  }, [roleMembers]);

  const getTaskAssignees = (task: any) => assigneesByTaskId.get(task.id) || [];
  const selectedTemplate = selectedTemplateId
    ? tasks.find((task: any) => task.id === selectedTemplateId)
    : null;
  const selectedAssignees = selectedTemplate
    ? getTaskAssignees(selectedTemplate)
    : [];

  const allowedDepartments = useMemo(
    () => new Set(DEFAULT_DEPARTMENTS.map((name) => name.toLowerCase())),
    []
  );

  const visibleDepartments = useMemo(
    () => departments.filter((dept: any) => allowedDepartments.has((dept.name || "").toLowerCase())),
    [departments, allowedDepartments]
  );

  const departmentOrder = useMemo(() => {
    const baseOrder = DEFAULT_DEPARTMENTS.map((name) => name.toLowerCase());
    return [...visibleDepartments].sort((a: any, b: any) => {
      const aKey = (a.name || "").toLowerCase();
      const bKey = (b.name || "").toLowerCase();
      const aIndex = baseOrder.indexOf(aKey);
      const bIndex = baseOrder.indexOf(bKey);
      if (aIndex === -1 && bIndex === -1) return a.name.localeCompare(b.name);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [visibleDepartments]);

  const getDeptStyle = (name: string) =>
    DEPARTMENT_STYLES[name.toLowerCase()] || {
      accent: "border-slate-200",
      badge: "bg-slate-100 text-slate-900",
      text: "text-slate-700",
    };

  const masterTasks = [...tasks]
    .filter((task: any) => {
      const deptName = visibleDepartments.find((dept: any) => dept.id === task.departmentId)?.name;
      return deptName ? allowedDepartments.has(deptName.toLowerCase()) : false;
    })
    .sort((a: any, b: any) => {
      const aDept = visibleDepartments.find((dept: any) => dept.id === a.departmentId)?.name || "";
      const bDept = visibleDepartments.find((dept: any) => dept.id === b.departmentId)?.name || "";
      if (aDept !== bDept) return aDept.localeCompare(bDept);
      return a.title.localeCompare(b.title);
    });

  const templatesByDept = useMemo(() => {
    const map = new Map<number, any[]>();
    masterTasks.forEach((task: any) => {
      const list = map.get(task.departmentId) || [];
      list.push(task);
      map.set(task.departmentId, list);
    });
    return map;
  }, [masterTasks]);

  useEffect(() => {
    const nextDrafts: Record<number, DepartmentDraft> = {};
    departments.forEach((dept: any) => {
      const membersInfo = membersByRoleId.get(dept.id) || { supervisorId: null, memberIds: [] };
      nextDrafts[dept.id] = {
        ownerUserId: dept.ownerUserId ? String(dept.ownerUserId) : "",
        supervisorUserId: membersInfo.supervisorId ? String(membersInfo.supervisorId) : "",
        memberUserIds: membersInfo.memberIds,
      };
    });

    setDepartmentDrafts((prev) => {
      let changed = false;
      const keys = Object.keys(nextDrafts);
      if (Object.keys(prev).length !== keys.length) {
        changed = true;
      } else {
        for (const key of keys) {
          const next = nextDrafts[Number(key)];
          const current = prev[Number(key)];
          if (!current) {
            changed = true;
            break;
          }
          const sameOwner = current.ownerUserId === next.ownerUserId;
          const sameSupervisor = current.supervisorUserId === next.supervisorUserId;
          const sameMembers =
            current.memberUserIds.length === next.memberUserIds.length &&
            current.memberUserIds.every((id) => next.memberUserIds.includes(id));
          if (!(sameOwner && sameSupervisor && sameMembers)) {
            changed = true;
            break;
          }
        }
      }

      return changed ? nextDrafts : prev;
    });
  }, [departments, membersByRoleId]);

  const saveDepartment = (deptId: number) => {
    const draft = departmentDrafts[deptId];
    if (!draft) return;
    updateDepartment.mutate({
      id: deptId,
      ownerUserId: draft.ownerUserId ? Number(draft.ownerUserId) : null,
      supervisorUserId: draft.supervisorUserId ? Number(draft.supervisorUserId) : null,
      memberUserIds: draft.memberUserIds,
    });
  };

  const toggleDepartmentMember = (deptId: number, userId: number) => {
    setDepartmentDrafts((prev) => {
      const draft = prev[deptId];
      if (!draft) return prev;
      const exists = draft.memberUserIds.includes(userId);
      const nextMembers = exists
        ? draft.memberUserIds.filter((id) => id !== userId)
        : [...draft.memberUserIds, userId];
      return {
        ...prev,
        [deptId]: {
          ...draft,
          memberUserIds: nextMembers,
        },
      };
    });
  };

  const assignTemplateToMember = (templateId: number, userId: number) => {
    updateTemplate.mutate({ id: templateId, assigneeIds: [userId] });
  };

  const clearTemplateAssignment = (templateId: number) => {
    updateTemplate.mutate({ id: templateId, assigneeIds: [] });
  };

  const assignTaskDepartment = (taskId: number, departmentId: number | null) => {
    updateTemplate.mutate({ id: taskId, departmentId });
  };

  const ensureDepartmentDraft = (deptId: number): DepartmentDraft => {
    return (
      departmentDrafts[deptId] || {
        ownerUserId: "",
        supervisorUserId: "",
        memberUserIds: [],
      }
    );
  };

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
            <CardTitle>{t("workflowSettings.departments.title")}</CardTitle>
            <CardDescription>{t("workflowSettings.departments.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[1.5fr_1fr_auto]">
              <div className="space-y-2">
                <Label>{t("workflowSettings.departments.fields.name")}</Label>
                <Input
                  value={departmentForm.name}
                  onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
                  placeholder={t("workflowSettings.departments.fields.namePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("workflowSettings.departments.fields.owner")}</Label>
                <Select
                  value={departmentForm.ownerUserId}
                  onValueChange={(value) =>
                    setDepartmentForm({
                      ...departmentForm,
                      ownerUserId: value === "unassigned" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("workflowSettings.departments.fields.ownerPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">{t("workflowSettings.departments.unassigned")}</SelectItem>
                    {memberOptions.map((member) => (
                      <SelectItem key={member.id} value={String(member.id)}>
                        {member.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() =>
                    createDepartment.mutate({
                      name: departmentForm.name.trim(),
                      ownerUserId: departmentForm.ownerUserId ? Number(departmentForm.ownerUserId) : null,
                    })
                  }
                  disabled={!departmentForm.name.trim() || createDepartment.isPending}
                >
                  {t("workflowSettings.departments.createButton")}
                </Button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              {t("workflowSettings.departments.defaultHint", { list: DEFAULT_DEPARTMENTS.join(", ") })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("workflowSettings.tasks.masterTitle")}</CardTitle>
              <CardDescription>{t("workflowSettings.tasks.masterSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              {masterTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("workflowSettings.tasks.empty")}</p>
              ) : (
                <div className="space-y-6">
                  {departmentOrder.map((dept: any) => {
                    const deptTasks = templatesByDept.get(dept.id) || [];
                    const style = getDeptStyle(dept.name);
                    if (deptTasks.length === 0) return null;
                    return (
                      <div key={dept.id} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-xs font-semibold px-2 py-1 rounded-full", style.badge)}>
                            {dept.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {t("workflowSettings.tasks.masterPick")}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {deptTasks.map((task: any) => {
                            const isUnassigned = getTaskAssignees(task).length === 0;
                            return (
                              <button
                                key={task.id}
                                type="button"
                                onClick={() => setSelectedTemplateId(task.id)}
                                className={cn(
                                  "px-3 py-2 rounded-full text-xs border transition font-medium bg-white text-slate-900 border-muted",
                                  isUnassigned ? "bg-red-100 border-red-200 text-slate-900" : ""
                                )}
                              >
                                {task.title}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            {departmentOrder.map((dept: any) => {
              const style = getDeptStyle(dept.name);
              const draft = ensureDepartmentDraft(dept.id);
              const membersInfo = membersByRoleId.get(dept.id) || { supervisorId: null, memberIds: [] };
            const memberIds = draft.memberUserIds;
            const deptTasks = tasks.filter((task: any) => task.departmentId === dept.id);

            return (
              <Card key={dept.id} className={cn("border-2", style.accent)}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{dept.name}</span>
                      <span className={cn("text-xs font-semibold px-2 py-1 rounded-full", style.badge)}>
                        {t("workflowSettings.departments.department")}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => saveDepartment(dept.id)}
                      disabled={updateDepartment.isPending}
                    >
                      {t("workflowSettings.departments.saveButton")}
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    {t("workflowSettings.departments.ownerLabel")}: {memberOptions.find((m) => m.id === dept.ownerUserId)?.label || "-"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{t("workflowSettings.departments.fields.owner")}</Label>
                      <Select
                      value={draft.ownerUserId || "unassigned"}
                        onValueChange={(value) =>
                          setDepartmentDrafts((prev) => ({
                            ...prev,
                            [dept.id]: { ...draft, ownerUserId: value === "unassigned" ? "" : value },
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("workflowSettings.departments.fields.ownerPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">{t("workflowSettings.departments.unassigned")}</SelectItem>
                          {memberOptions.map((member) => (
                            <SelectItem key={member.id} value={String(member.id)}>
                              {member.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("workflowSettings.departments.fields.supervisor")}</Label>
                      <Select
                        value={draft.supervisorUserId || "unassigned"}
                        onValueChange={(value) =>
                          setDepartmentDrafts((prev) => ({
                            ...prev,
                            [dept.id]: { ...draft, supervisorUserId: value === "unassigned" ? "" : value },
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("workflowSettings.departments.fields.supervisorPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">{t("workflowSettings.departments.unassigned")}</SelectItem>
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
                    <Label>{t("workflowSettings.departments.fields.members")}</Label>
                    <div className="grid gap-2 md:grid-cols-2">
                      {memberOptions.map((member) => {
                        const checked = memberIds.includes(member.id);
                        return (
                          <label key={member.id} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleDepartmentMember(dept.id, member.id)}
                            />
                            <span>{member.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{t("workflowSettings.tasks.title")}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("workflowSettings.tasks.subtitle")}
                        </p>
                      </div>
                    </div>

                    {deptTasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {t("workflowSettings.tasks.empty")}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {deptTasks.map((task: any) => {
                          const taskAssignees = getTaskAssignees(task);
                          const isUnassigned = taskAssignees.length === 0;
                          const assignedLabels = taskAssignees
                            .map((id) => memberOptions.find((member) => member.id === id)?.label)
                            .filter(Boolean);
                          return (
                            <div
                              key={task.id}
                              className={cn("rounded-lg border p-3 space-y-2", style.accent)}
                            >
                              <div className="flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={() => setSelectedTemplateId(task.id)}
                                  className="text-left"
                                >
                                  <p
                                    className={cn(
                                      "font-medium",
                                      isUnassigned ? "text-red-700" : "text-foreground"
                                    )}
                                  >
                                    {task.title}
                                  </p>
                                  {task.description && (
                                    <p className="text-xs text-muted-foreground">{task.description}</p>
                                  )}
                                </button>
                                <span
                                  className={cn(
                                    "text-xs font-semibold",
                                    isUnassigned ? "text-red-600" : style.text
                                  )}
                                >
                                  {isUnassigned
                                    ? t("workflowSettings.tasks.unassigned")
                                    : t("workflowSettings.tasks.assigned")}
                                </span>
                              </div>
                              {assignedLabels.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {assignedLabels.map((label) => (
                                    <span key={label} className="px-2 py-1 rounded-full text-xs bg-slate-900 text-white">
                                      {label}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {assignedLabels.length === 0 && (
                                <p className="text-xs text-muted-foreground">
                                  {t("workflowSettings.tasks.noMembers")}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          </div>

          {tasks.some((task: any) => !task.departmentId) && (
            <Card>
              <CardHeader>
                <CardTitle>{t("workflowSettings.tasks.unassignedDeptTitle")}</CardTitle>
                <CardDescription>{t("workflowSettings.tasks.unassignedDeptSubtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {tasks.filter((task: any) => !task.departmentId).map((task: any) => (
                  <div key={task.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground">{task.description}</p>
                        )}
                      </div>
                      <Select
                        value={task.departmentId ? String(task.departmentId) : "unassigned"}
                        onValueChange={(value) =>
                          assignTaskDepartment(task.id, value === "unassigned" ? null : Number(value))
                        }
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder={t("workflowSettings.tasks.assignDepartment")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">{t("workflowSettings.departments.unassigned")}</SelectItem>
                          {visibleDepartments.map((dept: any) => (
                            <SelectItem key={dept.id} value={String(dept.id)}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <Dialog open={selectedTemplateId !== null} onOpenChange={(open) => !open && setSelectedTemplateId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.title || t("workflowSettings.tasks.masterAssign")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("workflowSettings.tasks.masterPick")}</p>
            <div className="flex flex-wrap gap-2">
              {memberOptions.map((member) => {
                const active = selectedAssignees.includes(member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => selectedTemplate && assignTemplateToMember(selectedTemplate.id, member.id)}
                    className={cn(
                      "px-2 py-1 rounded-full text-xs border",
                      active ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-foreground border-muted"
                    )}
                  >
                    {member.label}
                  </button>
                );
              })}
            </div>
            {selectedTemplate && selectedAssignees.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => clearTemplateAssignment(selectedTemplate.id)}
              >
                {t("workflowSettings.tasks.clearAssignment")}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
