import { logger } from "../_core/logger";
import {
  createScheduledTask,
  getPendingScheduledTasks,
  getScheduledTaskByDedupeKey,
  markScheduledTaskCompleted,
  createTask,
  getTasksByClientId,
  getWorkflowRoleByName,
  createWorkflowRole,
  getWorkflowTaskTemplateByTitle,
  getWorkflowTaskTemplateAssigneesByTemplateId,
  replaceTaskAssignees,
} from "../db";

type ScheduledTaskPayload = {
  title: string;
  description?: string | null;
  category?: "DOCUMENTACION" | "SEGUIMIENTO" | "ESTIMADO" | "REUNION" | "REVISION" | "OTRO";
  priority?: "ALTA" | "MEDIA" | "BAJA";
  dueDate?: string | null;
  departmentName?: string | null;
  clientId?: string | null;
  attachments?: string | null;
  createdBy: number;
};

async function ensureDepartmentId(organizationId: number, name: string, createdBy: number) {
  const existing = await getWorkflowRoleByName(name, organizationId);
  if (existing) return existing.id;
  const result = await createWorkflowRole({
    name,
    description: null,
    ownerUserId: null,
    organizationId,
    createdBy,
    isActive: 1,
  } as any);
  const insertedId = (result as any)?.insertId;
  return insertedId ? Number(insertedId) : null;
}

export async function scheduleTaskIfMissing(params: {
  organizationId: number;
  clientId?: string | null;
  taskType: string;
  runAt: Date;
  payload: ScheduledTaskPayload;
  dedupeKey: string;
  createdBy: number;
}) {
  const existing = await getScheduledTaskByDedupeKey(params.organizationId, params.dedupeKey);
  if (existing) return;
  await createScheduledTask({
    organizationId: params.organizationId,
    clientId: params.clientId ?? null,
    taskType: params.taskType,
    runAt: params.runAt,
    status: "PENDING",
    payload: JSON.stringify(params.payload),
    dedupeKey: params.dedupeKey,
    createdBy: params.createdBy,
    createdAt: new Date(),
    completedAt: null,
  });
}

export async function processScheduledTasks(limit: number = 50) {
  const now = new Date();
  const pending = await getPendingScheduledTasks(now, limit);
  if (!pending.length) return 0;

  let processed = 0;
  for (const task of pending) {
    try {
      const payload = task.payload ? (JSON.parse(task.payload) as ScheduledTaskPayload) : null;
      if (!payload || !payload.title) {
        await markScheduledTaskCompleted(task.id, task.organizationId);
        continue;
      }

      if (payload.clientId) {
        const existing = await getTasksByClientId(payload.clientId, task.organizationId);
        if (existing.some((t: any) => t.title === payload.title)) {
          await markScheduledTaskCompleted(task.id, task.organizationId);
          continue;
        }
      }

      let departmentId: number | null = null;
      if (payload.departmentName) {
        departmentId = await ensureDepartmentId(task.organizationId, payload.departmentName, payload.createdBy);
      }

      const template = await getWorkflowTaskTemplateByTitle(task.organizationId, payload.title);
      const templateAssignees = template
        ? await getWorkflowTaskTemplateAssigneesByTemplateId(template.id, task.organizationId)
        : [];
      const assigneeIds = templateAssignees.map((row: any) => row.userId);
      const primaryAssignee = assigneeIds.length ? assigneeIds[0] : null;

      const result = await createTask({
        clientId: payload.clientId ?? null,
        title: payload.title,
        description: payload.description ?? null,
        category: payload.category ?? "SEGUIMIENTO",
        priority: payload.priority ?? "MEDIA",
        status: "PENDIENTE",
        departmentId,
        assignedTo: primaryAssignee,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        completedAt: null,
        attachments: payload.attachments ?? null,
        organizationId: task.organizationId,
        createdBy: payload.createdBy,
        updatedBy: payload.createdBy,
      });
      const taskId = (result as any)?.insertId ? Number((result as any).insertId) : null;
      if (taskId && assigneeIds.length) {
        await replaceTaskAssignees(taskId, task.organizationId, assigneeIds);
      }

      await markScheduledTaskCompleted(task.id, task.organizationId);
      processed += 1;
    } catch (error) {
      logger.error("[ScheduledTasks] Failed to process scheduled task", { taskId: task.id, error });
    }
  }

  return processed;
}
