<script setup lang="ts">
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon } from '@ionic/vue'
import { logOutOutline } from 'ionicons/icons'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'

const { user, logout } = useAuth()
const { couple } = useCouple()
</script>

<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>
        <div>
          <span class="text-green-500 font-bold">Paarplaner</span>
          <p v-if="couple" class="text-xs text-slate-400 font-normal">
            {{ Object.values(couple.memberNames).join(' & ') }}
          </p>
        </div>
      </ion-title>
      <ion-buttons slot="end">
        <span class="text-sm text-slate-400 mr-2">{{ user?.displayName }}</span>
        <ion-button @click="logout" title="Abmelden">
          <ion-icon :icon="logOutOutline" slot="icon-only" />
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
</template>
