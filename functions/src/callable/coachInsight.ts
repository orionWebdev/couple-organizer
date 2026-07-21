import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { REGION, CORS_ORIGINS, GEMINI_API_KEY } from '../lib/config'
import { assertCoupleMember, isPremiumActive } from '../lib/entitlements'
import { consume } from '../lib/rateLimit'
import { limitFor } from '../lib/limits'
import { generateCoachInsight, COACH_LENSES, type CoachLens } from '../lib/gemini'
import { clampSnapshot } from '../lib/sanitize'

// Der Paar-Coach. Ersetzt suggestFinanceInsight: eine Funktion, drei Blickwinkel
// ('week' | 'fairness' | 'money') über denselben Snapshot — statt je Bereich ein
// eigenes Callable mit eigenem Prompt.
//
// Den Snapshot baut der Client (src/utils/coachSnapshot.ts), weil dort die
// Composables mit den fertigen Zahlen laufen. Er landet ausschließlich im
// Prompt-Text, nie in Firestore — muss aber trotzdem in Form und Größe geklemmt
// werden, bevor er dorthin geht.
export const coachInsight = onCall(
  {
    region: REGION,
    cors: CORS_ORIGINS,
    enforceAppCheck: true,
    secrets: [GEMINI_API_KEY]
  },
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'Nicht angemeldet.')

    const { coupleId, lens, snapshot } = request.data ?? {}
    const couple = await assertCoupleMember(uid, coupleId)

    const cleanLens: CoachLens = COACH_LENSES.includes(lens) ? lens : 'week'
    const cleanSnapshot = clampSnapshot(snapshot)
    if (!cleanSnapshot) throw new HttpsError('invalid-argument', 'Keine Auswertungsdaten übergeben.')

    const quota = await consume(coupleId, 'coachAi', limitFor('coachAi', isPremiumActive(couple)))
    const report = await generateCoachInsight(cleanLens, cleanSnapshot)

    return { report, quota }
  }
)
