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
import type { Task, TaskStatus } from "@/types";

export async function createTask(
  input: Omit<Task, "id" | "createdAt" | "updatedAt" | "status" | "assigneeUids"> & {
    assigneeUids?: string[];
  }
) {
  const ref = doc(collection(db, "tasks"));
  const now = new Date().toISOString();
  const task: Task = {
    ...input,
    assigneeUids: input.assigneeUids ?? [],
    id: ref.id,
    status: "backlog",
    createdAt: now,
    updatedAt: now,
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

// A student joining an open task they're certified for. Multiple students
// can be on the same task. Security rules re-check the certification match
// server-side — this is just for a fast, friendly failure client-side.
export async function claimTask(taskId: string, studentUid: string) {
  await updateDoc(doc(db, "tasks", taskId), {
    assigneeUids: arrayUnion(studentUid),
    updatedAt: new Date().toISOString(),
  });
}

// A student removing themselves from a task they're on. Other assignees (if
// any) are left in place and the status is left as-is.
export async function leaveTask(taskId: string, uid: string) {
  await updateDoc(doc(db, "tasks", taskId), {
    assigneeUids: arrayRemove(uid),
    updatedAt: new Date().toISOString(),
  });
}

export async function moveTaskStatus(taskId: string, status: TaskStatus) {
  await updateDoc(doc(db, "tasks", taskId), {
    status,
    updatedAt: new Date().toISOString(),
  });
}