import React, { useState } from "react";
import type { CreateTaskRequest, TaskCategory, CareRole } from "../../types";
import { useTaskActions } from "../../hooks/useTasks";

interface CreateTaskModalProps {
  patientId: string;
  patientName: string;
  onClose: () => void;
}

const CATEGORIES: { value: TaskCategory; label: string }[] = [
  { value: "monthly_labs", label: "Monthly Labs" },
  { value: "access_check", label: "Access Check" },
  { value: "diet_counselling", label: "Diet Counselling" },
  { value: "vaccination", label: "Vaccination" },
  { value: "social_work", label: "Social Work" },
  { value: "medication_review", label: "Medication Review" },
  { value: "other", label: "Other" },
];

const ROLES: { value: CareRole; label: string }[] = [
  { value: "nurse", label: "Nurse (RN)" },
  { value: "dietician", label: "Dietician (RD)" },
  { value: "social_worker", label: "Social Worker (SW)" },
  { value: "physician", label: "Physician (MD)" },
];

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  patientId,
  patientName,
  onClose,
}) => {
  const { handleCreate } = useTaskActions();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<Omit<CreateTaskRequest, "patientId">>({
    title: "",
    category: "other",
    assigneeRole: "nurse",
    dueDate: todayISO(),
    notes: "",
  });

  function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      await handleCreate({ patientId, ...form });
      onClose();
    } catch {
      setError("Failed to create task. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-task-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" data-testid="create-task-modal">
        <div className="modal__header">
          <h2 id="create-task-title">New Task</h2>
          <p className="modal__subtitle">Patient: {patientName}</p>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form className="modal__form" onSubmit={submit}>
          <label className="form-field">
            <span>Title *</span>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. Monthly BMP panel"
              required
              autoFocus
              data-testid="task-title-input"
            />
          </label>

          <div className="form-row">
            <label className="form-field">
              <span>Category</span>
              <select
                value={form.category}
                onChange={(e) => update("category", e.target.value as TaskCategory)}
                data-testid="task-category-select"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>Assign To</span>
              <select
                value={form.assigneeRole}
                onChange={(e) => update("assigneeRole", e.target.value as CareRole)}
                data-testid="task-role-select"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="form-field">
            <span>Due Date *</span>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => update("dueDate", e.target.value)}
              required
              data-testid="task-due-date"
            />
          </label>

          <label className="form-field">
            <span>Notes</span>
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Optional context or instructions"
              rows={3}
              data-testid="task-notes"
            />
          </label>

          {error && (
            <p className="form-error" role="alert" data-testid="create-task-error">
              {error}
            </p>
          )}

          <div className="modal__actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={isSaving || !form.title.trim()}
              data-testid="create-task-submit"
            >
              {isSaving ? "Creating…" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};