<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue'
import { useAuth } from '@/composables/useAuth'

const { loading } = useAuth()
</script>

<template>
  <ion-app>
    <!-- Global loading state while auth initializes -->
    <div v-if="loading" class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-r-transparent"></div>
        <p class="mt-2 text-slate-400 text-sm">Laden...</p>
      </div>
    </div>

    <ion-router-outlet v-else />
  </ion-app>
</template>
