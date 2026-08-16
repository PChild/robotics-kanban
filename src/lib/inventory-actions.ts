import {
  collection,
  deleteDoc,
  doc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { InventoryItem, InventorySpecs } from "@/types";

export type InventoryItemInput = Omit<
  InventoryItem,
  "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"
>;

export interface InventoryActor {
  uid: string;
  name: string;
}

function cleanSpecs(specs: InventorySpecs) {
  return Object.fromEntries(
    Object.entries(specs).filter(([, value]) => value !== undefined && value !== ""),
  ) as InventorySpecs;
}

export async function createInventoryItem(input: InventoryItemInput, actor: InventoryActor) {
  const itemRef = doc(collection(db, "inventory"));
  await setDoc(itemRef, {
    ...input,
    specs: cleanSpecs(input.specs),
    id: itemRef.id,
    createdBy: actor,
    updatedBy: actor,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return itemRef.id;
}

export async function updateInventoryItem(
  itemId: string,
  input: InventoryItemInput,
  actor: InventoryActor,
) {
  await updateDoc(doc(db, "inventory", itemId), {
    ...input,
    specs: cleanSpecs(input.specs),
    updatedBy: actor,
    updatedAt: serverTimestamp(),
  });
}

export async function adjustInventoryQuantity(
  itemId: string,
  delta: number,
  actor: InventoryActor,
) {
  if (!Number.isInteger(delta) || delta === 0) {
    throw new Error("Stock adjustment must be a non-zero whole number.");
  }

  await runTransaction(db, async (transaction) => {
    const itemRef = doc(db, "inventory", itemId);
    const snapshot = await transaction.get(itemRef);
    if (!snapshot.exists()) throw new Error("This inventory item no longer exists.");

    const currentQuantity = snapshot.data().quantity;
    const nextQuantity = currentQuantity + delta;
    if (!Number.isInteger(currentQuantity) || nextQuantity < 0) {
      throw new Error("An adjustment cannot make stock negative.");
    }

    transaction.update(itemRef, {
      quantity: nextQuantity,
      updatedBy: actor,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function deleteInventoryItem(itemId: string) {
  await deleteDoc(doc(db, "inventory", itemId));
}
