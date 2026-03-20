/// <reference types="vitest/globals" />
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  normalizeTask,
  normalizePatient,
  normalizeTasks,
  normalizePatients,
} from "../api/normalizers";
import type { TaskDTO, PatientDTO } from "../types";

const FAKE_NOW = new Date("2026-03-19T12:00:00Z");
beforeAll(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(FAKE_NOW);
});
afterAll(() => vi.useRealTimers());

describe("normalizeTask", () => {
  const base: TaskDTO = {
    id: "t1",
    patient_id: "p1",
    title: "Monthly BMP",
    due_date: "2026-03-20T10:00:00Z",
  };

  it("maps snake_case fields to camelCase", () => {
    const result = normalizeTask({
      ...base,
      assignee_role: "nurse",
      assignee_name: "Kavitha",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
    });
    expect(result.patientId).toBe("p1");
    expect(result.assigneeRole).toBe("nurse");
    expect(result.assigneeName).toBe("Kavitha");
  });

  it("falls back to 'other' for unknown category", () => {
    const result = normalizeTask({ ...base, category: "ultrasound_biopsy" });
    expect(result.category).toBe("other");
  });

  it("falls back to 'nurse' for unknown assignee_role", () => {
    const result = normalizeTask({ ...base, assignee_role: "radiologist" });
    expect(result.assigneeRole).toBe("nurse");
  });

  it("falls back to 'Untitled Task' when title is missing", () => {
    const { title: _, ...noTitle } = base;
    const result = normalizeTask(noTitle as TaskDTO);
    expect(result.title).toBe("Untitled Task");
  });

  it("derives status='upcoming' from future dueDate when status omitted", () => {
    const result = normalizeTask({ ...base, due_date: "2026-03-25T10:00:00Z" });
    expect(result.status).toBe("upcoming");
  });

  it("derives status='overdue' from past dueDate when status omitted", () => {
    const result = normalizeTask({ ...base, due_date: "2026-03-18T10:00:00Z" });
    expect(result.status).toBe("overdue");
  });

  it("derives status='due_today' from today's dueDate when status omitted", () => {
    const result = normalizeTask({ ...base, due_date: "2026-03-19T15:00:00Z" });
    expect(result.status).toBe("due_today");
  });

  it("uses server-provided status when valid", () => {
    const result = normalizeTask({ ...base, status: "in_progress" });
    expect(result.status).toBe("in_progress");
  });

  it("ignores invalid server status and derives from date", () => {
    const result = normalizeTask({
      ...base,
      status: "pending_review",
      due_date: "2026-03-18T10:00:00Z",
    });
    expect(result.status).toBe("overdue");
  });

  it("preserves metadata field", () => {
    const result = normalizeTask({ ...base, metadata: { labOrderId: "LAB-999" } });
    expect(result.metadata).toEqual({ labOrderId: "LAB-999" });
  });
});

describe("normalizePatient", () => {
  it("maps all fields correctly", () => {
    const dto: PatientDTO = {
      id: "p1",
      name: "Rajan Pillai",
      mrn: "MRN-0056",
      dialysis_type: "PD",
      primary_nurse: "Sunitha M.",
      next_session: "2026-03-21T10:00:00Z",
    };
    const result = normalizePatient(dto);
    expect(result.dialysisType).toBe("PD");
    expect(result.primaryNurse).toBe("Sunitha M.");
  });

  it("defaults dialysisType to 'HD' for unknown values", () => {
    const result = normalizePatient({ id: "p2", name: "X", mrn: "MRN-001", dialysis_type: "CRRT" });
    expect(result.dialysisType).toBe("HD");
  });

  it("handles absent optional fields gracefully", () => {
    const result = normalizePatient({ id: "p3", name: "Y", mrn: "MRN-002" });
    expect(result.primaryNurse).toBeUndefined();
    expect(result.nextSession).toBeUndefined();
  });
});

describe("normalizeTasks", () => {
  it("filters out malformed items missing id", () => {
    const items = [
      { id: "t1", patient_id: "p1", title: "A", due_date: "2026-03-20T00:00:00Z" },
      { patient_id: "p1", title: "No ID", due_date: "2026-03-20T00:00:00Z" },
      null,
      undefined,
      42,
    ];
    const result = normalizeTasks(items as unknown[]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("t1");
  });

  it("returns empty array for empty input", () => {
    expect(normalizeTasks([])).toEqual([]);
  });
});

describe("normalizePatients", () => {
  it("filters out invalid items", () => {
    const items = [
      { id: "p1", name: "Valid", mrn: "MRN-001" },
      { name: "No ID", mrn: "MRN-002" },
      null,
    ];
    const result = normalizePatients(items as unknown[]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("p1");
  });
});