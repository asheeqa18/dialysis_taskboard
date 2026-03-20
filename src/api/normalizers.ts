import type {
  Patient,
  PatientDTO,
  Task,
  TaskDTO,
  TaskStatus,
  TaskCategory,
  CareRole,
} from "../types";

// ── Type Guards ───────────────────────────────

const VALID_STATUSES: TaskStatus[] = [
  "overdue",
  "due_today",
  "in_progress",
  "completed",
  "upcoming",
];

const VALID_CATEGORIES: TaskCategory[] = [
  "monthly_labs",
  "access_check",
  "diet_counselling",
  "vaccination",
  "social_work",
  "medication_review",
  "other",
];

const VALID_ROLES: CareRole[] = [
  "nurse",
  "dietician",
  "social_worker",
  "physician",
];

function isValidStatus(s: unknown): s is TaskStatus {
  return typeof s === "string" && VALID_STATUSES.includes(s as TaskStatus);
}

function isValidCategory(c: unknown): c is TaskCategory {
  return typeof c === "string" && VALID_CATEGORIES.includes(c as TaskCategory);
}

function isValidRole(r: unknown): r is CareRole {
  return typeof r === "string" && VALID_ROLES.includes(r as CareRole);
}

// Derive status from dueDate if server omits it
function deriveStatus(dueDate: string, serverStatus?: string): TaskStatus {
  if (isValidStatus(serverStatus)) return serverStatus;

  const now = new Date();
  const due = new Date(dueDate);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86_400_000);

  if (due < todayStart) return "overdue";
  if (due >= todayStart && due < todayEnd) return "due_today";
  return "upcoming";
}

// ── Normalization ─────────────────────────────

export function normalizePatient(dto: PatientDTO): Patient {
  return {
    id: dto.id,
    name: dto.name,
    mrn: dto.mrn,
    dialysisType:
      dto.dialysis_type === "PD" ? "PD" : "HD",
    primaryNurse: dto.primary_nurse,
    nextSession: dto.next_session,
  };
}

export function normalizeTask(dto: TaskDTO): Task {
  const dueDate = dto.due_date ?? new Date().toISOString();
  const now = new Date().toISOString();

  return {
    id: dto.id,
    patientId: dto.patient_id,
    title: dto.title ?? "Untitled Task",
    category: isValidCategory(dto.category) ? dto.category : "other",
    status: deriveStatus(dueDate, dto.status),
    assigneeRole: isValidRole(dto.assignee_role) ? dto.assignee_role : "nurse",
    assigneeName: dto.assignee_name,
    dueDate,
    notes: dto.notes,
    createdAt: dto.created_at ?? now,
    updatedAt: dto.updated_at ?? now,
    metadata: dto.metadata,
  };
}

export function normalizePatients(dtos: unknown[]): Patient[] {
  return dtos
    .filter((d): d is PatientDTO => !!d && typeof d === "object" && "id" in d)
    .map(normalizePatient);
}

export function normalizeTasks(dtos: unknown[]): Task[] {
  return dtos
    .filter(
      (d): d is TaskDTO =>
        !!d && typeof d === "object" && "id" in d && "patient_id" in d
    )
    .map(normalizeTask);
}