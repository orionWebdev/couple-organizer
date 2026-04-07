<script setup lang="ts">
import { IonPage, IonContent } from '@ionic/vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import AppHeader from '@/components/layout/AppHeader.vue'
import OverviewTab from '@/components/overview/OverviewTab.vue'

const { user } = useAuth()
const { couple } = useCouple()
const router = useRouter()

const tabToRoute: Record<string, string> = {
  todos: '/plan',
  recipes: '/plan',
  mealPlan: '/plan',
  shopping: '/shopping',
  expenses: '/finance'
}

function handleSwitchTab(tab: string) {
  const route = tabToRoute[tab]
  if (route) router.push(route)
}
</script>

<template>
  <ion-page>
    <AppHeader />
    <ion-content>
      <div class="mx-auto max-w-lg px-4 pt-2 pb-24">
        <OverviewTab
          v-if="user?.coupleId"
          :couple-id="user.coupleId"
          :couple="couple"
          @switch-tab="handleSwitchTab"
        />
      </div>
    </ion-content>
  </ion-page>
</template>
