import { Timestamp, FieldValue } from 'firebase-admin/firestore'
import { db } from './admin'
import type { CouplePlan } from './entitlements'

// Der EINZIGE Schreibpfad für die Entitlement-Felder. Der Client kann sie nicht
// schreiben (firestore.rules), das Admin SDK umgeht die Rules.
export async function writeEntitlement(
  coupleId: string,
  plan: CouplePlan,
  expiresAtMs: number | null,
  rcAppUserId?: string
): Promise<void> {
  await db
    .collection('couples')
    .doc(coupleId)
    .set(
      {
        plan,
        premiumUntil: expiresAtMs ? Timestamp.fromMillis(expiresAtMs) : null,
        premiumStore: 'play',
        premiumUpdatedAt: FieldValue.serverTimestamp(),
        ...(rcAppUserId ? { rcAppUserId } : {})
      },
      { merge: true }
    )
}

// RevenueCat App User ID <-> coupleId. Bewusst das Paar, nicht der Nutzer:
// kauft einer, haben beide Premium.
export const RC_PREFIX = 'couple_'

export function coupleIdFromAppUserId(appUserId: unknown): string | null {
  if (typeof appUserId !== 'string') return null
  if (!appUserId.startsWith(RC_PREFIX)) return null // ignoriert $RCAnonymousID:*
  const id = appUserId.slice(RC_PREFIX.length)
  return id || null
}

export function appUserIdFor(coupleId: string): string {
  return `${RC_PREFIX}${coupleId}`
}
