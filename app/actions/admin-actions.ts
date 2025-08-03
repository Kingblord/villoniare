"use server"

import { collection, getDocs, writeBatch } from "firebase/firestore"
import { db } from "@/lib/firebase"

/**
 * Clears all documents from the 'transactions' collection in Firestore.
 * This operation is irreversible.
 * @returns {Promise<{ success: boolean; message: string; error?: string }>}
 */
export async function clearAllTransactions(): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const transactionsRef = collection(db, "transactions")
    const snapshot = await getDocs(transactionsRef)

    if (snapshot.empty) {
      return { success: true, message: "No transactions to clear." }
    }

    const batch = writeBatch(db)
    let deletedCount = 0

    snapshot.docs.forEach((document) => {
      batch.delete(document.ref)
      deletedCount++
    })

    await batch.commit()

    return { success: true, message: `Successfully cleared ${deletedCount} transactions.` }
  } catch (error: any) {
    console.error("Error clearing all transactions:", error)
    return { success: false, message: "Failed to clear transactions.", error: error.message }
  }
}
