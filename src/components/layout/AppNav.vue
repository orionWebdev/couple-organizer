<script setup lang="ts">
import { IonIcon } from '@ionic/vue'
import {
  homeOutline,
  checkboxOutline,
  bookOutline,
  calendarOutline,
  cartOutline,
  walletOutline
} from 'ionicons/icons'

defineProps<{
  activeTab: string
}>()

const emit = defineEmits<{
  'update:activeTab': [tab: string]
}>()

const tabs = [
  { id: 'overview', label: 'Übersicht', icon: homeOutline },
  { id: 'todos', label: 'Aufgaben', icon: checkboxOutline },
  { id: 'recipes', label: 'Rezepte', icon: bookOutline },
  { id: 'mealPlan', label: 'Wochenplan', icon: calendarOutline },
  { id: 'shopping', label: 'Einkäufe', icon: cartOutline },
  { id: 'expenses', label: 'Finanzen', icon: walletOutline }
]
</script>

<template>
  <div class="app-tab-bar">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="app-tab-button"
      :class="{ 'app-tab-selected': activeTab === tab.id }"
      @click="emit('update:activeTab', tab.id)"
    >
      <ion-icon :icon="tab.icon" />
      <span class="app-tab-label">{{ tab.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.app-tab-bar {
  display: flex;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  background: var(--ion-tab-bar-background, #1e293b);
  border-top: 1px solid var(--ion-border-color, #334155);
  /* Safe Area für iPhone Home Indicator */
  padding-bottom: env(safe-area-inset-bottom, 0px);
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
}

.app-tab-button {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 4px 6px;
  min-height: 50px;
  color: var(--ion-tab-bar-color, #64748b);
  background: transparent;
  border: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.2s;
}

.app-tab-button ion-icon {
  font-size: 24px;
  margin-bottom: 2px;
}

.app-tab-label {
  font-size: 10px;
  font-weight: 500;
  line-height: 1;
}

.app-tab-selected {
  color: var(--ion-tab-bar-color-selected, #22c55e);
}
</style>
