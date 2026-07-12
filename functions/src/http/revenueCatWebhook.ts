import { onRequest } from 'firebase-functions/v2/https'
import { db } from '../lib/admin'
import { REGION, REVENUECAT_WEBHOOK_SECRET } from '../lib/config'
import { writeEntitlement, coupleIdFromAppUserId } from '../lib/writeEntitlement'

// Events, die Premium (neu) gewähren oder verlängern.
const GRANTING = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
  'NON_RENEWING_PURCHASE'
])

export const revenueCatWebhook = onRequest(
  { region: REGION, secrets: [REVENUECAT_WEBHOOK_SECRET] },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed')
      return
    }

    if (req.headers.authorization !== REVENUECAT_WEBHOOK_SECRET.value()) {
      res.status(401).send('Unauthorized')
      return
    }

    const event = req.body?.event
    if (!event?.id || !event?.type) {
      res.status(400).send('Bad Request')
      return
    }

    const coupleId = coupleIdFromAppUserId(event.app_user_id)
    if (!coupleId) {
      // Anonyme RC-IDs (Kauf vor logIn) — nichts zuzuordnen, aber kein Fehler:
      // ein Nicht-2xx würde RevenueCat in eine Retry-Schleife schicken.
      console.warn(`Webhook ohne zuordenbare coupleId: ${event.app_user_id}`)
      res.status(200).send('ignored')
      return
    }

    // Idempotenz: RevenueCat liefert bei Netzproblemen dasselbe Event mehrfach.
    const eventRef = db.collection('webhookEvents').doc(String(event.id))
    try {
      await eventRef.create({
        type: event.type,
        coupleId,
        receivedAt: new Date()
      })
    } catch {
      res.status(200).send('duplicate')
      return
    }

    try {
      if (GRANTING.has(event.type)) {
        await writeEntitlement(coupleId, 'premium', event.expiration_at_ms ?? null, event.app_user_id)
      } else if (event.type === 'EXPIRATION') {
        await writeEntitlement(coupleId, 'free', event.expiration_at_ms ?? null, event.app_user_id)
      } else if (event.type === 'TRANSFER') {
        // Abo wechselt zu einem anderen Play-Konto → altes Paar verliert es.
        for (const from of event.transferred_from ?? []) {
          const fromCouple = coupleIdFromAppUserId(from)
          if (fromCouple) await writeEntitlement(fromCouple, 'free', null, from)
        }
        for (const to of event.transferred_to ?? []) {
          const toCouple = coupleIdFromAppUserId(to)
          if (toCouple) await writeEntitlement(toCouple, 'premium', event.expiration_at_ms ?? null, to)
        }
      }
      // CANCELLATION: bewusst KEINE Änderung — gekündigt heißt "läuft nicht mehr
      // weiter", nicht "sofort weg". Der Zugang endet mit premiumUntil, und das
      // finale EXPIRATION-Event setzt plan auf 'free'.
      // BILLING_ISSUE: ebenfalls keine Änderung — das Kulanzfenster in
      // isPremiumActive() deckt es ab.

      res.status(200).send('ok')
    } catch (e) {
      // Event-Doc wieder freigeben, damit der RevenueCat-Retry erneut greifen kann.
      await eventRef.delete().catch(() => {})
      console.error('Webhook-Verarbeitung fehlgeschlagen', e)
      res.status(500).send('error')
    }
  }
)
