<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import Toast from '@/components/ui/Toast.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import InviteCodeBox from '@/components/couple/InviteCodeBox.vue'
import NavIcon from '@/components/ui/NavIcon.vue'

const { user } = useAuth()
const { couple, watchCouple } = useCouple()

if (user.value?.coupleId) {
  watchCouple(user.value.coupleId)
}

const route = useRoute()
const router = useRouter()

// Show invite prompt while the partner has not joined yet
const partnerMissing = computed(() =>
  !!couple.value && couple.value.memberIds.length < 2
)
const showInvite = ref(false)

const tabs = [
  { id: 'finanzen',  label: 'Finanzen',  href: '/finanzen' },
  { id: 'haushalt',  label: 'Haushalt',  href: '/haushalt' },
  { id: 'einkaufen', label: 'Einkaufen', href: '/einkaufen' },
] as const

const activeId = computed(() => {
  const seg = route.path.split('/')[1] || 'finanzen'
  return tabs.find(t => t.id === seg)?.id ?? 'finanzen'
})

const activeIndex = computed(() =>
  Math.max(0, tabs.findIndex(t => t.id === activeId.value))
)

// Bereichsfarbe des aktiven Tabs (Nido: jeder Bereich hat eigene Akzentfarbe)
const areaColor: Record<string, string> = {
  finanzen: 'var(--finanzen)',
  haushalt: 'var(--haushalt)',
  einkaufen: 'var(--einkauf)',
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

    <nav class="tab-bar" :style="{ '--tab-count': tabs.length }">
      <span
        class="nav-indicator"
        :style="{ transform: `translateX(${activeIndex * 100}%)`, color: areaColor[activeId] }"
      >
        <span class="nav-dot" />
      </span>
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ 'tab-btn--active': activeId === tab.id }"
        :style="activeId === tab.id ? { color: areaColor[tab.id] } : undefined"
        @click="router.push(tab.href)"
      >
        <NavIcon :name="tab.id" class="tab-icon" />
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </nav>

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
  padding-bottom: calc(60px + var(--safe-bottom));
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

.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: stretch;
  background: rgba(255, 253, 249, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid var(--border-softer);
  padding-bottom: var(--safe-bottom);
  z-index: 100;
}

/* Sliding dot: one tab-slot wide, dot centred; only transform changes */
.nav-indicator {
  position: absolute;
  top: 0;
  left: 0;
  width: calc(100% / var(--tab-count));
  display: flex;
  justify-content: center;
  pointer-events: none;
  transition: transform 380ms var(--ease-overshoot);
}

.nav-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  margin-top: 8px;
}

.tab-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-height: 60px;
  padding: 8px 4px 8px;
  border: none;
  background: transparent;
  color: var(--text-faint);
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: color 0.18s ease;
}

.tab-icon {
  flex-shrink: 0;
  transition: color 0.18s ease;
}

.tab-btn--active {
  color: var(--accent);
  /* Bereichsfarbe kommt per Inline-Style aus areaColor */
}

.tab-label {
  display: flex;
  align-items: center;
  color: var(--text-faint);
  transition: color 220ms var(--ease-standard);
}

.tab-btn--active .tab-label {
  color: var(--text);
}
</style>
