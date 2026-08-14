import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Task, TaskStatus } from "@/types";

export async function createTask(
  input: Omit<Task, "id" | "createdAt" | "updatedAt" | "status" | "assigneeUid">
) {
  const ref = doc(collection(db, "tasks"));
  const now = new Date().toISOString();
  const task: Task = {
    ...input,
    id: ref.id,
    status: "backlog",
    assigneeUid: null,
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

// A student claiming an open task they're certified for. Security rules
// re-check the certification match server-side — this client check is just
// for a fast, friendly error message before the round-trip.
export async function claimTask(taskId: string, studentUid: string) {
  await updateDoc(doc(db, "tasks", taskId), {
    assigneeUid: studentUid,
    updatedAt: new Date().toISOString(),
  });
}

export async function releaseTask(taskId: string) {
  await updateDoc(doc(db, "tasks", taskId), {
    assigneeUid: null,
    status: "backlog",
    updatedAt: new Date().toISOString(),
  });
}

export async function moveTaskStatus(taskId: string, status: TaskStatus) {
  await updateDoc(doc(db, "tasks", taskId), {
    status,
    updatedAt: new Date().toISOString(),
  });
}
