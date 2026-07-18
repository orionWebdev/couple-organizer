// MUSS mit src/utils/premium.ts (Client) übereinstimmen. Der Client zeigt die
// Zahlen nur an — durchgesetzt werden sie ausschließlich hier.
export const AI_LIMITS = {
  recipeAi: { free: 3, premium: 60 },
  financeAi: { free: 0, premium: 30 },
  // Wochen-Autopilot: reines Plus-Feature (free: 0 → consume() wirft sofort
  // failed-precondition, der Client öffnet die Paywall). 8/Monat ≈ 2×/Woche.
  weekPlanAi: { free: 0, premium: 8 }
} as const

export type AiBucket = keyof typeof AI_LIMITS

export function limitFor(bucket: AiBucket, isPremium: boolean): number {
  return isPremium ? AI_LIMITS[bucket].premium : AI_LIMITS[bucket].free
}
