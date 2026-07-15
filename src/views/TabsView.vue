<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useCouple } from '@/composables/useCouple'
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

// Routen ohne eigenen Nav-Slot leihen sich den Slot ihres Bereichs: der
// Belegungs-Kalender gehört zur Planung. Die Einstellungen (Profil-Avatare im
// Header) haben keinen Bereich — dort bleibt die Bubble auf "Start".
const SLOT_ALIASES: Record<string, string> = { belegung: 'planung' }

const activeId = computed(() => {
  const seg = route.path.split('/')[1] || 'dashboard'
  const id = SLOT_ALIASES[seg] ?? seg
  return NAV_ITEMS.find(i => i.id === id)?.id ?? 'dashboard'
})

const activeIndex = computed(() =>
  Math.max(0, NAV_ITEMS.findIndex(i => i.id === activeId.value))
)

const activeItem = computed(() => NAV_ITEMS[activeIndex.value])

function slotCenterPercent(index: number): number {
  return ((index + 0.5) / NAV_ITEMS.length) * 100
}

const bubbleLeftPercent = computed(() => slotCenterPercent(activeIndex.value))

// ── Bounce beim Ankommen + Farbtropfen entlang der Strecke ────
// Zwei inhaltsgleiche Keyframe-Namen im Wechsel, weil ein erneutes Zuweisen
// desselben Animationsnamens die Animation sonst nicht neu startet.
const bounceParity = ref(false)

interface Droplet { id: number; leftPercent: number; top: number; color: string; delay: number }
const droplets = ref<Droplet[]>([])
let dropletSeq = 0

function selectNav(id: string) {
  const item = NAV_ITEMS.find(i => i.id === id)
  if (!item) return

  if (id !== activeId.value) {
    const oldIndex = activeIndex.value
    const oldColor = activeItem.value.color
    const newIndex = NAV_ITEMS.findIndex(i => i.id === id)
    const x0 = slotCenterPercent(oldIndex)
    const x1 = slotCenterPercent(newIndex)
    const dropCount = 5
    const newDroplets: Droplet[] = []
    for (let i = 1; i <= dropCount; i++) {
      const t = i / (dropCount + 1)
      dropletSeq++
      newDroplets.push({
        id: dropletSeq,
        leftPercent: x0 + (x1 - x0) * t + (Math.random() * 2 - 1),
        top: 2 + Math.sin(t * Math.PI) * -10 + Math.random() * 6,
        color: oldColor,
        delay: t * 90,
      })
    }
    bounceParity.value = !bounceParity.value
    droplets.value = [...droplets.value, ...newDroplets]
    newDroplets.forEach((d) => {
      setTimeout(() => {
        droplets.value = droplets.value.filter((x) => x.id !== d.id)
      }, 800 + d.delay)
    })
  }

  router.push(item.href)
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

    <div class="nav-wrap">
      <div class="nav-bar">
        <button
          v-for="item in NAV_ITEMS"
          :key="item.id"
          class="nav-slot"
          @click="selectNav(item.id)"
        >
          <span class="nav-icon" :class="{ 'nav-icon--hidden': activeId === item.id }">{{ item.icon }}</span>
          <span class="nav-label" :style="{ color: activeId === item.id ? item.color : undefined }">{{ item.label }}</span>
        </button>

        <span
          v-for="d in droplets"
          :key="d.id"
          class="nav-droplet"
          :style="{ left: d.leftPercent + '%', top: d.top + 'px', background: d.color, animationDelay: d.delay + 'ms' }"
        />

        <span class="nav-collar" :style="{ left: bubbleLeftPercent + '%' }" />
        <button
          class="nav-bubble"
          :class="bounceParity ? 'nav-bubble--jump1' : 'nav-bubble--jump2'"
          :style="{ left: bubbleLeftPercent + '%', background: activeItem.color }"
          @click="selectNav(activeId)"
        >{{ activeItem.icon }}</button>
      </div>
    </div>

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
  padding-bottom: calc(120px + var(--safe-bottom));
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

.nav-wrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: calc(92px + var(--safe-bottom));
  z-index: 100;
  pointer-events: none;
}

.nav-bar {
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: calc(14px + var(--safe-bottom));
  height: 58px;
  background: var(--surface);
  border-radius: 24px;
  box-shadow: var(--shadow-float);
  display: flex;
  align-items: stretch;
  pointer-events: auto;
}

.nav-slot {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border: none;
  background: transparent;
  cursor: pointer;
}

.nav-icon {
  font-size: 17px;
  line-height: 1;
}

.nav-icon--hidden {
  visibility: hidden;
}

.nav-label {
  font-family: var(--font-body);
  font-size: 9px;
  font-weight: 700;
  color: var(--text-faint);
}

/* Weißer Halo hinter der Bubble, damit sie organisch aus der Leiste
   herauszuwachsen scheint statt hart überzulappen. */
.nav-collar {
  position: absolute;
  left: 0;
  top: 9px;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: var(--surface);
  transform: translate(-50%, -50%);
  transition: left 0.55s var(--ease-overshoot);
  z-index: 2;
  pointer-events: none;
}

.nav-bubble {
  position: absolute;
  left: 0;
  top: 9px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 21px;
  line-height: 1;
  box-shadow: 0 8px 16px rgba(30, 20, 10, 0.24);
  transform: translate(-50%, -50%);
  transition: left 0.55s var(--ease-overshoot), background 0.3s;
  z-index: 3;
  cursor: pointer;
}

.nav-bubble--jump1 {
  animation: bubbleJump1 0.5s var(--ease-overshoot);
}

.nav-bubble--jump2 {
  animation: bubbleJump2 0.5s var(--ease-overshoot);
}

@keyframes bubbleJump1 {
  0%   { transform: translate(-50%, -50%) translateY(0); }
  28%  { transform: translate(-50%, -50%) translateY(-12px); }
  52%  { transform: translate(-50%, -50%) translateY(2px); }
  74%  { transform: translate(-50%, -50%) translateY(-4px); }
  100% { transform: translate(-50%, -50%) translateY(0); }
}

@keyframes bubbleJump2 {
  0%   { transform: translate(-50%, -50%) translateY(0); }
  28%  { transform: translate(-50%, -50%) translateY(-12px); }
  52%  { transform: translate(-50%, -50%) translateY(2px); }
  74%  { transform: translate(-50%, -50%) translateY(-4px); }
  100% { transform: translate(-50%, -50%) translateY(0); }
}

.nav-droplet {
  position: absolute;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: dropletFall 0.7s ease forwards;
  z-index: 1;
  pointer-events: none;
}

@keyframes dropletFall {
  0%   { opacity: 0.9; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, calc(-50% + 20px)) scale(0.25); }
}

@media (prefers-reduced-motion: reduce) {
  .nav-bubble--jump1,
  .nav-bubble--jump2,
  .nav-droplet {
    animation: none;
  }
}
</style>
