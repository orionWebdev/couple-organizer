<script setup lang="ts">
import { ref } from 'vue'
import { IonPage, IonContent } from '@ionic/vue'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import AppHeader from '@/components/layout/AppHeader.vue'
import ExpenseList from '@/components/expenses/ExpenseList.vue'

const { user } = useAuth()
const { couple } = useCouple()
const createRequestKey = ref(0)
</script>

<template>
  <ion-page>
    <AppHeader />
    <ion-content>
      <div class="mx-auto max-w-lg px-4 pt-3 pb-24">
        <ExpenseList
          v-if="user?.coupleId"
          :couple-id="user.coupleId"
          :couple="couple"
          :create-request-key="createRequestKey"
        />
      </div>
    </ion-content>
  </ion-page>
</template>
