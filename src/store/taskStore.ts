import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import type {
  Patient,
  Task,
  TaskFilters,
  TaskStatus,
  CareRole,
  CreateTaskRequest,
  UpdateTaskRequest,
  ApiError,
  OptimisticUpdate,
  TimeWindow
} from "../types";
import { apiClient } from "../api/client";

// ── State Shape ───────────────────────────────

interface TaskStore {
  patients: Patient[];
  tasks: Record<string, Task>;
  tasksByPatient: Record<string, string[]>;
  filters: TaskFilters;
  selectedPatientId: string | null;
  isLoadingPatients: boolean;
  isLoadingTasks: Record<string, boolean>;
  errors: Record<string, ApiError | null>;
  pendingUpdates: Record<string, OptimisticUpdate>;
  toasts: Toast[];

  fetchPatients: () => Promise<void>;
  fetchTasksForPatient: (patientId: string) => Promise<void>;
  fetchAllTasks: () => Promise<void>;
  createTask: (req: CreateTaskRequest) => Promise<void>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  updateTask: (taskId: string, req: UpdateTaskRequest) => Promise<void>;
  setFilters: (filters: Partial<TaskFilters>) => void;
  selectPatient: (patientId: string | null) => void;
  dismissToast: (id: string) => void;
  _pushToast: (toast: Omit<Toast, "id">) => void;
}

export interface Toast {
  id: string;
  type: "error" | "success" | "info" | "warning";
  message: string;
  action?: { label: string; onClick: () => void };
}

let toastIdCounter = 0;
function makeToastId() {
  return `toast-${++toastIdCounter}-${Date.now()}`;
}

function buildOptimisticTask(existing: Task, req: UpdateTaskRequest): Task {
  return {
    ...existing,
    ...(req.status && { status: req.status }),
    ...(req.assigneeRole && { assigneeRole: req.assigneeRole }),
    ...(req.dueDate && { dueDate: req.dueDate }),
    ...(req.notes !== undefined && { notes: req.notes }),
    updatedAt: new Date().toISOString(),
  };
}

// ── Store ─────────────────────────────────────

