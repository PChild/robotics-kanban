"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Task, UserProfile, Certification, TimeEntry, TimeclockPin, ManufacturingComment, ManufacturingExport } from "@/types";

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
            pointOfContactUid: data.pointOfContactUid ?? data.createdByUid,
            blockedReason: data.blockedReason ?? null,
            blockedDetails: data.blockedDetails ?? "",
            prerequisiteTaskIds: data.prerequisiteTaskIds ?? [],
            comments: data.comments ?? [],
            attachments: data.attachments ?? [],
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

// null means all entries (coach); a uid means only that person's entries;
// undefined waits for the auth profile before opening a Firestore listener.
export function useTimeEntries(scopeUid: string | null | undefined) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (scopeUid === undefined) return;
    const source = scopeUid
      ? query(collection(db, "timeEntries"), where("uid", "==", scopeUid))
      : collection(db, "timeEntries");
    const unsub = onSnapshot(source, (snap) => {
      setEntries(
        snap.docs
          .map((entry) => entry.data() as TimeEntry)
          .sort((a, b) => b.clockIn.localeCompare(a.clockIn))
      );
      setLoading(false);
    });
    return unsub;
  }, [scopeUid]);

  return { entries, loading };
}

export function useTimeclockPins(enabled: boolean) {
  const [pins, setPins] = useState<TimeclockPin[]>([]);

  useEffect(() => {
    if (!enabled) return;
    return onSnapshot(collection(db, "timeclockPins"), (snap) => {
      setPins(snap.docs.map((pin) => pin.data() as TimeclockPin));
    });
  }, [enabled]);

  return { pins: enabled ? pins : [] };
}

export function useManufacturingExports() {
  const [exports, setExports] = useState<ManufacturingExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const source = query(collection(db, "exports"), orderBy("createdAt", "asc"));
    return onSnapshot(
      source,
      (snapshot) => {
        setExports(
          snapshot.docs.map((record) => {
            const data = record.data();
            return {
              ...data,
              id: record.id,
              selections: data.selections ?? [],
              manufacturingStatus:
                data.manufacturingStatus === "complete" || data.manufacturingStatus === "cancelled"
                  ? data.manufacturingStatus
                  : "pending",
              manufacturingCompletedAt: data.manufacturingCompletedAt?.toDate?.() ?? null,
              manufacturingCancelledAt: data.manufacturingCancelledAt?.toDate?.() ?? null,
              createdAt: data.createdAt?.toDate?.() ?? null,
            } as ManufacturingExport;
          }),
        );
        setError(null);
        setLoading(false);
      },
      (snapshotError) => {
        console.error(snapshotError);
        setError("Parts could not be loaded. Check that the manufacturing Firestore rules are deployed.");
        setLoading(false);
      },
    );
  }, []);

  return { exports, loading, error };
}

export function useManufacturingComments(exportId: string) {
  const [comments, setComments] = useState<ManufacturingComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const source = query(collection(db, "exports", exportId, "comments"), orderBy("createdAt", "asc"));
    return onSnapshot(
      source,
      (snapshot) => {
        setComments(
          snapshot.docs.map((record) => {
            const data = record.data();
            return {
              id: record.id,
              body: data.body,
              authorUid: data.authorUid,
              authorName: data.authorName,
              createdAt: data.createdAt?.toDate?.() ?? null,
            } as ManufacturingComment;
          }),
        );
        setError(null);
        setLoading(false);
      },
      (snapshotError) => {
        console.error(snapshotError);
        setError("Comments could not be loaded.");
        setLoading(false);
      },
    );
  }, [exportId]);

  return { comments, loading, error };
}
