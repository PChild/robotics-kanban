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

export type ManufacturingExportKind = "dxf" | "step" | "lathe";
export type ManufacturingStatus = "pending" | "complete" | "cancelled";

export interface ManufacturingEndOperation {
  operation: "leave as modeled" | "turn down" | "tap" | "drill" | "other";
  diameterInches?: number;
  lengthInches?: number;
  thread?: string;
  depthInches?: number;
  notes?: string;
}

export interface ManufacturingExport {
  id: string;
  kind: ManufacturingExportKind;
  friendlyName: string;
  quantity: number;
  machiningType: "laser" | "plasma" | "waterjet" | "3d printed" | "3D printed" | "lathe";
  material?: string;
  materialThicknessInches?: number;
  subsystem?: string;
  context: {
    documentId: string;
    workspaceOrVersion: "w" | "v" | "m";
    workspaceOrVersionId: string;
    elementId: string;
    server: string;
    configuration?: string;
  };
  selections: Array<{
    entityType: "FACE" | "BODY";
    selectionId: string;
    partId?: string;
    name?: string;
  }>;
  partId?: string;
  overallLengthInches?: number;
  dxfBounds?: {
    widthInches: number;
    heightInches: number;
    areaSquareInches: number;
  };
  stepBounds?: {
    xInches: number;
    yInches: number;
    zInches: number;
    volumeCubicInches: number;
  };
  lathe?: {
    stockType: string;
    diameterInches?: number;
    outerDiameterInches?: number;
    innerDiameterInches?: number;
    endA: ManufacturingEndOperation;
    endB: ManufacturingEndOperation;
    endReference?: string;
  };
  fileName?: string;
  storagePath?: string;
  byteLength?: number;
  contentType?: string;
  previewStatus?: "complete" | "unavailable";
  previewFileName?: string;
  previewStoragePath?: string;
  previewContentType?: string;
  previewWidth?: number;
  previewHeight?: number;
  requestedBy: {
    id: string;
    name: string;
    email?: string;
  };
  status: "queued" | "complete";
  manufacturingStatus: ManufacturingStatus;
  manufacturingCompletedAt: Date | null;
  manufacturingCompletedBy?: {
    uid: string;
    name: string;
  };
  manufacturingCancelledAt: Date | null;
  manufacturingCancelledBy?: {
    uid: string;
    name: string;
  };
  createdAt: Date | null;
}

export interface ManufacturingComment {
  id: string;
  body: string;
  authorUid: string;
  authorName: string;
  createdAt: Date | null;
}
