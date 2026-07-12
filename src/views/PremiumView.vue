<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Browser } from '@capacitor/browser'
import { useCouple } from '@/composables/useCouple'
import { usePremium } from '@/composables/usePremium'
import { showPaywall } from '@/composables/usePaywall'
import { showToast } from '@/composables/useToast'
import ProfileButton from '@/components/ui/ProfileButton.vue'

const router = useRouter()
const { couple, isPremium } = useCouple()
const { restoring, restore, canPurchase } = usePremium()

const PLAY_SUBSCRIPTIONS_URL = 'https://play.google.com/store/account/subscriptions'

const activeUntil = computed(() => {
  const ts = couple.value?.premiumUntil
  if (!ts) return null
  return ts.toDate().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
})

async function openSubscriptionSettings() {
  await Browser.open({ url: PLAY_SUBSCRIPTIONS_URL })
}

async function handleRestore() {
  const ok = await restore()
  if (ok) showToast('Abo wiederhergestellt')
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <button class="back-btn" type="button" aria-label="Zurück" @click="router.back()">‹</button>
      <h1 class="page-title">Together Plus</h1>
      <ProfileButton />
    </header>

    <div class="status-card" :class="{ 'status-card--active': isPremium }">
      <div class="status-mark" aria-hidden="true">
        <svg viewBox="0 0 120 90" width="64" height="48">
          <g style="isolation: isolate">
            <circle cx="46" cy="45" r="33" fill="var(--chris)" style="mix-blend-mode: multiply" />
            <circle cx="74" cy="45" r="33" fill="var(--sarah)" style="mix-blend-mode: multiply" />
          </g>
        </svg>
      </div>

      <template v-if="isPremium">
        <p class="status-title">Together Plus ist aktiv</p>
        <p class="status-sub">
          <template v-if="activeUntil">Verlängert sich am {{ activeUntil }}.</template>
          <template v-else>Für euch beide freigeschaltet.</template>
        </p>
      </template>
      <template v-else>
        <p class="status-title">Ihr nutzt Together kostenlos</p>
        <p class="status-sub">Alle Kernbereiche sind frei — Plus schaltet KI, Auswertungen und unbegrenzte Listen frei.</p>
      </template>
    </div>

    <button v-if="!isPremium" class="cta" @click="showPaywall('export')">
      Together Plus ansehen
    </button>

    <div class="actions">
      <button v-if="isPremium && canPurchase" class="row-btn" @click="openSubscriptionSettings">
        <span>Abo verwalten oder kündigen</span>
        <span class="row-chevron">›</span>
      </button>
      <button v-if="canPurchase" class="row-btn" :disabled="restoring" @click="handleRestore">
        <span>{{ restoring ? 'Wird geprüft …' : 'Käufe wiederherstellen' }}</span>
        <span class="row-chevron">›</span>
      </button>
    </div>

    <p class="legal">
      Die Abrechnung läuft über deinen Google-Play-Account. Ein Abo gilt immer für
      beide Partner eines Paares.
    </p>
  </div>
</template>

<style scoped>
.page {
  padding: 0 var(--screen-pad) 120px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: calc(var(--safe-top) + 18px) 0 18px;
}

.back-btn {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 50%;
  background: var(--surface-deep);
  color: var(--text);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.page-title {
  flex: 1;
  font-family: var(--font-headline);
  font-size: 26px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.status-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  padding: 26px 20px;
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-card-lg);
  box-shadow: var(--shadow-card);
  margin-bottom: 18px;
}

.status-card--active {
  background: var(--accent-tint);
}

.status-mark {
  margin-bottom: 8px;
}

.status-title {
  font-family: var(--font-headline);
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.status-sub {
  font-size: 13px;
  line-height: 1.55;
  color: var(--text-secondary);
  margin: 0;
}

.cta {
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: var(--radius-card);
  background: var(--haushalt);
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: var(--shadow-accent);
  margin-bottom: 18px;
}

.actions {
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.row-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border: none;
  border-bottom: 1px solid var(--border-softer);
  background: none;
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.row-btn:last-child {
  border-bottom: none;
}

.row-btn:disabled {
  opacity: 0.6;
}

.row-chevron {
  color: var(--text-faint);
  font-size: 20px;
}

.legal {
  margin-top: 18px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-meta);
  text-align: center;
}
</style>
