<script setup lang="ts">
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet } from '@ionic/vue'
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

const tabs = [
  { id: 'overview', label: 'Übersicht', icon: homeOutline, href: '/overview' },
  { id: 'plan',     label: 'Planen',    icon: calendarOutline, href: '/plan' },
  { id: 'shopping', label: 'Einkauf',   icon: cartOutline, href: '/shopping' },
  { id: 'finance',  label: 'Finanzen',  icon: walletOutline, href: '/finance' }
]
</script>

<template>
  <ion-tabs>
    <ion-router-outlet />

    <ion-tab-bar slot="bottom">
      <ion-tab-button
        v-for="tab in tabs"
        :key="tab.id"
        :tab="tab.id"
        :href="tab.href"
      >
        <ion-icon :icon="tab.icon" />
        <ion-label>{{ tab.label }}</ion-label>
      </ion-tab-button>
    </ion-tab-bar>
  </ion-tabs>
</template>
