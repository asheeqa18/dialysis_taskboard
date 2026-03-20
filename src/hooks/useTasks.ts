import { useCallback } from "react";
import { useTaskStore, selectFilteredTasksForPatient } from "../store/taskStore";
import type { TaskStatus, CreateTaskRequest, UpdateTaskRequest } from "../types";

export function usePatientTasks(patientId: string) {
  const tasks = useTaskStore((s) => selectFilteredTasksForPatient(s, patientId));
  const isLoading = useTaskStore((s) => s.isLoadingTasks[patientId] ?? false);
  const error = useTaskStore((s) => s.errors[patientId] ?? null);
  const pendingUpdates = useTaskStore((s) => s.pendingUpdates);

  return { tasks, isLoading, error, pendingUpdates };
}

export function useTaskActions() {
  const createTask = useTaskStore((s) => s.createTask);
  const updateTask = useTaskStore((s) => s.updateTask);
  const updateTaskStatus = useTaskStore((s) => s.updateTaskStatus);

  const handleStatusChange = useCallback(
    (taskId: string, status: TaskStatus) => {
      return updateTaskStatus(taskId, status);
    },
    [updateTaskStatus]
  );

  const handleCreate = useCallback(
    (req: CreateTaskRequest) => {
      return createTask(req);
    },
    [createTask]
  );

  const handleUpdate = useCallback(
    (taskId: string, req: UpdateTaskRequest) => {
      return updateTask(taskId, req);
    },
    [updateTask]
  );

  return { handleStatusChange, handleCreate, handleUpdate };
}

export function useFilters() {
  const filters = useTaskStore((s) => s.filters);
  const setFilters = useTaskStore((s) => s.setFilters);
  return { filters, setFilters };
}

export function useToasts() {
  const toasts = useTaskStore((s) => s.toasts);
  const dismissToast = useTaskStore((s) => s.dismissToast);
  return { toasts, dismissToast };
}

export function useTaskStats() {
  return useTaskStore((s) => {
    const all = Object.values(s.tasks);
    return {
      total: all.length,
      overdue: all.filter((t) => t.status === "overdue").length,
      dueToday: all.filter((t) => t.status === "due_today").length,
      inProgress: all.filter((t) => t.status === "in_progress").length,
      completed: all.filter((t) => t.status === "completed").length,
    };
  });
}