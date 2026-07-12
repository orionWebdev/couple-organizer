import { ref } from 'vue'
import type { PremiumFeature } from '@/utils/premium'

// Modul-Singleton wie useToast: jede Composable/View kann die Paywall öffnen,
// ohne sie irgendwo durchzureichen. Gerendert wird sie einmal in TabsView.
const paywallFeature = ref<PremiumFeature | null>(null)

export function showPaywall(feature: PremiumFeature) {
  paywallFeature.value = feature
}

export function hidePaywall() {
  paywallFeature.value = null
}

export function usePaywallState() {
  return { paywallFeature }
}
