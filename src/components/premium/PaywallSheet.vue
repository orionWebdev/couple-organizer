<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PurchasesPackage } from '@revenuecat/purchases-capacitor'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { usePaywallState, hidePaywall } from '@/composables/usePaywall'
import { usePremium } from '@/composables/usePremium'
import { showToast } from '@/composables/useToast'
import { PAYWALL_COPY, PREMIUM_AI_LIMITS } from '@/utils/premium'

const { paywallFeature } = usePaywallState()
const { packages, purchasing, restoring, error, canPurchase, purchase, restore } = usePremium()

// Die Paywall wird immer aus einem konkreten Anlass geöffnet — der Aufhänger
// oben ist deshalb feature-spezifisch, die Vorteilsliste darunter für alle gleich.
const copy = computed(() => (paywallFeature.value ? PAYWALL_COPY[paywallFeature.value] : null))

const BENEFITS = [
  { icon: '✨', text: 'KI-Rezeptvorschläge ohne Limit' },
  { icon: '📊', text: 'Finanz-Coach & vollständiger Verlauf' },
  { icon: '🛒', text: 'Beliebig viele Einkaufslisten & Rezepte' },
  { icon: '🚗', text: 'Beliebig viele geteilte Ressourcen' },
  { icon: '📤', text: 'Ausgaben & Termine exportieren' }
]

const selected = ref<PurchasesPackage | null>(null)

// Aufsteigender Preis als Lese-Anker: Monatlich → Jährlich → Lifetime.
const PACKAGE_ORDER: Record<string, number> = { MONTHLY: 0, ANNUAL: 1, LIFETIME: 2 }

const sortedPackages = computed(() => {
  const list = [...packages.value] as PurchasesPackage[]
  return list.sort(
    (a, b) => (PACKAGE_ORDER[a.packageType] ?? 9) - (PACKAGE_ORDER[b.packageType] ?? 9)
  )
})

// Jahres-Paket bleibt vorausgewählt — es ist das bessere Geschäft für beide
// Seiten und soll nicht erst gesucht werden müssen.
const activePackage = computed(
  () =>
    selected.value ??
    sortedPackages.value.find((p) => p.packageType === 'ANNUAL') ??
    sortedPackages.value[0] ??
    null
)

const isLifetimeActive = computed(() => activePackage.value?.packageType === 'LIFETIME')

function labelFor(pkg: PurchasesPackage): string {
  if (pkg.packageType === 'ANNUAL') return 'Jährlich'
  if (pkg.packageType === 'MONTHLY') return 'Monatlich'
  if (pkg.packageType === 'LIFETIME') return 'Einmal zahlen'
  return pkg.product.title
}

const FAIR_USE_NOTE = `KI-Funktionen mit fairem Monatskontingent für euch beide: ${PREMIUM_AI_LIMITS.aiRecipesPerMonth} Rezeptvorschläge, ${PREMIUM_AI_LIMITS.coachPerMonth} Coach-Berichte, ${PREMIUM_AI_LIMITS.weekPlanPerMonth} Wochenpläne.`

async function handlePurchase() {
  const pkg = activePackage.value
  if (!pkg) return
  const ok = await purchase(pkg)
  if (ok) {
    hidePaywall()
    showToast('Willkommen bei TwoDo Plus 💛')
  }
}

async function handleRestore() {
  const ok = await restore()
  if (ok) {
    hidePaywall()
    showToast('Abo wiederhergestellt')
  }
}
</script>

