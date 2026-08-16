"use client";

import { FirebaseError } from "firebase/app";
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import type { ManufacturingExport, ManufacturingStatus } from "@/types";

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

export async function addManufacturingComment(
  exportId: string,
  body: string,
  author: { uid: string; name: string },
) {
  const cleanBody = body.trim();
  if (!cleanBody || cleanBody.length > 2000) {
    throw new Error("Comments must be between 1 and 2,000 characters.");
  }

  await addDoc(collection(db, "exports", exportId, "comments"), {
    body: cleanBody,
    authorUid: author.uid,
    authorName: author.name,
    createdAt: serverTimestamp(),
  });
}

export async function deleteManufacturingExport(item: ManufacturingExport) {
  const storagePaths = [
    ...new Set(
      [item.storagePath, item.previewStoragePath].filter(
        (path): path is string => Boolean(path),
      ),
    ),
  ];

  await Promise.all(
    storagePaths.map(async (storagePath) => {
      try {
        await deleteObject(ref(storage, storagePath));
      } catch (error) {
        // A retry should still work if one of the referenced objects was
        // removed by an earlier attempt or directly in Firebase Storage.
        if (!(error instanceof FirebaseError && error.code === "storage/object-not-found")) {
          throw error;
        }
      }
    }),
  );

  // Firestore does not cascade parent deletes into subcollections. Remove
  // comments in bounded batches before deleting the export document itself.
  const commentsRef = collection(db, "exports", item.id, "comments");
  while (true) {
    const comments = await getDocs(query(commentsRef, limit(450)));
    if (comments.empty) break;

    const batch = writeBatch(db);
    comments.docs.forEach((comment) => batch.delete(comment.ref));
    await batch.commit();
  }

  await deleteDoc(doc(db, "exports", item.id));
}
