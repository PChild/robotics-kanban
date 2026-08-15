"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Task, UserProfile, Certification } from "@/types";

// These use onSnapshot directly (rather than one-shot fetches) so that when
// one student drags a card, or a coach edits a cert, every open board
// updates live without a manual refresh.

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setTasks(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            ...data,
            assigneeUids: data.assigneeUids ?? [],
            history: data.history ?? [],
          } as Task;
        })
      );
      setLoading(false);
    });
    return unsub;
  }, []);

  return { tasks, loading };
}

export function useUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => d.data() as UserProfile));
      setLoading(false);
    });
    return unsub;
  }, []);

  return { users, loading };
}

export function useCertifications() {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "certifications"), (snap) => {
      setCertifications(snap.docs.map((d) => d.data() as Certification));
      setLoading(false);
    });
    return unsub;
  }, []);

  return { certifications, loading };
}