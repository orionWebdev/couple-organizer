import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { REGION, CORS_ORIGINS, REVENUECAT_SECRET_KEY } from '../lib/config'
import { assertCoupleMember } from '../lib/entitlements'
import { writeEntitlement, appUserIdFor } from '../lib/writeEntitlement'

const RC_API = 'https://api.revenuecat.com/v1/subscribers'
const ENTITLEMENT_ID = 'premium'

// Notausgang gegen Webhook-Latenz: direkt nach einem Kauf und beim App-Resume
// fragt der Client hier den echten Stand bei RevenueCat ab, statt darauf zu
// warten, dass der Webhook irgendwann eintrudelt.
export const syncEntitlement = onCall(
  {
    region: REGION,
    cors: CORS_ORIGINS,
    enforceAppCheck: true,
    secrets: [REVENUECAT_SECRET_KEY]
  },
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'Nicht angemeldet.')

    const { coupleId } = request.data ?? {}
    await assertCoupleMember(uid, coupleId)

    const appUserId = appUserIdFor(coupleId)
    const res = await fetch(`${RC_API}/${encodeURIComponent(appUserId)}`, {
      headers: { Authorization: `Bearer ${REVENUECAT_SECRET_KEY.value()}` }
    })

    if (!res.ok) {
      console.error(`RevenueCat ${res.status}: ${await res.text().catch(() => '')}`)
      throw new HttpsError('unavailable', 'Abo-Status konnte nicht geprüft werden.')
    }

    const data = (await res.json()) as {
      subscriber?: { entitlements?: Record<string, { expires_date?: string | null }> }
    }

    const ent = data.subscriber?.entitlements?.[ENTITLEMENT_ID]
    // expires_date === null bedeutet bei RevenueCat "lifetime".
    const expiresAtMs = ent
      ? ent.expires_date
        ? Date.parse(ent.expires_date)
        : null
      : undefined

    if (expiresAtMs === undefined) {
      await writeEntitlement(coupleId, 'free', null, appUserId)
      return { plan: 'free' as const, premiumUntil: null }
    }

    const active = expiresAtMs === null || expiresAtMs > Date.now()
    await writeEntitlement(coupleId, active ? 'premium' : 'free', expiresAtMs, appUserId)
    return { plan: active ? ('premium' as const) : ('free' as const), premiumUntil: expiresAtMs }
  }
)
