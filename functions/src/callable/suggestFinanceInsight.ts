import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { REGION, CORS_ORIGINS, GEMINI_API_KEY } from '../lib/config'
import { assertCoupleMember, isPremiumActive } from '../lib/entitlements'
import { consume } from '../lib/rateLimit'
import { limitFor } from '../lib/limits'
import { generateFinanceInsight, type FinanceCategoryDelta } from '../lib/gemini'

const MAX_DELTAS = 20

// Die Zahlen kommen aus useExpenses.financeMonths, also aus dem Client. Sie
// landen ausschließlich im Prompt-Text (nie in Firestore), müssen aber trotzdem
// getypt werden — sonst kann man beliebigen Text in den Prompt schmuggeln.
function sanitizeDeltas(raw: unknown): FinanceCategoryDelta[] {
  if (!Array.isArray(raw)) return []
  return raw.slice(0, MAX_DELTAS).map((d: any) => ({
    name: String(d?.name ?? '').slice(0, 60),
    currentEuros: Number(d?.currentEuros) || 0,
    previousEuros: Number(d?.previousEuros) || 0,
    deltaPct: d?.deltaPct === null || d?.deltaPct === undefined ? null : Number(d.deltaPct) || 0
  }))
}

export const suggestFinanceInsight = onCall(
  {
    region: REGION,
    cors: CORS_ORIGINS,
    enforceAppCheck: true,
    secrets: [GEMINI_API_KEY]
  },
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'Nicht angemeldet.')

    const { coupleId, deltas, monthLabel } = request.data ?? {}
    const couple = await assertCoupleMember(uid, coupleId)

    // Free-Limit ist 0 → consume() wirft 'failed-precondition'/'premium-required'.
    const quota = await consume(coupleId, 'financeAi', limitFor('financeAi', isPremiumActive(couple)))

    const insightText = await generateFinanceInsight(
      sanitizeDeltas(deltas),
      String(monthLabel ?? '').slice(0, 40)
    )

    return { insightText, quota }
  }
)
