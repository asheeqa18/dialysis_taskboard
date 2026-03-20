import React from "react";
import type { Task, TaskStatus } from "../../types";
import { useTaskActions } from "../../hooks/useTasks";
import { useTaskStore } from "../../store/taskStore";

interface TaskCardProps {
  task: Task;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "in_progress", label: "In Progress" },
  { value: "due_today", label: "Due Today" },
  { value: "overdue", label: "Overdue" },
  { value: "completed", label: "Completed" },
];

const CATEGORY_ICONS: Record<string, string> = {
  monthly_labs: "🧪",
  access_check: "🩺",
  diet_counselling: "🥗",
  vaccination: "💉",
  social_work: "🤝",
  medication_review: "💊",
  other: "📋",
};

const ROLE_ABBREV: Record<string, string> = {
  nurse: "RN",
  dietician: "RD",
  social_worker: "SW",
  physician: "MD",
};

export const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const { handleStatusChange } = useTaskActions();
  const isPending = useTaskStore((s) => !!s.pendingUpdates[task.id]);

  async function onStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as TaskStatus;
    if (next === task.status) return;
    try {
      await handleStatusChange(task.id, next);
    } catch {
      // Error toast handled by store
    }
  }

  const dueDate = new Date(task.dueDate);
  const dueDateStr = dueDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });

  return (
    <div
      className={`task-card task-card--${task.status} ${isPending ? "task-card--pending" : ""}`}
      data-testid={`task-card-${task.id}`}
    >
      <div className="task-card__header">
        <span className="task-card__icon">
          {CATEGORY_ICONS[task.category] ?? "📋"}
        </span>
        <span className="task-card__title">{task.title}</span>
        {isPending && (
          <span className="task-card__spinner" aria-label="Saving…" title="Saving…" />
        )}
      </div>

      {task.notes && (
        <p className="task-card__notes">{task.notes}</p>
      )}

      <div className="task-card__meta">
        <span className="task-card__due">📅 {dueDateStr}</span>
        {task.assigneeName ? (
          <span className="task-card__assignee">
            <span className="role-badge">
              {ROLE_ABBREV[task.assigneeRole] ?? task.assigneeRole}
            </span>
            {task.assigneeName}
          </span>
        ) : (
          <span className="task-card__assignee task-card__assignee--unassigned">
            <span className="role-badge">
              {ROLE_ABBREV[task.assigneeRole] ?? task.assigneeRole}
            </span>
            Unassigned
          </span>
        )}
      </div>

      <select
        className="task-card__status-select"
        value={task.status}
        onChange={onStatusChange}
        disabled={isPending}
        aria-label={`Status for ${task.title}`}
        data-testid={`status-select-${task.id}`}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};