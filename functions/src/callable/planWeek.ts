import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { REGION, CORS_ORIGINS, GEMINI_API_KEY } from '../lib/config'
import { assertCoupleMember, isPremiumActive } from '../lib/entitlements'
import { consume } from '../lib/rateLimit'
import { limitFor } from '../lib/limits'
import { generateWeekPlan } from '../lib/gemini'
import { sanitizeRecipeContext } from '../lib/sanitize'

// Wochen-Autopilot (TwoDo Plus): plant die Kochtage der Woche in EINEM
// Gemini-Aufruf. free-Limit ist 0 → consume() wirft failed-precondition, der
// Client öffnet die Paywall. Muster identisch zu suggestRecipes.
export const planWeek = onCall(
  {
    region: REGION,
    cors: CORS_ORIGINS,
    enforceAppCheck: true,
    secrets: [GEMINI_API_KEY]
  },
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'Nicht angemeldet.')

    const { coupleId, count } = request.data ?? {}
    const couple = await assertCoupleMember(uid, coupleId)

    // Höchstens 7 Kochtage/Woche, mindestens 1.
    const cleanCount = Math.min(7, Math.max(1, Number(count) || 0))
    if (!cleanCount) throw new HttpsError('invalid-argument', 'Keine Kochtage angegeben.')

    const quota = await consume(coupleId, 'weekPlanAi', limitFor('weekPlanAi', isPremiumActive(couple)))
    const recipes = await generateWeekPlan({
      ...sanitizeRecipeContext(request.data),
      count: cleanCount
    })

    return { recipes, quota }
  }
)
