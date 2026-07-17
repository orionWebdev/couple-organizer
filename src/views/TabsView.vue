<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useCouple } from '@/composables/useCouple'
import { useFabState } from '@/composables/useFab'
import Toast from '@/components/ui/Toast.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import InviteCodeBox from '@/components/couple/InviteCodeBox.vue'
import PaywallSheet from '@/components/premium/PaywallSheet.vue'

// useCouple ist ein Modul-Singleton und startet seinen Listener selbst, sobald
// user.coupleId gesetzt ist — hier ist nichts mehr anzustoßen.
const { couple } = useCouple()

const route = useRoute()
const router = useRouter()

// Show invite prompt while the partner has not joined yet
const partnerMissing = computed(() =>
  !!couple.value && couple.value.memberIds.length < 2
)
const showInvite = ref(false)

interface NavItem { id: string; label: string; icon: string; color: string; href: string }

// Bereichsfarbe + Icon je Tab. "Planung" (Belegung · Ideen · Reisen · Notizen)
// sitzt bewusst mittig — es ist der Hub, nicht der letzte Slot. Finanz-Coach ist
// ein Tab innerhalb von Finanzen. Die id ist zugleich das Routen-Segment.
const NAV_ITEMS: readonly NavItem[] = [
  { id: 'dashboard', label: 'Start', icon: '🏠', color: 'var(--dashboard)', href: '/dashboard' },
  { id: 'haushalt', label: 'Haushalt', icon: '🧽', color: 'var(--haushalt)', href: '/haushalt' },
  { id: 'planung', label: 'Planung', icon: '🗓️', color: 'var(--planung)', href: '/planung' },
  { id: 'finanzen', label: 'Finanzen', icon: '💶', color: 'var(--finanzen)', href: '/finanzen' },
  { id: 'einkaufen', label: 'Essen', icon: '🍽️', color: 'var(--food)', href: '/einkaufen' },
]

// Routen ohne eigenen Nav-Slot leihen sich den Slot ihres Bereichs. Aktuell
// gibt es keine — der Belegungs-Kalender ist ein Tab innerhalb der Planung. Die
// Einstellungen (Profil-Avatare im Header) haben keinen Bereich — dort bleibt
// die Bubble auf "Start".
const SLOT_ALIASES: Record<string, string> = {}

const activeId = computed(() => {
  const seg = route.path.split('/')[1] || 'dashboard'
  const id = SLOT_ALIASES[seg] ?? seg
  return NAV_ITEMS.find(i => i.id === id)?.id ?? 'dashboard'
})

// ── Globaler FAB ─────────────────────────────────────────────
// Ein Exemplar für die ganze App. Die aktive View meldet ihre Add-Aktion über
// useFab an; der FAB färbt sich im Ton des aktiven Bereichs (Farbe aus NAV_ITEMS,
// da der Shell außerhalb der area-*-Klasse liegt und --accent sonst der Default
// wäre).
const { action: fabAction } = useFabState()
const activeColor = computed(
  () => NAV_ITEMS.find(i => i.id === activeId.value)?.color ?? 'var(--accent)'
)

// Navigationslogik unverändert: gleiche Items, gleiche Routen. Die frühere
// index/prozentbasierte Positionsmathematik (slotCenterPercent, Gleit-Bubble,
// Droplets, Collar) entfällt — im Contract trägt jedes Item seine eigene Bubble,
// die beim Aktivieren erscheint, statt einer einzigen wandernden.
function selectNav(id: string) {
  const item = NAV_ITEMS.find(i => i.id === id)
  if (item) router.push(item.href)
}
</script>

<template>
  <div class="tabs-shell">
    <button
      v-if="partnerMissing"
      class="invite-banner"
      @click="showInvite = true"
    >
      <span class="invite-banner__text">Warte auf deine Person — Einladungscode zeigen</span>
      <span class="invite-banner__arrow">›</span>
    </button>

    <div class="tabs-content">
      <RouterView />
    </div>

    <BottomSheet :isOpen="showInvite" title="Person einladen" @close="showInvite = false">
      <InviteCodeBox v-if="couple" :code="couple.inviteCode" />
    </BottomSheet>

    <!-- Einmal für die ganze App: jede Composable/View öffnet sie über
         showPaywall(feature), ohne sie durchreichen zu müssen. -->
    <PaywallSheet />

    <nav class="mnav">
      <button
        v-for="item in NAV_ITEMS"
        :key="item.id"
        class="mnav__item"
        :class="{ 'is-active': activeId === item.id }"
        :style="{ '--nav-accent': item.color }"
        @click="selectNav(item.id)"
      >
        <span class="mnav__bubble" />
        <span class="mnav__icon">{{ item.icon }}</span>
        <span class="mnav__label">{{ item.label }}</span>
      </button>
    </nav>

    <Transition name="fab-pop">
      <button
        v-if="fabAction"
        class="fab"
        type="button"
        :aria-label="fabAction.label"
        :style="{ '--accent': activeColor }"
        @click="fabAction.handler()"
      >＋</button>
    </Transition>

    <Toast />
  </div>
