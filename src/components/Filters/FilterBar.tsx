import React from "react";
import { useFilters, useTaskStats } from "../../hooks/useTasks";
import type { CareRole, TimeWindow } from "../../types";

const ROLES: { value: CareRole; label: string; color: string }[] = [
  { value: "nurse", label: "Nurse", color: "#3b9eff" },
  { value: "dietician", label: "Dietician", color: "#34d399" },
  { value: "social_worker", label: "Social Worker", color: "#f59e0b" },
  { value: "physician", label: "Physician", color: "#a78bfa" },
];

const TIME_WINDOWS: { value: TimeWindow; label: string; color: string }[] = [
  { value: "overdue", label: "Overdue", color: "#f87171" },
  { value: "due_today", label: "Due Today", color: "#fb923c" },
  { value: "upcoming", label: "Upcoming", color: "#60a5fa" },
  { value: "completed", label: "Completed", color: "#4ade80" },
];

export const FilterBar: React.FC = () => {
  const { filters, setFilters } = useFilters();
  const stats = useTaskStats();

  function toggleRole(role: CareRole) {
    const next = filters.roles.includes(role)
      ? filters.roles.filter((r) => r !== role)
      : [...filters.roles, role];
    setFilters({ roles: next });
  }

  function toggleWindow(tw: TimeWindow) {
    const next = filters.timeWindows.includes(tw)
      ? filters.timeWindows.filter((t) => t !== tw)
      : [...filters.timeWindows, tw];
    setFilters({ timeWindows: next });
  }

  function clearAll() {
    setFilters({ roles: [], timeWindows: [] });
  }

  const hasFilters = filters.roles.length > 0 || filters.timeWindows.length > 0;

  return (
    <div className="filter-bar">
      <div className="filter-section">
        <span className="filter-label">ROLE</span>
        <div className="filter-chips">
          {ROLES.map((r) => (
            <button
              key={r.value}
              className={`chip ${filters.roles.includes(r.value) ? "chip--active" : ""}`}
              style={{ "--chip-color": r.color } as React.CSSProperties}
              onClick={() => toggleRole(r.value)}
              aria-pressed={filters.roles.includes(r.value)}
            >
              <span className="chip-dot" />
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-divider" />

      <div className="filter-section">
        <span className="filter-label">TIME</span>
        <div className="filter-chips">
          {TIME_WINDOWS.map((tw) => (
            <button
              key={tw.value}
              className={`chip ${filters.timeWindows.includes(tw.value) ? "chip--active" : ""}`}
              style={{ "--chip-color": tw.color } as React.CSSProperties}
              onClick={() => toggleWindow(tw.value)}
              aria-pressed={filters.timeWindows.includes(tw.value)}
            >
              <span className="chip-dot" />
              {tw.label}
              {tw.value === "overdue" && stats.overdue > 0 && (
                <span className="chip-badge">{stats.overdue}</span>
              )}
              {tw.value === "due_today" && stats.dueToday > 0 && (
                <span className="chip-badge">{stats.dueToday}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {hasFilters && (
        <button className="clear-filters" onClick={clearAll}>
          ✕ Clear
        </button>
      )}
    </div>
  );
};