"use client";

import { deleteField, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ManufacturingStatus } from "@/types";

export async function setManufacturingStatus(
  exportId: string,
  status: ManufacturingStatus,
  changedBy: { uid: string; name: string },
) {
  const ref = doc(db, "exports", exportId);

  if (status === "complete") {
    await updateDoc(ref, {
      manufacturingStatus: "complete",
      manufacturingCompletedAt: serverTimestamp(),
      manufacturingCompletedBy: changedBy,
      manufacturingCancelledAt: deleteField(),
      manufacturingCancelledBy: deleteField(),
    });
    return;
  }

  if (status === "cancelled") {
    await updateDoc(ref, {
      manufacturingStatus: "cancelled",
      manufacturingCancelledAt: serverTimestamp(),
      manufacturingCancelledBy: changedBy,
      manufacturingCompletedAt: deleteField(),
      manufacturingCompletedBy: deleteField(),
    });
    return;
  }

  await updateDoc(ref, {
    manufacturingStatus: "pending",
    manufacturingCompletedAt: deleteField(),
    manufacturingCompletedBy: deleteField(),
    manufacturingCancelledAt: deleteField(),
    manufacturingCancelledBy: deleteField(),
  });
}
