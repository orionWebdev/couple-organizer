<script setup lang="ts">
import { computed } from 'vue'
import { IonTabs, IonRouterOutlet, IonIcon } from '@ionic/vue'
import { useRoute, useRouter } from 'vue-router'
import {
  homeOutline,
  calendarOutline,
  cartOutline,
  walletOutline
} from 'ionicons/icons'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'

const { user } = useAuth()
const { watchCouple } = useCouple()

if (user.value?.coupleId) {
  watchCouple(user.value.coupleId)
}

const route = useRoute()
const router = useRouter()

const tabs = [
  { id: 'overview', label: 'Übersicht', icon: homeOutline,    href: '/overview' },
  { id: 'plan',     label: 'Planen',    icon: calendarOutline, href: '/plan' },
  { id: 'shopping', label: 'Einkauf',   icon: cartOutline,    href: '/shopping' },
  { id: 'finance',  label: 'Finanzen',  icon: walletOutline,  href: '/finance' }
]

const activeIndex = computed(() => {
  const seg = route.path.split('/')[1] || 'overview'
  const idx = tabs.findIndex(t => t.id === seg)
  return idx >= 0 ? idx : 0
})

const indicatorStyle = computed(() => ({
  width: `${100 / tabs.length}%`,
  transform: `translateX(${activeIndex.value * 100}%)`
}))

function navigate(href: string) {
  router.push(href)
}
</script>

<template>
  <ion-tabs>
    <ion-router-outlet />

    <!-- Custom tab bar -->
    <div slot="bottom" class="app-nav">
      <!-- sliding green indicator at the top -->
      <div class="app-nav-indicator" :style="indicatorStyle" />

      <button
        v-for="(tab, i) in tabs"
        :key="tab.id"
        class="app-nav-btn"
        :class="{ 'app-nav-active': activeIndex === i }"
        @click="navigate(tab.href)"
      >
        <ion-icon :icon="tab.icon" class="app-nav-icon" />
        <span class="app-nav-label">{{ tab.label }}</span>
      </button>
    </div>
  </ion-tabs>
</template>

<style scoped>
.app-nav {
  position: relative;
  display: flex;
  background: rgba(15, 23, 42, 0.96);
  border-top: 1px solid rgba(51, 65, 85, 0.7);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  /* iPhone Home Indicator safe area */
  padding-bottom: env(safe-area-inset-bottom, 0px);
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
}

.app-nav-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  /* enough tap area + extra space above safe-area padding */
  padding: 10px 4px 8px;
  min-height: 56px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.22s ease;
}

.app-nav-active {
  color: var(--app-primary-tint);
}

.app-nav-icon {
  font-size: 24px;
  margin-bottom: 3px;
}

.app-nav-label {
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
}

/* ── Sliding indicator (top of nav bar) ─────────────────────────── */
.app-nav-indicator {
  position: absolute;
  top: 0;
  left: 0;
  height: 2.5px;
  background: var(--app-primary);
  border-radius: 0 0 2px 2px;
  box-shadow: 0 0 10px rgba(var(--app-primary-rgb), 0.6);
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}
</style>