</template>

<style scoped>
.tabs-shell {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}

.tabs-content {
  flex: 1;
  padding-bottom: calc(128px + var(--safe-bottom));
  overflow-y: auto;
}

.invite-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: calc(var(--safe-top) + 12px) var(--screen-pad) 12px;
  background: var(--accent-tint);
  border: none;
  border-bottom: 1px solid var(--accent);
  color: var(--accent);
  font-family: var(--font-body);
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  text-align: left;
}

.invite-banner__arrow {
  font-size: 18px;
  line-height: 1;
}

/* ── Bottom-Nav: schwebende Pille mit überstehender Bubble ──────────
   Contract aus reference/design_handoff_modern_ui/navigation.css. Pro Item
   eine eigene Bubble im Bereichston (--nav-accent), die beim Aktivieren
   erscheint; das eigene Icon steigt in sie hinauf. Der frühere Gleit-/
   Droplet-/Collar-Mechanismus ist ersetzt. prefers-reduced-motion greift über
   die globale Base-Regel in app.css (Transition-Dauer → 0.01ms). */
.mnav {
  position: fixed;
  left: 14px;
  right: 14px;
  bottom: calc(20px + var(--safe-bottom));
  height: 66px;
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: 26px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  box-shadow: var(--shadow-float);
  z-index: 100;
}

.mnav__item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 800;
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.2s var(--ease-standard);
}

.mnav__icon {
  font-size: 25px;
  line-height: 1;
  transition: transform 0.35s var(--ease-overshoot);
}

/* Aktiv: Bereichsfarbe; das Icon steigt in die überstehende Bubble. */
.mnav__item.is-active {
  color: var(--nav-accent);
}

/* Aufstieg auf -24px statt der -34px des Contracts: die Bubble steigt -34, das
   Icon startet aber ~10px höher als die Bubblemitte, sodass -34 es zu weit oben
   platziert. -24 zentriert das Icon in der Bubble (gemessen: Icon-Mitte = Bubble-
   Mitte). */
.mnav__item.is-active .mnav__icon {
  transform: translateY(-24px) scale(1.08);
  color: #fff;
}

.mnav__bubble {
  position: absolute;
  top: 8px;
  left: 50%;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: var(--nav-accent);
  opacity: 0;
  transform: translateX(-50%) scale(0.4);
  /* Der surface-farbene Ring ersetzt den früheren Collar-Halo (theme-aware). */
  box-shadow: 0 0 0 6px var(--surface),
              0 10px 18px color-mix(in srgb, var(--nav-accent) 45%, transparent);
  transition: opacity 0.4s var(--ease-overshoot), transform 0.4s var(--ease-overshoot);
  z-index: -1;
}

.mnav__item.is-active .mnav__bubble {
  opacity: 1;
  transform: translateX(-50%) translateY(-34px) scale(1);
}

/* ── Globaler FAB (reference/design_handoff_modern_ui/fab.css) ──────
   Ein Exemplar, kontextabhängig über useFab. Farbe/Schatten aus dem hier
   inline gesetzten --accent (aktiver Bereichston). */
.fab {
  position: fixed;
  right: 20px;
  /* fab.css nennt 102px; höher gelegt, damit der FAB die überstehende Nav-Bubble
     frei räumt — bei aktivem Essen-Tab läge er sonst fast auf ihr. */
  bottom: calc(120px + var(--safe-bottom));
  width: 64px;
  height: 64px;
  border-radius: 22px;
  background: var(--accent);
  color: var(--on-accent);
  border: none;
  cursor: pointer;
  display: grid;
  place-items: center;
  font-size: 32px;
  line-height: 1;
  box-shadow: 0 12px 24px color-mix(in srgb, var(--accent) 45%, transparent);
  z-index: 45;
  transition: transform 0.15s var(--ease-overshoot), background 0.2s var(--ease-standard);
}

.fab:active {
  transform: scale(0.9) rotate(90deg);
}

/* Ein-/Ausblenden beim Wechsel des Kontexts (Add-Aktion an/aus). */
.fab-pop-enter-active {
  transition: transform 0.3s var(--ease-overshoot), opacity 0.2s var(--ease-standard);
}
.fab-pop-leave-active {
  transition: transform 0.2s var(--ease-in), opacity 0.2s var(--ease-in);
}
.fab-pop-enter-from,
.fab-pop-leave-to {
  opacity: 0;
  transform: scale(0.4);
}
</style>
