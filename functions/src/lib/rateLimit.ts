import { HttpsError } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import { db } from './admin'
import type { AiBucket } from './limits'

// usage/{coupleId} → { recipeAi: { "2026-07": 3 }, financeAi: { "2026-07": 1 } }
// Pro Paar, nicht pro Nutzer: das Abo gehört dem Paar, also auch die Quote.
function monthKey(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

export interface QuotaState {
  used: number
  limit: number
}

// Zählt den Verbrauch VOR dem Gemini-Aufruf hoch (nicht danach) — sonst könnten
// parallele Requests die Quote überziehen. Preis dafür: ein fehlgeschlagener
// Gemini-Call kostet trotzdem eine Einheit. Das ist der richtige Tausch, solange
// echtes Geld am anderen Ende hängt.
export async function consume(coupleId: string, bucket: AiBucket, limit: number): Promise<QuotaState> {
  if (limit <= 0) {
    throw new HttpsError('failed-precondition', 'premium-required', { bucket, limit: 0, used: 0 })
  }

  const ref = db.collection('usage').doc(coupleId)
  const key = monthKey()

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const used = (snap.data()?.[bucket]?.[key] as number | undefined) ?? 0

    if (used >= limit) {
      throw new HttpsError('resource-exhausted', 'quota-exceeded', { bucket, limit, used })
    }

    tx.set(
      ref,
      {
        [bucket]: { [key]: FieldValue.increment(1) },
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    )

    return { used: used + 1, limit }
  })
}
