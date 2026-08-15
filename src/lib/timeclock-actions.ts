import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TimeclockActivity, TimeclockPin, TimeEntry } from "@/types";

export async function setTimeclockPin(uid: string, pin: string) {
  if (!/^\d{1,3}$/.test(pin)) throw new Error("PINs must be 1–3 digits.");
  const existing = await getDocs(query(collection(db, "timeclockPins"), where("pin", "==", pin), limit(1)));
  if (!existing.empty && existing.docs[0].id !== uid) throw new Error("That PIN is already in use.");

  const record: TimeclockPin = { uid, pin, updatedAt: new Date().toISOString() };
  await setDoc(doc(db, "timeclockPins", uid), record);
}

export async function assignAvailableTimeclockPin(uid: string) {
  const snapshot = await getDocs(collection(db, "timeclockPins"));
  const usedPins = new Set(snapshot.docs.map((pin) => (pin.data() as TimeclockPin).pin));
  const randomStart = crypto.getRandomValues(new Uint16Array(1))[0] % 999;

  // Scan the full 1–999 range from a random starting point. Calling
  // setTimeclockPin re-checks uniqueness immediately before the write.
  for (let offset = 0; offset < 999; offset += 1) {
    const pin = String(((randomStart + offset) % 999) + 1);
    if (usedPins.has(pin)) continue;
    try {
      await setTimeclockPin(uid, pin);
      return pin;
    } catch (error) {
      if (error instanceof Error && error.message === "That PIN is already in use.") continue;
      throw error;
    }
  }

  throw new Error("All available 1–3 digit timeclock PINs are already assigned.");
}

export async function removeTimeclockPin(uid: string) {
  await deleteDoc(doc(db, "timeclockPins", uid));
}

export async function findUidByPin(pin: string) {
  const result = await getDocs(query(collection(db, "timeclockPins"), where("pin", "==", pin), limit(1)));
  return result.empty ? null : (result.docs[0].data() as TimeclockPin).uid;
}

export async function clockInUser(
  uid: string,
  activity: TimeclockActivity,
  activityName: string,
  coachUid: string
) {
  const openEntries = await getDocs(
    query(collection(db, "timeEntries"), where("uid", "==", uid), where("clockOut", "==", null), limit(1))
  );
  if (!openEntries.empty) throw new Error("This person is already signed in.");

  const ref = doc(collection(db, "timeEntries"));
  const entry: TimeEntry = {
    id: ref.id,
    uid,
    activity,
    activityName: activityName.trim(),
    clockIn: new Date().toISOString(),
    clockOut: null,
    clockedInByUid: coachUid,
    clockedOutByUid: null,
  };
  await setDoc(ref, entry);
  return entry;
}

export async function clockOutEntry(entryId: string, coachUid: string) {
  await updateDoc(doc(db, "timeEntries", entryId), {
    clockOut: new Date().toISOString(),
    clockedOutByUid: coachUid,
  });
}

export async function clockOutEveryone(entries: TimeEntry[], coachUid: string) {
  const now = new Date().toISOString();
  for (let start = 0; start < entries.length; start += 500) {
    const batch = writeBatch(db);
    for (const entry of entries.slice(start, start + 500)) {
      batch.update(doc(db, "timeEntries", entry.id), {
        clockOut: now,
        clockedOutByUid: coachUid,
      });
    }
    await batch.commit();
  }
}
