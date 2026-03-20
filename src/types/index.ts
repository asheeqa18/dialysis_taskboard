// ─────────────────────────────────────────────
// DATA CONTRACTS — Dialysis Task Management
// ─────────────────────────────────────────────

// ── Enumerations ──────────────────────────────

export type TaskStatus = "overdue" | "due_today" | "in_progress" | "completed" | "upcoming";

export type TaskCategory =
  | "monthly_labs"
  | "access_check"
  | "diet_counselling"
  | "vaccination"
  | "social_work"
  | "medication_review"
  | "other";

export type CareRole = "nurse" | "dietician" | "social_worker" | "physician";

// Extensibility: to add a new role, add it here. The FilterBar and assignee
// dropdowns are driven off this union — no other changes required.

// ── Domain Models ─────────────────────────────

export interface Patient {
  id: string;
  name: string;
  mrn: string;                       // Medical Record Number
  dialysisType: "HD" | "PD";        // Haemodialysis | Peritoneal
  primaryNurse?: string;
  /** ISO-8601 date of next scheduled session */
  nextSession?: string;
}

export interface Task {
  id: string;
  patientId: string;
  title: string;
  category: TaskCategory;
  status: TaskStatus;
  assigneeRole: CareRole;
  assigneeName?: string;             // Optional: resolved display name
  dueDate: string;                   // ISO-8601
  notes?: string;
  createdAt: string;                 // ISO-8601
  updatedAt: string;                 // ISO-8601
  // Extensibility: adding a new task type = new TaskCategory value +
  // optional category-specific metadata below:
  metadata?: Record<string, unknown>;
}

// ── API DTOs (what the wire sends) ────────────
// Deliberately looser than domain models — guards handle coercion.

export interface PatientDTO {
  id: string;
  name: string;
  mrn: string;
  dialysis_type?: string;
  primary_nurse?: string;
  next_session?: string;
}

export interface TaskDTO {
  id: string;
  patient_id: string;
  title: string;
  category?: string;
  status?: string;
  assignee_role?: string;
  assignee_name?: string;
  due_date: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, unknown>;
}

// ── Request / Response shapes ─────────────────

export interface CreateTaskRequest {
  patientId: string;
  title: string;
  category: TaskCategory;
  assigneeRole: CareRole;
  dueDate: string;
  notes?: string;
}

export interface UpdateTaskRequest {
  status?: TaskStatus;
  assigneeRole?: CareRole;
  assigneeName?: string;
  dueDate?: string;
  notes?: string;
}

// ── Filter State ──────────────────────────────

export interface TaskFilters {
  roles: CareRole[];
  timeWindows: TimeWindow[];
}

export type TimeWindow = "overdue" | "due_today" | "upcoming" | "completed";

// ── UI State helpers ──────────────────────────

export interface OptimisticUpdate {
  taskId: string;
  previousTask: Task;
  timestamp: number;
}

export type NetworkStatus = "idle" | "loading" | "success" | "error";

export interface ApiError {
  status: number;
  message: string;
  retryable: boolean;
}