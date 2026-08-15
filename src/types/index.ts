// Core domain types for the robotics team kanban system.

export type Role = "coach" | "student_leader" | "student";

export type Subteam =
  | "mechanical"
  | "electrical"
  | "programming"
  | "cad"
  | "business";

export const SUBTEAMS: Subteam[] = [
  "mechanical",
  "electrical",
  "programming",
  "cad",
  "business",
];

export type TaskStatus = "backlog" | "in_progress" | "review" | "done";

export const TASK_STATUSES: TaskStatus[] = [
  "backlog",
  "in_progress",
  "review",
  "done",
];

export type Priority = "low" | "medium" | "high";

// A student, student leader, or coach account. Document ID = Firebase Auth uid.
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: Role;
  // Required for students and student leaders; coaches may span all subteams.
  subteam: Subteam | null;
  // IDs referencing documents in the certifications collection.
  certificationIds: string[];
  createdAt: string; // ISO timestamp
  // True until the student completes their first login and sets a real password.
  mustResetPassword: boolean;
}

// A certifiable manufacturing process or skill (e.g. "CNC Mill", "Soldering").
export interface Certification {
  id: string;
  name: string;
  description: string;
  subteam: Subteam | null; // null = applies across subteams
}

export type TaskHistoryEventType = "assigned" | "unassigned" | "completed";

export interface TaskHistoryEntry {
  type: TaskHistoryEventType;
  uid: string;
  at: string; // ISO timestamp
}

export interface Task {
  id: string;
  title: string;
  description: string;
  subteam: Subteam;
  status: TaskStatus;
  priority: Priority;
  // Certification IDs a student must hold at least one of (or all of, see
  // requireAllCertifications) to claim this task.
  requiredCertificationIds: string[];
  requireAllCertifications: boolean;
  assigneeUids: string[];
  createdByUid: string;
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
  // Append-only log of assignment and completion events, used for reports.
  history: TaskHistoryEntry[];
}