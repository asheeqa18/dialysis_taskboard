import type {
  Patient,
  Task,
  CreateTaskRequest,
  UpdateTaskRequest,
  ApiError,
} from "../types";
import {
  normalizePatients,
  normalizeTasks,
  normalizeTask,
} from "./normalizers";

// ── Config ────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

const DEFAULT_RETRY_COUNT = 3;
const RETRY_DELAY_MS = 500;
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

// ── Helpers ───────────────────────────────────

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function buildApiError(status: number, message: string): ApiError {
  return {
    status,
    message,
    retryable: RETRYABLE_STATUSES.has(status),
  };
}

async function fetchWithRetry(
  input: RequestInfo,
  init: RequestInit = {},
  retries = DEFAULT_RETRY_COUNT
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(input, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(init.headers ?? {}),
        },
      });

      if (!res.ok && !RETRYABLE_STATUSES.has(res.status)) {
        const body = await res.json().catch(() => ({}));
        throw buildApiError(res.status, body?.message ?? res.statusText);
      }

      if (!res.ok && attempt < retries) {
        await sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
        continue;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw buildApiError(res.status, body?.message ?? "Server error");
      }

      return res;
    } catch (err) {
      if ((err as ApiError).status) throw err;
      lastError = err as Error;
      if (attempt < retries) {
        await sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
      }
    }
  }

  throw buildApiError(0, lastError?.message ?? "Network error");
}

// ── API Client ────────────────────────────────

export const apiClient = {
  async getPatients(): Promise<Patient[]> {
    const res = await fetchWithRetry(`${BASE_URL}/patients`);
    const json = await res.json();
    const raw = Array.isArray(json) ? json : json?.data ?? [];
    return normalizePatients(raw);
  },

  async getTasksForPatient(patientId: string): Promise<Task[]> {
    const res = await fetchWithRetry(
      `${BASE_URL}/patients/${patientId}/tasks`
    );
    const json = await res.json();
    const raw = Array.isArray(json) ? json : json?.data ?? [];
    return normalizeTasks(raw);
  },

  async createTask(req: CreateTaskRequest): Promise<Task> {
    const body = {
      patient_id: req.patientId,
      title: req.title,
      category: req.category,
      assignee_role: req.assigneeRole,
      due_date: req.dueDate,
      notes: req.notes,
    };
    const res = await fetchWithRetry(
      `${BASE_URL}/patients/${req.patientId}/tasks`,
      { method: "POST", body: JSON.stringify(body) }
    );
    const json = await res.json();
    return normalizeTask(json?.data ?? json);
  },

  async updateTask(
    taskId: string,
    req: UpdateTaskRequest
  ): Promise<Task> {
    const body = {
      ...(req.status && { status: req.status }),
      ...(req.assigneeRole && { assignee_role: req.assigneeRole }),
      ...(req.assigneeName && { assignee_name: req.assigneeName }),
      ...(req.dueDate && { due_date: req.dueDate }),
      ...(req.notes && { notes: req.notes }),
    };
    const res = await fetchWithRetry(
      `${BASE_URL}/tasks/${taskId}`,
      { method: "PATCH", body: JSON.stringify(body) }
    );
    const json = await res.json();
    return normalizeTask(json?.data ?? json);
  },
};