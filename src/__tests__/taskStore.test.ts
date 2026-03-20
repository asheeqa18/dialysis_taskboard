import { describe, it, expect, beforeEach } from "vitest";
import { act } from "@testing-library/react";
import { useTaskStore, selectFilteredTasksForPatient } from "../store/taskStore";
import type { Task, Patient } from "../types";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    patientId: "p1",
    title: "Monthly labs",
    category: "monthly_labs",
    status: "upcoming",
    assigneeRole: "nurse",
    dueDate: new Date(Date.now() + 86_400_000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: "p1",
    name: "Test Patient",
    mrn: "MRN-001",
    dialysisType: "HD",
    ...overrides,
  };
}

function seedStore(tasks: Task[], patients: Patient[] = [makePatient()]) {
  const taskMap: Record<string, Task> = {};
  const tasksByPatient: Record<string, string[]> = {};
  for (const t of tasks) {
    taskMap[t.id] = t;
    tasksByPatient[t.patientId] = [...(tasksByPatient[t.patientId] ?? []), t.id];
  }
  useTaskStore.setState({ tasks: taskMap, tasksByPatient, patients });
}

beforeEach(() => {
  useTaskStore.setState({
    patients: [],
    tasks: {},
    tasksByPatient: {},
    filters: { roles: [], timeWindows: [] },
    pendingUpdates: {},
    toasts: [],
    isLoadingPatients: false,
    isLoadingTasks: {},
    errors: {},
  });
});

describe("selectFilteredTasksForPatient", () => {
  it("returns all tasks when no filters active", () => {
    const tasks = [
      makeTask({ id: "t1", assigneeRole: "nurse", status: "overdue" }),
      makeTask({ id: "t2", assigneeRole: "dietician", status: "upcoming" }),
      makeTask({ id: "t3", assigneeRole: "social_worker", status: "completed" }),
    ];
    seedStore(tasks);
    const state = useTaskStore.getState();
    const result = selectFilteredTasksForPatient(state, "p1");
    expect(result).toHaveLength(3);
  });

  it("filters by role", () => {
    const tasks = [
      makeTask({ id: "t1", assigneeRole: "nurse" }),
      makeTask({ id: "t2", assigneeRole: "dietician" }),
    ];
    seedStore(tasks);
    act(() => { useTaskStore.getState().setFilters({ roles: ["nurse"] }); });
    const result = selectFilteredTasksForPatient(useTaskStore.getState(), "p1");
    expect(result).toHaveLength(1);
    expect(result[0].assigneeRole).toBe("nurse");
  });

  it("filters by time window", () => {
    const tasks = [
      makeTask({ id: "t1", status: "overdue" }),
      makeTask({ id: "t2", status: "upcoming" }),
      makeTask({ id: "t3", status: "completed" }),
    ];
    seedStore(tasks);
    act(() => { useTaskStore.getState().setFilters({ timeWindows: ["overdue"] }); });
    const result = selectFilteredTasksForPatient(useTaskStore.getState(), "p1");
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("overdue");
  });

  it("combines role + time window filters", () => {
    const tasks = [
      makeTask({ id: "t1", assigneeRole: "nurse", status: "overdue" }),
      makeTask({ id: "t2", assigneeRole: "nurse", status: "upcoming" }),
      makeTask({ id: "t3", assigneeRole: "dietician", status: "overdue" }),
    ];
    seedStore(tasks);
    act(() => {
      useTaskStore.getState().setFilters({ roles: ["nurse"], timeWindows: ["overdue"] });
    });
    const result = selectFilteredTasksForPatient(useTaskStore.getState(), "p1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("t1");
  });
});

describe("optimistic rollback", () => {
  it("reverts task status after simulated failure", () => {
    const task = makeTask({ status: "upcoming" });
    seedStore([task]);

    act(() => {
      useTaskStore.setState((s) => ({
        tasks: { ...s.tasks, [task.id]: { ...task, status: "completed" } },
        pendingUpdates: {
          [task.id]: { taskId: task.id, previousTask: task, timestamp: Date.now() },
        },
      }));
    });

    expect(useTaskStore.getState().tasks[task.id].status).toBe("completed");

    act(() => {
      const pending = { ...useTaskStore.getState().pendingUpdates };
      const snapshot = pending[task.id];
      delete pending[task.id];
      useTaskStore.setState((s) => ({
        tasks: { ...s.tasks, [task.id]: snapshot.previousTask },
        pendingUpdates: pending,
      }));
    });

    expect(useTaskStore.getState().tasks[task.id].status).toBe("upcoming");
    expect(useTaskStore.getState().pendingUpdates[task.id]).toBeUndefined();
  });
});

describe("toast management", () => {
  it("adds and dismisses a toast", () => {
    act(() => {
      useTaskStore.getState()._pushToast({ type: "info", message: "Hello" });
    });
    const id = useTaskStore.getState().toasts[0].id;
    act(() => { useTaskStore.getState().dismissToast(id); });
    expect(useTaskStore.getState().toasts).toHaveLength(0);
  });
});