import * as db from "../db";

export const DEFAULT_WORKFLOW_DEPARTMENTS = ["Office", "Public Adjuster", "Construction"];

export const DEFAULT_WORKFLOW_TASK_TEMPLATES = [
  { department: "Office", title: "Upcoming calls", description: "Handle upcoming client calls." },
  { department: "Office", title: "Inform construction date to client", description: "Notify the client about the construction date." },
  { department: "Office", title: "Obtain release letter", description: "Request and collect the release letter." },
  { department: "Office", title: "Send samples to ITEL", description: "Send samples to ITEL for testing." },
  { department: "Office", title: "Send check to mortgage", description: "Send the check to the mortgage company." },
  { department: "Office", title: "Track mortgage check", description: "Follow up on the mortgage check status." },
  { department: "Office", title: "Obtain client check", description: "Coordinate with the client to obtain the check." },
  { department: "Office", title: "Order materials", description: "Place the material order with the supplier." },
  { department: "Public Adjuster", title: "Submit claim", description: "Submit the claim to the carrier." },
  { department: "Public Adjuster", title: "Get adjustment date", description: "Schedule the adjustment date." },
  { department: "Public Adjuster", title: "Attend adjustment", description: "Attend the adjustment appointment." },
  { department: "Public Adjuster", title: "Get adjustment results", description: "Gather and record adjustment results." },
  { department: "Public Adjuster", title: "Upload/send our scope", description: "Upload and send our scope to the carrier." },
  { department: "Public Adjuster", title: "Request reinspection", description: "Request a reinspection." },
  { department: "Public Adjuster", title: "Attend reinspection", description: "Attend the reinspection visit." },
  { department: "Public Adjuster", title: "Send scope", description: "Send the scope to the carrier." },
  { department: "Public Adjuster", title: "Review estimate response", description: "Review the response to our estimate." },
  { department: "Public Adjuster", title: "Collect ITEL sample", description: "Collect a sample for ITEL testing." },
  { department: "Public Adjuster", title: "Start appraisal", description: "Initiate the appraisal process." },
  { department: "Public Adjuster", title: "Send appraisal letter", description: "Send the appraisal letter." },
  { department: "Construction", title: "Create material order", description: "Build the material order for the project." },
  { department: "Construction", title: "Coordinate construction crew", description: "Confirm crew availability and lead." },
  { department: "Construction", title: "Take pre-construction photos", description: "Document property condition before work." },
  { department: "Construction", title: "Review materials", description: "Review materials and quantities." },
  { department: "Construction", title: "Set construction date", description: "Confirm the construction start date." },
  { department: "Construction", title: "Construction day photos", description: "Take photos during construction." },
  { department: "Construction", title: "Completion certificate", description: "Generate the completion certificate." },
  { department: "Construction", title: "Review and issue invoices", description: "Review final costs and issue invoices." },
];

export async function seedWorkflowTemplatesForOrg(params: { organizationId: number; createdBy: number }) {
  for (const deptName of DEFAULT_WORKFLOW_DEPARTMENTS) {
    const existing = await db.getWorkflowRoleByName(deptName, params.organizationId);
    if (!existing) {
      await db.createWorkflowRole({
        name: deptName,
        description: null,
        ownerUserId: null,
        organizationId: params.organizationId,
        createdBy: params.createdBy,
        isActive: 1,
      } as any);
    }
  }

  const existingTemplates = await db.getWorkflowTaskTemplates(params.organizationId);
  const existingTitles = new Set(existingTemplates.map((template: any) => template.title.toLowerCase()));

  for (const template of DEFAULT_WORKFLOW_TASK_TEMPLATES) {
    if (existingTitles.has(template.title.toLowerCase())) continue;
    const department = await db.getWorkflowRoleByName(template.department, params.organizationId);
    await db.createWorkflowTaskTemplate({
      title: template.title,
      description: template.description,
      departmentId: department?.id ?? null,
      departmentName: template.department,
      isActive: 1,
      organizationId: params.organizationId,
      createdBy: params.createdBy,
    } as any);
  }
}

export async function seedWorkflowTemplatesForAllOrganizations() {
  const organizations = await db.getAllOrganizations();
  for (const organization of organizations) {
    const createdBy = organization.ownerId;
    await seedWorkflowTemplatesForOrg({ organizationId: organization.id, createdBy });
  }
}
