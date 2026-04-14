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
import GlobalActionButton from './GlobalActionButton.vue'

const { user } = useAuth()
const { watchCouple } = useCouple()

if (user.value?.coupleId) {
  watchCouple(user.value.coupleId)
}

const route = useRoute()
const router = useRouter()

const tabs = [
  { id: 'overview', label: 'Übersicht', icon: homeOutline,     href: '/overview' },
  { id: 'plan',     label: 'Planen',    icon: calendarOutline, href: '/plan' },
  { id: 'shopping', label: 'Einkauf',   icon: cartOutline,     href: '/shopping' },
  { id: 'finance',  label: 'Finanzen',  icon: walletOutline,   href: '/finance' }
]

const activeId = computed(() => {
  const seg = route.path.split('/')[1] || 'overview'
  return tabs.find(t => t.id === seg)?.id ?? 'overview'
})

function navigate(href: string) {
  router.push(href)
}
</script>

<template>
  <ion-tabs>
    <ion-router-outlet />

    <!-- Custom tab bar with centered hill button -->
    <div slot="bottom" class="app-nav">
      <!-- Left half tabs -->
      <button
        v-for="tab in tabs.slice(0, 2)"
        :key="tab.id"
        class="app-nav-btn"
        :class="{ 'app-nav-active': activeId === tab.id }"
        @click="navigate(tab.href)"
      >
        <ion-icon :icon="tab.icon" class="app-nav-icon" />
        <span class="app-nav-label">{{ tab.label }}</span>
      </button>

      <!-- Center hill slot -->
      <div class="app-nav-center">
        <GlobalActionButton />
      </div>

      <!-- Right half tabs -->
      <button
        v-for="tab in tabs.slice(2)"
        :key="tab.id"
        class="app-nav-btn"
        :class="{ 'app-nav-active': activeId === tab.id }"
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
  align-items: stretch;
  background: rgba(15, 23, 42, 0.96);
  border-top: 1px solid rgba(51, 65, 85, 0.7);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
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
  padding: 10px 4px 8px;
  min-height: 60px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.22s ease, transform 0.18s ease;
}

.app-nav-btn:active {
  transform: scale(0.92);
}

.app-nav-active {
  color: var(--app-primary-tint);
}

.app-nav-icon {
  font-size: 23px;
  margin-bottom: 3px;
}

.app-nav-label {
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
}

/* Center slot reserves space for the hill button */
.app-nav-center {
  position: relative;
  flex: 0 0 86px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  min-height: 60px;
}

/* soft shadow "under" the protruding hill */
.app-nav-center::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 50%;
  width: 96px;
  height: 22px;
  transform: translateX(-50%);
  background: radial-gradient(
    60% 100% at 50% 0%,
    rgba(59, 130, 246, 0.22) 0%,
    rgba(59, 130, 246, 0) 75%
  );
  pointer-events: none;
}
</style>
