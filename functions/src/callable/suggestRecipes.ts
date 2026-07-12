import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { REGION, CORS_ORIGINS, GEMINI_API_KEY } from '../lib/config'
import { assertCoupleMember, isPremiumActive } from '../lib/entitlements'
import { consume } from '../lib/rateLimit'
import { limitFor } from '../lib/limits'
import { generateRecipes } from '../lib/gemini'

export const suggestRecipes = onCall(
  {
    region: REGION,
    cors: CORS_ORIGINS,
    enforceAppCheck: true,
    secrets: [GEMINI_API_KEY]
  },
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'Nicht angemeldet.')

    const { coupleId, query, count } = request.data ?? {}
    const couple = await assertCoupleMember(uid, coupleId)

    const cleanQuery = String(query ?? '').trim().slice(0, 200)
    if (!cleanQuery) throw new HttpsError('invalid-argument', 'Kein Rezeptwunsch angegeben.')
    const cleanCount = Math.min(5, Math.max(1, Number(count) || 3))

    const quota = await consume(coupleId, 'recipeAi', limitFor('recipeAi', isPremiumActive(couple)))
    const recipes = await generateRecipes(cleanQuery, cleanCount)

    return { recipes, quota }
  }
)
