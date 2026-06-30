<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import Toast from '@/components/ui/Toast.vue'

const { user } = useAuth()
const { watchCouple } = useCouple()

if (user.value?.coupleId) {
  watchCouple(user.value.coupleId)
}

const route = useRoute()
const router = useRouter()

const tabs = [
  { id: 'finanzen',  label: 'Finanzen',  href: '/finanzen' },
  { id: 'haushalt',  label: 'Haushalt',  href: '/haushalt' },
  { id: 'einkaufen', label: 'Einkaufen', href: '/einkaufen' },
]

const activeId = computed(() => {
  const seg = route.path.split('/')[1] || 'finanzen'
  return tabs.find(t => t.id === seg)?.id ?? 'finanzen'
})
</script>

<template>
  <div class="tabs-shell">
    <div class="tabs-content">
      <RouterView />
    </div>

    <nav class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ 'tab-btn--active': activeId === tab.id }"
        @click="router.push(tab.href)"
      >
        <span v-if="activeId === tab.id" class="tab-dot" />
        {{ tab.label }}
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

.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: stretch;
  background: rgba(18, 15, 12, 0.88);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid var(--border-softer);
  padding-bottom: var(--safe-bottom);
  z-index: 100;
}

.tab-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 60px;
  padding: 10px 4px 8px;
  border: none;
  background: transparent;
  color: var(--text-faint);
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.18s ease;
}

.tab-btn--active {
  color: var(--text);
}

.tab-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}
</style>
