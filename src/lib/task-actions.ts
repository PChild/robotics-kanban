import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Task, TaskStatus, TaskHistoryEntry } from "@/types";

export async function createTask(
  input: Omit<Task, "id" | "createdAt" | "updatedAt" | "status" | "assigneeUids" | "history"> & {
    assigneeUids?: string[];
  }
) {
  const ref = doc(collection(db, "tasks"));
  const now = new Date().toISOString();
  const assigneeUids = input.assigneeUids ?? [];
  const history: TaskHistoryEntry[] = assigneeUids.map((uid) => ({
    type: "assigned",
    uid,
    at: now,
  }));
  const task: Task = {
    ...input,
    assigneeUids,
    id: ref.id,
    status: "backlog",
    createdAt: now,
    updatedAt: now,
    history,
  };
  await setDoc(ref, task);
  return task;
}

export async function updateTask(taskId: string, changes: Partial<Task>) {
  await updateDoc(doc(db, "tasks", taskId), {
    ...changes,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteTask(taskId: string) {
  await deleteDoc(doc(db, "tasks", taskId));
}

// A student joining an open task they're certified for. Security rules
// re-check the certification match server-side — this is just for a fast,
// friendly failure client-side.
export async function claimTask(taskId: string, studentUid: string) {
  const entry: TaskHistoryEntry = { type: "assigned", uid: studentUid, at: new Date().toISOString() };
  await updateDoc(doc(db, "tasks", taskId), {
    assigneeUids: arrayUnion(studentUid),
    history: arrayUnion(entry),
    updatedAt: new Date().toISOString(),
  });
}

// A student removing themselves from a task they're on. Other assignees (if
// any) are left in place and the status is left as-is.
export async function leaveTask(taskId: string, uid: string) {
  const entry: TaskHistoryEntry = { type: "unassigned", uid, at: new Date().toISOString() };
  await updateDoc(doc(db, "tasks", taskId), {
    assigneeUids: arrayRemove(uid),
    history: arrayUnion(entry),
    updatedAt: new Date().toISOString(),
  });
}

// Coach/leader setting the full assignee list directly from the task dialog.
// Diffs against the task's current assignees so the history log stays
// accurate (who was added, who was removed, when).
export async function setAssignees(task: Task, newAssigneeUids: string[]) {
  const now = new Date().toISOString();
  const added = newAssigneeUids.filter((uid) => !task.assigneeUids.includes(uid));
  const removed = task.assigneeUids.filter((uid) => !newAssigneeUids.includes(uid));
  const newEntries: TaskHistoryEntry[] = [
    ...added.map((uid) => ({ type: "assigned" as const, uid, at: now })),
    ...removed.map((uid) => ({ type: "unassigned" as const, uid, at: now })),
  ];
  await updateDoc(doc(db, "tasks", task.id), {
    assigneeUids: newAssigneeUids,
    history: [...task.history, ...newEntries],
    updatedAt: now,
  });
}

export async function moveTaskStatus(task: Task, status: TaskStatus) {
  const now = new Date().toISOString();
  const newEntries: TaskHistoryEntry[] =
    status === "done"
      ? task.assigneeUids.map((uid) => ({ type: "completed" as const, uid, at: now }))
      : [];
  await updateDoc(doc(db, "tasks", task.id), {
    status,
    history: newEntries.length > 0 ? [...task.history, ...newEntries] : task.history,
    updatedAt: now,
  });
}