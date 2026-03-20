import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TaskCard } from "../components/TaskCard/TaskCard";
import { useTaskStore } from "../store/taskStore";
import type { Task } from "../types";

const mockUpdateTask = vi.fn();
vi.mock("../api/client", () => ({
  apiClient: { updateTask: (...args: unknown[]) => mockUpdateTask(...args) },
}));

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-99",
    patientId: "p1",
    title: "AV Fistula Assessment",
    category: "access_check",
    status: "upcoming",
    assigneeRole: "nurse",
    assigneeName: "Kavitha R.",
    dueDate: new Date(Date.now() + 86_400_000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function seedTask(task: Task) {
  useTaskStore.setState({
    tasks: { [task.id]: task },
    tasksByPatient: { [task.patientId]: [task.id] },
    pendingUpdates: {},
    toasts: [],
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  useTaskStore.setState({
    tasks: {},
    tasksByPatient: {},
    pendingUpdates: {},
    toasts: [],
    errors: {},
    filters: { roles: [], timeWindows: [] },
  });
});

describe("TaskCard rendering", () => {
  it("renders task title", () => {
    const task = makeTask();
    seedTask(task);
    render(<TaskCard task={task} />);
    expect(screen.getByText("AV Fistula Assessment")).toBeInTheDocument();
  });

  it("renders assignee name when present", () => {
    const task = makeTask({ assigneeName: "Kavitha R." });
    seedTask(task);
    render(<TaskCard task={task} />);
    expect(screen.getByText("Kavitha R.")).toBeInTheDocument();
  });

  it("shows Unassigned when no assigneeName", () => {
    const task = makeTask({ assigneeName: undefined });
    seedTask(task);
    render(<TaskCard task={task} />);
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });

  it("shows notes when present", () => {
    const task = makeTask({ notes: "Fast for 8 hours" });
    seedTask(task);
    render(<TaskCard task={task} />);
    expect(screen.getByText("Fast for 8 hours")).toBeInTheDocument();
  });

  it("does not render notes element when notes absent", () => {
    const task = makeTask({ notes: undefined });
    seedTask(task);
    const { container } = render(<TaskCard task={task} />);
    expect(container.querySelector(".task-card__notes")).toBeNull();
  });
});

describe("TaskCard optimistic update", () => {
  it("shows spinner while update is pending", () => {
    const task = makeTask();
    seedTask(task);
    useTaskStore.setState((s) => ({
      pendingUpdates: {
        [task.id]: { taskId: task.id, previousTask: task, timestamp: Date.now() },
      },
    }));
    render(<TaskCard task={task} />);
    expect(screen.getByLabelText("Saving…")).toBeInTheDocument();
  });

  it("disables status select while pending", () => {
    const task = makeTask();
    seedTask(task);
    useTaskStore.setState((s) => ({
      pendingUpdates: {
        [task.id]: { taskId: task.id, previousTask: task, timestamp: Date.now() },
      },
    }));
    render(<TaskCard task={task} />);
    expect(screen.getByTestId(`status-select-${task.id}`)).toBeDisabled();
  });

  it("calls updateTask when status changes", async () => {
    const task = makeTask({ status: "upcoming" });
    seedTask(task);
    mockUpdateTask.mockResolvedValueOnce({ ...task, status: "in_progress" });
    render(<TaskCard task={task} />);
    fireEvent.change(screen.getByTestId(`status-select-${task.id}`), {
      target: { value: "in_progress" },
    });
    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith(task.id, { status: "in_progress" });
    });
  });
});

describe("TaskCard rollback on error", () => {
  it("reverts status and shows error toast when API fails", async () => {
    const task = makeTask({ status: "upcoming" });
    seedTask(task);
    mockUpdateTask.mockRejectedValueOnce({
      status: 503,
      message: "Service Unavailable",
      retryable: true,
    });
    render(<TaskCard task={task} />);
    fireEvent.change(screen.getByTestId(`status-select-${task.id}`), {
      target: { value: "completed" },
    });
    await waitFor(() => {
      expect(useTaskStore.getState().tasks[task.id].status).toBe("upcoming");
    });
    await waitFor(() => {
      expect(useTaskStore.getState().toasts.some((t) => t.type === "error")).toBe(true);
    });
  });
});