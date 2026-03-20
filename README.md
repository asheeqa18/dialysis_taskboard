# CareBoard — Dialysis Task Management

A production-grade React/TypeScript taskboard for dialysis care teams.
Manages recurring and ad-hoc tasks across multiple patients and care roles,
with optimistic UI, resilient network handling, and typed data contracts.

---

## Setup Instructions (under 5 minutes)

### Prerequisites
- Node.js v18+ → https://nodejs.org

### Clone and run
```bash
git clone <your-repo-url>
cd dialysis-taskboard
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

### Run tests
```bash
npm test
```

### Production build
```bash
npm run build
npm run preview
```

---

## Architecture Overview
```
┌─────────────────────────────────────────────────────┐
│                    Browser                          │
│                                                     │
│   ┌─────────────┐     ┌─────────────────────────┐  │
│   │  FilterBar  │     │       StatsBar          │  │
│   └─────────────┘     └─────────────────────────┘  │
│                                                     │
│   ┌─────────────────────────────────────────────┐  │
│   │              TaskBoard                      │  │
│   │  Patient │ Overdue │ Due Today │ Upcoming…  │  │
│   │──────────┼─────────┼───────────┼────────────│  │
│   │ Amara    │TaskCard │ TaskCard  │            │  │
│   │ Rajan    │         │ TaskCard  │ TaskCard   │  │
│   └─────────────────────────────────────────────┘  │
│                                                     │
│   ┌─────────────┐     ┌─────────────────────────┐  │
│   │CreateTask   │     │    ToastContainer       │  │
│   │Modal        │     │  (error/success/retry)  │  │
│   └─────────────┘     └─────────────────────────┘  │
└─────────────────────────────────────────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐    ┌──────────────────────┐
│  Zustand Store  │    │     MSW Mock API     │
│                 │    │                      │
│ • tasks         │    │ GET /patients        │
│ • patients      │    │ GET /patients/:id/   │
│ • filters       │    │     tasks            │
│ • pendingUpdates│    │ POST /patients/:id/  │
│ • toasts        │    │      tasks           │
└─────────────────┘    │ PATCH /tasks/:id     │
         │             └──────────────────────┘
         ▼
┌─────────────────┐
│   API Client    │
│ fetchWithRetry  │
│ normalizers     │
│ type guards     │
└─────────────────┘
```

### Module Structure
```
src/
├── api/
│   ├── client.ts          # fetch with retry + exponential backoff
│   └── normalizers.ts     # DTO → domain model, type guards, fallbacks
├── types/
│   └── index.ts           # all TypeScript interfaces and enums
├── store/
│   └── taskStore.ts       # Zustand store, optimistic updates, selectors
├── hooks/
│   └── useTasks.ts        # component-facing hooks
├── components/
│   ├── TaskBoard/         # main board table, patient rows
│   ├── TaskCard/          # task card with status dropdown
│   ├── CreateTask/        # new task modal
│   ├── Filters/           # role + time window filter chips
│   └── shared/            # toast notifications
└── mocks/
    └── handlers.ts        # MSW handlers with seed data
```

### State Management — Why Zustand

| Criterion | Zustand | React Query | Redux Toolkit |
|-----------|---------|-------------|---------------|
| Cross-patient optimistic updates | ✅ Native map | ⚠ Complex | ✅ Verbose |
| Per-task rollback snapshots | ✅ Simple | ⚠ Per-query | Manual |
| Bundle size | ~3KB | ~13KB | ~11KB |
| Boilerplate | Minimal | Minimal | Medium |

React Query excels at server-state sync but managing optimistic updates
across N patients in a single board view requires a global task cache —
which is exactly what Zustand gives us directly.

---

## Seed Data

The mock backend (MSW) is pre-seeded with:
- **4 patients** — Amara Osei, Rajan Pillai, Leila Nasser, Thomas Varghese
- **10 tasks** — distributed across all 5 status columns
- **Intentional failures** — every 7th mutation fails to demonstrate rollback

No database or backend setup required. MSW intercepts all API calls at
the network level in the browser. Seed data lives in `src/mocks/handlers.ts`.

To reset seed data — refresh the browser. State is in-memory only.

---

## Data Contracts

API shapes are defined in `src/types/index.ts`. The wire format uses
snake_case DTOs; the normalizer layer coerces them to camelCase domain
models with fallbacks for every optional or unknown field.

| Scenario | Behaviour |
|----------|-----------|
| Missing `status` field | Derived from `dueDate` automatically |
| Unknown `category` value | Falls back to `"other"` |
| Unknown `assigneeRole` value | Falls back to `"nurse"` |
| Missing `title` | Falls back to `"Untitled Task"` |
| Null/malformed items in list | Filtered out silently |



## Assumptions and Trade-offs

### Assumptions
- A real backend exists with the four endpoints specified; MSW simulates it
- Authentication and authorisation are out of scope for this exercise
- All patients are visible to all roles (no per-role patient filtering)
- Tasks belong to exactly one patient and one assignee role
- The board is used on desktop — mobile layout was not prioritised

### Trade-offs
- **No pagination** — the board loads all patients and tasks on mount.
  For a real deployment with hundreds of patients, virtual scrolling and
  paginated fetching would be needed.
- **In-memory seed data** — refreshing the browser resets all changes.
  A real backend would persist mutations.
- **MSW for mocking** — chosen over a real Express/FastAPI stub because
  it intercepts at the network level with zero extra process to run.
- **Zustand over React Query** — see State Management section above.
- **Table layout for the board** — chosen over a pure CSS grid for its
  natural sticky-column behaviour (patient names stay visible on scroll).



## Known Limitations

| Limitation | What I would do next |
|------------|----------------------|
| No real backend | Swap `apiClient` base URL via `VITE_API_BASE_URL` env var |
| No authentication | Add JWT/session middleware; pass auth headers in `client.ts` |
| No pagination | Add cursor-based pagination + React virtual list |
| No drag-and-drop | Replace status dropdown with drag between columns |
| No mobile layout | Add responsive CSS breakpoints |
| No real-time updates | Add WebSocket / SSE subscription in the store |
| MSW failures are random | In production, use real error monitoring (Sentry) |
| No role-based access | Filter patients/tasks by logged-in user's role |



## Tests

31 tests across 3 files:

| File | What it covers |
|------|---------------|
| `normalizers.test.ts` | DTO coercion, missing fields, status derivation, list filtering |
| `taskStore.test.ts` | Optimistic update, rollback, filter selectors, toast lifecycle |
| `TaskCard.test.tsx` | Render variants, spinner, status change, rollback + error toast |

npm test                  # run all tests

npm run test:coverage    # tests + coverage report




AI Usage

 What I used AI for:
Boilerplate and config scaffolding, TypeScript interface drafts,
CSS styling suggestions, and debugging error messages.

 What I reviewed and changed manually : 

Every file was read and verified before committing. Fixed all
Windows environment issues, runtime errors, and TypeScript config
problems that AI did not anticipate. All architectural decisions
were made independently after reviewing trade-offs.

 One example where I disagreed with the AI output :
AI suggested `Promise.all` for loading tasks across all patients.
I changed it to `Promise.allSettled` so that one failed request
does not collapse the entire board — in a clinical setting,
partial data is better than no data.

Failure Modes

See [`docs/INTEGRATION_AND_FAILURE_MODES.md`](docs/INTEGRATION_AND_FAILURE_MODES.md)
for the complete failure mode table, extensibility guide, and
state management rationale.