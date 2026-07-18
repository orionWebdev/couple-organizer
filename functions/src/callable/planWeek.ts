import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { REGION, CORS_ORIGINS, GEMINI_API_KEY } from '../lib/config'
import { assertCoupleMember, isPremiumActive } from '../lib/entitlements'
import { consume } from '../lib/rateLimit'
import { limitFor } from '../lib/limits'
import { generateWeekPlan } from '../lib/gemini'

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

    const { coupleId, count, servings, prefs, avoidTitles, favorTitles } = request.data ?? {}
    const couple = await assertCoupleMember(uid, coupleId)

    // Höchstens 7 Kochtage/Woche, mindestens 1.
    const cleanCount = Math.min(7, Math.max(1, Number(count) || 0))
    if (!cleanCount) throw new HttpsError('invalid-argument', 'Keine Kochtage angegeben.')

    const cleanServings = servings == null ? null : Math.min(12, Math.max(1, Number(servings) || 2))
    const cleanPrefs = String(prefs ?? '').trim().slice(0, 300)
    const clean = (arr: unknown): string[] =>
      Array.isArray(arr) ? arr.map((t) => String(t).trim()).filter(Boolean).slice(0, 20) : []

    const quota = await consume(coupleId, 'weekPlanAi', limitFor('weekPlanAi', isPremiumActive(couple)))
    const recipes = await generateWeekPlan({
      count: cleanCount,
      servings: cleanServings,
      prefs: cleanPrefs,
      avoidTitles: clean(avoidTitles),
      favorTitles: clean(favorTitles)
    })

    return { recipes, quota }
  }
)
