// Core domain types for the robotics team kanban system.

export type Role = "coach" | "student_leader" | "student";

export type Subteam =
  | "mechanical"
  | "electrical"
  | "programming"
  | "cad"
  | "outreach"
  | "finance";

export const SUBTEAMS: Subteam[] = [
  "mechanical",
  "electrical",
  "programming",
  "cad",
  "outreach",
  "finance",
];

export type TaskStatus = "backlog" | "in_progress" | "review" | "done";

export const TASK_STATUSES: TaskStatus[] = [
  "backlog",
  "in_progress",
  "review",
  "done",
];

export type Priority = "low" | "medium" | "high";

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: Role;
  subteam: Subteam | null;
  certificationIds: string[];
  createdAt: string;
  mustResetPassword: boolean;
}

export interface Certification {
  id: string;
  name: string;
  description: string;
  subteam: Subteam | null;
}

export type TaskHistoryEventType = "assigned" | "unassigned" | "completed";

export interface TaskHistoryEntry {
  type: TaskHistoryEventType;
  uid: string;
  at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  subteam: Subteam;
  status: TaskStatus;
  priority: Priority;
  requiredCertificationIds: string[];
  requireAllCertifications: boolean;
  assigneeUids: string[];
  createdByUid: string;
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
  history: TaskHistoryEntry[];
}
