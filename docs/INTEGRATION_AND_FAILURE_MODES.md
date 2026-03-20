# Integration & Failure Modes

**CareBoard — Dialysis Task Management**

---

## 1. Data Contracts

All wire shapes are defined in `src/types/index.ts`.
The API layer receives `*DTO` types (snake_case, loose) and normalises them
to domain models (camelCase, strict) before entering the store.

| Domain Model | Wire DTO     | Normalizer fn      |
|--------------|--------------|--------------------|
| `Patient`    | `PatientDTO` | `normalizePatient` |
| `Task`       | `TaskDTO`    | `normalizeTask`    |

**Key decisions:**
- `TaskStatus` is derived from `dueDate` when the server omits it
- Unknown `TaskCategory` → falls back to `"other"`
- Unknown `CareRole` → falls back to `"nurse"`
- `metadata: Record<string, unknown>` is a forward-compatibility field

---

## 2. Optimistic UI Strategy

### Status Updates (PATCH /tasks/:id)
```
User changes status
  → Snapshot stored in pendingUpdates[taskId]
  → Optimistic mutation applied immediately
  → Spinner shown on card
  → API called (3 retries, exponential backoff)
    → Success: confirmed task replaces optimistic, spinner clears
    → Failure: snapshot restored, error toast shown + Retry CTA
```

### Task Creation (POST /patients/:id/tasks)
```
User submits form
  → Optimistic task inserted with temp ID
  → API called
    → Success: temp replaced by confirmed task
    → Failure: temp removed, error toast shown
```

---

## 3. Network Failure Modes

| Scenario | Behaviour | User Feedback |
|----------|-----------|---------------|
| PATCH times out | Rollback after 3 retries | Error toast + Retry |
| PATCH 400 error | Rollback immediately | Error toast |
| POST fails | Remove optimistic card | Error toast |
| GET /patients fails | Empty board | Full-page error |
| GET /patients/:id/tasks fails | Row shows error | Inline warning |
| Missing JSON fields | Normalizer coerces | Silent fallback |
| Unknown category/role | Mapped to default | Shown as fallback |

---

## 4. Adding a New Role

1. `src/types/index.ts` — add to `CareRole` union
2. `src/api/normalizers.ts` — add to `VALID_ROLES`
3. `src/components/Filters/FilterBar.tsx` — add chip entry
4. `src/components/CreateTask/CreateTaskModal.tsx` — add dropdown option
5. `src/index.css` — add role colour variable

No store changes needed — filter logic is role-agnostic.

---

## 5. Adding a New Task Category

1. `src/types/index.ts` — add to `TaskCategory` union
2. `src/api/normalizers.ts` — add to `VALID_CATEGORIES`
3. `src/components/TaskCard/TaskCard.tsx` — add icon to `CATEGORY_ICONS`
4. `src/components/CreateTask/CreateTaskModal.tsx` — add dropdown option

Category-specific fields go in `task.metadata` — no schema changes needed.

---

## 6. State Management — Why Zustand

| Criterion | Zustand | React Query | Redux |
|-----------|---------|-------------|-------|
| Cross-patient optimistic updates | Native | Complex | Verbose |
| Per-task rollback snapshots | Simple map | Per-query only | Manual |
| Bundle size | ~3KB | ~13KB | ~11KB |
| Boilerplate | Minimal | Minimal | Medium |