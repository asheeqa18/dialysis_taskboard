import { http, HttpResponse, delay } from "msw";

// ── Seed Data ─────────────────────────────────

const PATIENTS = [
  {
    id: "p1",
    name: "Amara Osei",
    mrn: "MRN-00412",
    dialysis_type: "HD",
    primary_nurse: "Kavitha R.",
    next_session: "2026-03-20T08:00:00Z",
  },
  {
    id: "p2",
    name: "Rajan Pillai",
    mrn: "MRN-00567",
    dialysis_type: "PD",
    primary_nurse: "Sunitha M.",
    next_session: "2026-03-21T10:00:00Z",
  },
  {
    id: "p3",
    name: "Leila Nasser",
    mrn: "MRN-00891",
    dialysis_type: "HD",
    primary_nurse: "Kavitha R.",
    next_session: "2026-03-19T14:00:00Z",
  },
  {
    id: "p4",
    name: "Thomas Varghese",
    mrn: "MRN-01023",
    dialysis_type: "HD",
    primary_nurse: "Priya K.",
    next_session: "2026-03-22T09:00:00Z",
  },
];

const now = new Date();
const yesterday = new Date(now.getTime() - 86_400_000).toISOString();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).toISOString();
const tomorrow = new Date(now.getTime() + 86_400_000).toISOString();
const nextWeek = new Date(now.getTime() + 7 * 86_400_000).toISOString();

const TASKS: Record<string, object[]> = {
  p1: [
    {
      id: "t1",
      patient_id: "p1",
      title: "Monthly BMP & CBC",
      category: "monthly_labs",
      status: "overdue",
      assignee_role: "nurse",
      assignee_name: "Kavitha R.",
      due_date: yesterday,
      notes: "Pending phosphorus result",
      created_at: yesterday,
      updated_at: yesterday,
    },
    {
      id: "t2",
      patient_id: "p1",
      title: "Dietary phosphorus review",
      category: "diet_counselling",
      status: "due_today",
      assignee_role: "dietician",
      assignee_name: "Meena S.",
      due_date: today,
      created_at: yesterday,
      updated_at: yesterday,
    },
    {
      id: "t3",
      patient_id: "p1",
      title: "AV fistula assessment",
      category: "access_check",
      status: "upcoming",
      assignee_role: "nurse",
      assignee_name: "Kavitha R.",
      due_date: tomorrow,
      created_at: yesterday,
      updated_at: yesterday,
    },
  ],
  p2: [
    {
      id: "t4",
      patient_id: "p2",
      title: "Hepatitis B booster",
      category: "vaccination",
      status: "overdue",
      assignee_role: "nurse",
      assignee_name: "Sunitha M.",
      due_date: yesterday,
      created_at: yesterday,
      updated_at: yesterday,
    },
    {
      id: "t5",
      patient_id: "p2",
      title: "Social support assessment",
      category: "social_work",
      status: "in_progress",
      assignee_role: "social_worker",
      assignee_name: "David K.",
      due_date: today,
      notes: "Family meeting scheduled",
      created_at: yesterday,
      updated_at: yesterday,
    },
    {
      id: "t6",
      patient_id: "p2",
      title: "Protein intake counselling",
      category: "diet_counselling",
      status: "completed",
      assignee_role: "dietician",
      assignee_name: "Meena S.",
      due_date: yesterday,
      created_at: yesterday,
      updated_at: yesterday,
    },
  ],
  p3: [
    {
      id: "t7",
      patient_id: "p3",
      title: "Kt/V adequacy check",
      category: "monthly_labs",
      status: "due_today",
      assignee_role: "nurse",
      assignee_name: "Kavitha R.",
      due_date: today,
      created_at: yesterday,
      updated_at: yesterday,
    },
    {
      id: "t8",
      patient_id: "p3",
      title: "Housing assistance referral",
      category: "social_work",
      status: "upcoming",
      assignee_role: "social_worker",
      assignee_name: "David K.",
      due_date: nextWeek,
      created_at: yesterday,
      updated_at: yesterday,
    },
  ],
  p4: [
    {
      id: "t9",
      patient_id: "p4",
      title: "Iron panel review",
      category: "monthly_labs",
      status: "upcoming",
      assignee_role: "nurse",
      due_date: tomorrow,
      created_at: yesterday,
      updated_at: yesterday,
    },
    {
      id: "t10",
      patient_id: "p4",
      title: "Medication adherence check",
      category: "medication_review",
      status: "in_progress",
      assignee_role: "physician",
      due_date: today,
      created_at: yesterday,
      updated_at: yesterday,
    },
  ],
};

let taskIdCounter = 100;
let failureCount = 0;
function shouldFail() {
  failureCount++;
  return failureCount % 7 === 0;
}

// ── Handlers ──────────────────────────────────

export const handlers = [
  http.get("/api/patients", async () => {
    await delay(300);
    return HttpResponse.json(PATIENTS);
  }),

  http.get("/api/patients/:id/tasks", async ({ params }) => {
    await delay(200);
    const tasks = TASKS[params.id as string] ?? [];
    return HttpResponse.json(tasks);
  }),

  http.post("/api/patients/:id/tasks", async ({ request, params }) => {
    await delay(400);
    if (shouldFail()) {
      return new HttpResponse(JSON.stringify({ message: "Internal Server Error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    const body = (await request.json()) as Record<string, unknown>;
    const newTask = {
      id: `t${++taskIdCounter}`,
      patient_id: params.id,
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (!TASKS[params.id as string]) TASKS[params.id as string] = [];
    TASKS[params.id as string].push(newTask);
    return HttpResponse.json(newTask, { status: 201 });
  }),

  http.patch("/api/tasks/:id", async ({ request, params }) => {
    await delay(350);
    if (shouldFail()) {
      return new HttpResponse(JSON.stringify({ message: "Service Unavailable" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }
    const body = (await request.json()) as Record<string, unknown>;
    for (const patientTasks of Object.values(TASKS)) {
      const idx = patientTasks.findIndex(
        (t) => (t as Record<string, unknown>).id === params.id
      );
      if (idx !== -1) {
        patientTasks[idx] = {
          ...(patientTasks[idx] as object),
          ...body,
          updated_at: new Date().toISOString(),
        };
        return HttpResponse.json(patientTasks[idx]);
      }
    }
    return new HttpResponse(null, { status: 404 });
  }),
];