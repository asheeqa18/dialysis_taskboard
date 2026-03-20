import React, { useEffect, useState } from "react";
import { useTaskStore } from "../../store/taskStore";
import { usePatientTasks, useTaskStats } from "../../hooks/useTasks";
import { TaskCard } from "../TaskCard/TaskCard";
import { CreateTaskModal } from "../CreateTask/CreateTaskModal";
import { FilterBar } from "../Filters/FilterBar";
import { ToastContainer } from "../shared/ToastContainer";
import type { Patient, Task, TaskStatus } from "../../types";

const STATUS_COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "overdue", label: "Overdue" },
  { status: "due_today", label: "Due Today" },
  { status: "in_progress", label: "In Progress" },
  { status: "upcoming", label: "Upcoming" },
  { status: "completed", label: "Completed" },
];

const PatientRow: React.FC<{
  patient: Patient;
  onCreateTask: (patient: Patient) => void;
}> = ({ patient, onCreateTask }) => {
  const { tasks, isLoading, error } = usePatientTasks(patient.id);

  const tasksByStatus = STATUS_COLUMNS.reduce<Record<string, Task[]>>(
    (acc, col) => {
      acc[col.status] = tasks.filter((t) => t.status === col.status);
      return acc;
    },
    {}
  );

  if (error) {
    return (
      <tr className="patient-row patient-row--error">
        <td className="patient-cell">
          <PatientInfo patient={patient} onCreateTask={onCreateTask} />
        </td>
        <td colSpan={STATUS_COLUMNS.length} className="error-cell">
          <span className="error-inline">
            ⚠ Failed to load tasks
            {error.retryable && " — will retry automatically"}
          </span>
        </td>
      </tr>
    );
  }

  return (
    <tr className="patient-row" data-testid={`patient-row-${patient.id}`}>
      <td className="patient-cell">
        <PatientInfo patient={patient} onCreateTask={onCreateTask} />
      </td>
      {STATUS_COLUMNS.map((col) => (
        <td key={col.status} className={`task-column task-column--${col.status}`}>
          {isLoading ? (
            <div className="task-skeleton" aria-label="Loading tasks" />
          ) : (
            <div className="task-stack">
              {tasksByStatus[col.status]?.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
              {!tasksByStatus[col.status]?.length && (
                <div className="task-empty" />
              )}
            </div>
          )}
        </td>
      ))}
    </tr>
  );
};

const PatientInfo: React.FC<{
  patient: Patient;
  onCreateTask: (p: Patient) => void;
}> = ({ patient, onCreateTask }) => (
  <div className="patient-info">
    <div className="patient-avatar">
      {patient.name.split(" ").slice(0, 2).map((n) => n[0]).join("")}
    </div>
    <div className="patient-details">
      <span className="patient-name">{patient.name}</span>
      <span className="patient-mrn">{patient.mrn}</span>
      <span className={`dialysis-badge dialysis-badge--${patient.dialysisType.toLowerCase()}`}>
        {patient.dialysisType}
      </span>
    </div>
    <button
      className="add-task-btn"
      onClick={() => onCreateTask(patient)}
      aria-label={`Add task for ${patient.name}`}
      title="Add task"
    >
      +
    </button>
  </div>
);

const StatPill: React.FC<{ label: string; value: number; accent?: string }> = ({
  label, value, accent,
}) => (
  <div className="stat-pill" style={accent ? { "--pill-color": accent } as React.CSSProperties : {}}>
    <span className="stat-value">{value}</span>
    <span className="stat-label">{label}</span>
  </div>
);

const StatsBar: React.FC = () => {
  const stats = useTaskStats();
  return (
    <div className="stats-bar">
      <StatPill label="Total" value={stats.total} />
      <StatPill label="Overdue" value={stats.overdue} accent="#f87171" />
      <StatPill label="Due Today" value={stats.dueToday} accent="#fb923c" />
      <StatPill label="In Progress" value={stats.inProgress} accent="#60a5fa" />
      <StatPill label="Completed" value={stats.completed} accent="#4ade80" />
    </div>
  );
};

export const TaskBoard: React.FC = () => {
  const { patients, isLoadingPatients, fetchPatients, fetchAllTasks } =
    useTaskStore((s) => ({
      patients: s.patients,
      isLoadingPatients: s.isLoadingPatients,
      fetchPatients: s.fetchPatients,
      fetchAllTasks: s.fetchAllTasks,
    }));

  const [createTarget, setCreateTarget] = useState<Patient | null>(null);

  useEffect(() => {
    fetchPatients().then(() => {
      fetchAllTasks();
    });
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__left">
          <h1 className="app-title">
            <span className="app-title__icon">⚕</span>
            CareBoard
          </h1>
          <span className="app-subtitle">Dialysis Task Management</span>
        </div>
        <StatsBar />
      </header>

      <div className="app-body">
        <FilterBar />
        <div className="board-scroll">
          {isLoadingPatients ? (
            <div className="board-loading">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton-row" />
              ))}
            </div>
          ) : (
            <table className="task-board" role="table" aria-label="Patient task board">
              <thead>
                <tr>
                  <th className="col-patient">Patient</th>
                  {STATUS_COLUMNS.map((col) => (
                    <th key={col.status} className={`col-status col-status--${col.status}`}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <PatientRow
                    key={patient.id}
                    patient={patient}
                    onCreateTask={setCreateTarget}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {createTarget && (
        <CreateTaskModal
          patientId={createTarget.id}
          patientName={createTarget.name}
          onClose={() => setCreateTarget(null)}
        />
      )}

      <ToastContainer />
    </div>
  );
};