<template>
  <BottomSheet :isOpen="paywallFeature !== null" @close="hidePaywall()">
    <div class="paywall">
      <div class="paywall-mark" aria-hidden="true">
        <svg viewBox="0 0 120 90" width="76" height="57">
          <g style="isolation: isolate">
            <circle cx="46" cy="45" r="33" fill="var(--chris)" style="mix-blend-mode: multiply" />
            <circle cx="74" cy="45" r="33" fill="var(--sarah)" style="mix-blend-mode: multiply" />
          </g>
        </svg>
      </div>

      <h2 class="paywall-title">{{ copy?.title }}</h2>
      <p class="paywall-body">{{ copy?.body }}</p>

      <ul class="benefits">
        <li v-for="b in BENEFITS" :key="b.text" class="benefit">
          <span class="benefit-icon">{{ b.icon }}</span>
          <span>{{ b.text }}</span>
        </li>
        <li class="benefit-note">{{ FAIR_USE_NOTE }}</li>
      </ul>

      <template v-if="canPurchase && sortedPackages.length > 0">
        <div class="plans" :class="{ 'plans--stacked': sortedPackages.length > 2 }">
          <button
            v-for="pkg in sortedPackages"
            :key="pkg.identifier"
            type="button"
            class="plan"
            :class="{ 'plan--active': activePackage?.identifier === pkg.identifier }"
            @click="selected = pkg"
          >
            <span class="plan-label">
              {{ labelFor(pkg) }}
              <i v-if="pkg.packageType === 'ANNUAL'" class="plan-badge">Beliebt</i>
            </span>
            <span class="plan-price">{{ pkg.product.priceString }}</span>
          </button>
        </div>

        <p v-if="isLifetimeActive" class="paywall-note">Einmal zahlen, für immer TwoDo Plus — für euch beide.</p>
        <p v-else class="paywall-note">Ein Abo für euch beide: sobald einer bucht, ist auch bei deinem Partner alles freigeschaltet. Jederzeit im Play Store kündbar.</p>

        <button class="cta" :disabled="purchasing || !activePackage" @click="handlePurchase">
          {{ purchasing ? 'Wird gebucht …' : 'TwoDo Plus holen' }}
        </button>

        <button class="link-btn" :disabled="restoring" @click="handleRestore">
          {{ restoring ? 'Wird geprüft …' : 'Käufe wiederherstellen' }}
        </button>
      </template>

      <!-- Web: Play Billing gibt es nur in der App. isPremium gilt hier
           trotzdem — wer in der App bucht, hat auch im Browser Premium. -->
      <p v-else-if="!canPurchase" class="paywall-note paywall-note--web">
        TwoDo Plus buchst du in der Android-App. Dein Abo gilt danach automatisch auch hier im Browser.
      </p>

      <p v-else class="paywall-note paywall-note--web">
        Die Angebote konnten gerade nicht geladen werden. Prüfe deine Verbindung und versuch es erneut.
      </p>

      <p v-if="error" class="paywall-error">{{ error }}</p>
    </div>
  </BottomSheet>
</template>

<style scoped>
.paywall {
  padding-bottom: 8px;
}

.paywall-mark {
  display: flex;
  justify-content: center;
  margin-bottom: 14px;
}

.paywall-title {
  font-family: var(--font-headline);
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
  text-align: center;
  margin: 0 0 8px;
}

.paywall-body {
  font-size: 14px;
  line-height: 1.55;
  color: var(--text-secondary);
  text-align: center;
  margin: 0 0 20px;
}

.benefits {
  list-style: none;
  margin: 0 0 22px;
  padding: 16px;
  background: var(--surface-deep);
  border-radius: var(--radius-card);
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.benefit {
  display: flex;
  align-items: center;
  gap: 11px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.benefit-icon {
  flex-shrink: 0;
  font-size: 16px;
}

.plans {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

/* Ab drei Optionen (Monat/Jahr/Lifetime) gestapelte Zeilen statt Spalten —
   drei Spalten quetschen die Preise auf schmalen Screens. */
.plans--stacked {
  flex-direction: column;
}

.plans--stacked .plan {
  flex-direction: row;
  justify-content: space-between;
  padding: 13px 16px;
}

.plan-badge {
  font-style: normal;
  margin-left: 6px;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--haushalt);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.4px;
}

.benefit-note {
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--text-meta);
  padding-top: 4px;
  border-top: 1px solid var(--border-softer);
}

.plan {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 10px;
  border: 2px solid var(--border-soft);
  border-radius: var(--radius-card);
  background: var(--surface);
  cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}

.plan:active {
  transform: scale(0.97);
}

.plan--active {
  border-color: var(--haushalt);
  background: var(--haushalt-tint);
}

.plan-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-meta);
}

.plan-price {
  font-size: 17px;
  font-weight: 800;
  color: var(--text);
}

.cta {
  width: 100%;
  padding: 16px;
  border: none;
  /* Button, kein Kartencontainer: folgt der Button-Skala (18px), nicht dem auf
     26px angehobenen --radius-card. */
  border-radius: 18px;
  background: var(--haushalt);
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: var(--shadow-accent);
  transition: transform var(--dur-fast) var(--ease-out);
}

.cta:active:not(:disabled) {
  transform: scale(0.98);
}

.cta:disabled {
  opacity: 0.6;
}

.link-btn {
  width: 100%;
  margin-top: 10px;
  padding: 10px;
  border: none;
  background: none;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.paywall-note {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-meta);
  text-align: center;
  margin: 0 0 14px;
}

.paywall-note--web {
  margin: 0;
  padding: 14px;
  background: var(--surface-deep);
  border-radius: var(--radius-card);
}

.paywall-error {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--danger);
  text-align: center;
}
</style>
