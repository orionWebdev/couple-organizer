import { HttpsError } from 'firebase-functions/v2/https'
import { Timestamp } from 'firebase-admin/firestore'
import { db } from './admin'

export type CouplePlan = 'free' | 'premium'

export interface CoupleDoc {
  memberIds: string[]
  plan?: CouplePlan
  premiumUntil?: Timestamp | null
  rcAppUserId?: string
}

// Kulanzfenster: RevenueCat meldet BILLING_ISSUE, bevor das Abo endgültig
// ausläuft (Karte abgelaufen o. ä.). Solange behält das Paar den Zugang —
// EXPIRATION setzt plan hart auf 'free' und beendet ihn.
const GRACE_MS = 3 * 24 * 60 * 60 * 1000

export function isPremiumActive(couple: CoupleDoc): boolean {
  if (couple.plan !== 'premium') return false
  const until = couple.premiumUntil?.toMillis() ?? 0
  return until > Date.now() - GRACE_MS
}

// Einziger Ort, an dem eine coupleId aus dem Client verifiziert wird. Ohne das
// könnte jeder Angemeldete die Quote eines fremden Paares verbrennen.
export async function assertCoupleMember(uid: string, coupleId: unknown): Promise<CoupleDoc> {
  if (typeof coupleId !== 'string' || !coupleId) {
    throw new HttpsError('invalid-argument', 'coupleId fehlt.')
  }

  const snap = await db.collection('couples').doc(coupleId).get()
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Couple existiert nicht.')
  }

  const data = snap.data() as CoupleDoc
  if (!Array.isArray(data.memberIds) || !data.memberIds.includes(uid)) {
    throw new HttpsError('permission-denied', 'Kein Mitglied dieses Paares.')
  }

  return data
}
