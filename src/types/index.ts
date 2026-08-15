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

export type TaskStatus = "backlog" | "in_progress" | "blocked" | "review" | "done";

export const TASK_STATUSES: TaskStatus[] = [
  "backlog",
  "in_progress",
  "blocked",
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

export type BlockedReason = "parts" | "information" | "approval" | "prerequisite" | "other";

export interface TaskComment {
  id: string;
  body: string;
  authorUid: string;
  createdAt: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  storagePath: string;
  contentType: string;
  size: number;
  uploadedByUid: string;
  createdAt: string;
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
  pointOfContactUid: string;
  blockedReason: BlockedReason | null;
  blockedDetails: string;
  prerequisiteTaskIds: string[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
  history: TaskHistoryEntry[];
}

export type TimeclockActivity = "shop" | "outreach";

export interface TimeEntry {
  id: string;
  uid: string;
  activity: TimeclockActivity;
  activityName: string;
  clockIn: string;
  clockOut: string | null;
  clockedInByUid: string;
  clockedOutByUid: string | null;
}

export interface TimeclockPin {
  uid: string;
  pin: string;
  updatedAt: string;
}