export const useTaskStore = create<TaskStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      patients: [],
      tasks: {},
      tasksByPatient: {},
      filters: { roles: [], timeWindows: [] },
      selectedPatientId: null,
      isLoadingPatients: false,
      isLoadingTasks: {},
      errors: {},
      pendingUpdates: {},
      toasts: [],

      fetchPatients: async () => {
        set({ isLoadingPatients: true, errors: { ...get().errors, patients: null } });
        try {
          const patients = await apiClient.getPatients();
          set({ patients, isLoadingPatients: false });
        } catch (err) {
          const apiErr = err as ApiError;
          set({
            isLoadingPatients: false,
            errors: { ...get().errors, patients: apiErr },
          });
          get()._pushToast({ type: "error", message: "Failed to load patients" });
        }
      },

      fetchTasksForPatient: async (patientId: string) => {
        set({
          isLoadingTasks: { ...get().isLoadingTasks, [patientId]: true },
          errors: { ...get().errors, [patientId]: null },
        });
        try {
          const fetched = await apiClient.getTasksForPatient(patientId);
          const tasks = { ...get().tasks };
          const ids: string[] = [];
          for (const t of fetched) {
            tasks[t.id] = t;
            ids.push(t.id);
          }
          set({
            tasks,
            tasksByPatient: { ...get().tasksByPatient, [patientId]: ids },
            isLoadingTasks: { ...get().isLoadingTasks, [patientId]: false },
          });
        } catch (err) {
          const apiErr = err as ApiError;
          set({
            isLoadingTasks: { ...get().isLoadingTasks, [patientId]: false },
            errors: { ...get().errors, [patientId]: apiErr },
          });
        }
      },

      fetchAllTasks: async () => {
        const { patients, fetchTasksForPatient } = get();
        await Promise.allSettled(patients.map((p) => fetchTasksForPatient(p.id)));
      },

      createTask: async (req: CreateTaskRequest) => {
        const tempId = `optimistic-${Date.now()}`;
        const optimisticTask: Task = {
          id: tempId,
          patientId: req.patientId,
          title: req.title,
          category: req.category,
          status: "upcoming",
          assigneeRole: req.assigneeRole,
          dueDate: req.dueDate,
          notes: req.notes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const prevIds = get().tasksByPatient[req.patientId] ?? [];
        set({
          tasks: { ...get().tasks, [tempId]: optimisticTask },
          tasksByPatient: {
            ...get().tasksByPatient,
            [req.patientId]: [...prevIds, tempId],
          },
        });

        try {
          const confirmed = await apiClient.createTask(req);
          const tasks = { ...get().tasks };
          delete tasks[tempId];
          tasks[confirmed.id] = confirmed;
          const ids = (get().tasksByPatient[req.patientId] ?? [])
            .filter((id) => id !== tempId)
            .concat(confirmed.id);
          set({
            tasks,
            tasksByPatient: { ...get().tasksByPatient, [req.patientId]: ids },
          });
          get()._pushToast({ type: "success", message: "Task created" });
        } catch (err) {
          const tasks = { ...get().tasks };
          delete tasks[tempId];
          const ids = (get().tasksByPatient[req.patientId] ?? []).filter(
            (id) => id !== tempId
          );
          set({
            tasks,
            tasksByPatient: { ...get().tasksByPatient, [req.patientId]: ids },
          });
          get()._pushToast({
            type: "error",
            message: `Failed to create task: ${(err as ApiError).message}`,
          });
          throw err;
        }
      },

      updateTaskStatus: async (taskId: string, status: TaskStatus) => {
        return get().updateTask(taskId, { status });
      },

      updateTask: async (taskId: string, req: UpdateTaskRequest) => {
        const existing = get().tasks[taskId];
        if (!existing) return;

        const snapshot: OptimisticUpdate = {
          taskId,
          previousTask: existing,
          timestamp: Date.now(),
        };

        const optimistic = buildOptimisticTask(existing, req);
        set({
          tasks: { ...get().tasks, [taskId]: optimistic },
          pendingUpdates: { ...get().pendingUpdates, [taskId]: snapshot },
        });

        try {
          const confirmed = await apiClient.updateTask(taskId, req);
          const pending = { ...get().pendingUpdates };
          delete pending[taskId];
          set({
            tasks: { ...get().tasks, [taskId]: confirmed },
            pendingUpdates: pending,
          });
        } catch (err) {
          const pending = { ...get().pendingUpdates };
          delete pending[taskId];
          set({
            tasks: { ...get().tasks, [taskId]: snapshot.previousTask },
            pendingUpdates: pending,
          });
          const apiErr = err as ApiError;
          get()._pushToast({
            type: "error",
            message: `Update failed — reverted. ${apiErr.retryable ? "Retrying…" : ""}`,
            action: apiErr.retryable
              ? {
                  label: "Retry",
                  onClick: () => get().updateTask(taskId, req),
                }
              : undefined,
          });
          throw err;
        }
      },

      setFilters: (partial) => {
        set({ filters: { ...get().filters, ...partial } });
      },

      selectPatient: (patientId) => {
        set({ selectedPatientId: patientId });
      },

      _pushToast(toast: Omit<Toast, "id">) {
        const id = makeToastId();
        set({ toasts: [...get().toasts, { ...toast, id }] });
        setTimeout(() => get().dismissToast(id), 5000);
      },

      dismissToast: (id) => {
        set({ toasts: get().toasts.filter((t) => t.id !== id) });
      },
    })),
    { name: "DialysisTaskStore" }
  )
);

// ── Derived Selectors ─────────────────────────

export function selectFilteredTasksForPatient(
  state: TaskStore,
  patientId: string
): Task[] {
  const ids = state.tasksByPatient[patientId] ?? [];
  const tasks = ids.map((id) => state.tasks[id]).filter(Boolean) as Task[];
  const { roles, timeWindows } = state.filters;

  return tasks.filter((task) => {
    if (roles.length > 0 && !roles.includes(task.assigneeRole)) return false;
    if (timeWindows.length > 0) {
      const tw = taskStatusToTimeWindow(task.status);
      if (!timeWindows.includes(tw)) return false;
    }
    return true;
  });
}

function taskStatusToTimeWindow(status: Task["status"]): TimeWindow{
  if (status === "overdue") return "overdue";
  if (status === "due_today") return "due_today";
  if (status === "completed") return "completed";
  return "upcoming";
}

export function selectOverdueCount(state: TaskStore): number {
  return Object.values(state.tasks).filter((t) => t.status === "overdue").length;
}

export function selectTaskCountByStatus(
  state: TaskStore
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const task of Object.values(state.tasks)) {
    counts[task.status] = (counts[task.status] ?? 0) + 1;
  }
  return counts;
}