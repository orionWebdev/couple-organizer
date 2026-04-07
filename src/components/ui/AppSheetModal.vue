<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonTitle,
  IonToolbar
} from '@ionic/vue'

withDefaults(defineProps<{
  isOpen: boolean
  title: string
  breakpoints?: number[]
  initialBreakpoint?: number
  closeLabel?: string
  variant?: 'sheet' | 'fullscreen' | 'full-sheet'
}>(), {
  breakpoints: () => [0, 0.55, 0.8],
  initialBreakpoint: 0.55,
  closeLabel: 'Schließen',
  variant: 'sheet'
})

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <ion-modal
    :is-open="isOpen"
    :breakpoints="variant === 'sheet' ? breakpoints : (variant === 'full-sheet' ? [0, 1] : undefined)"
    :initial-breakpoint="variant === 'sheet' ? initialBreakpoint : (variant === 'full-sheet' ? 1 : undefined)"
    :css-class="variant === 'sheet' ? 'app-sheet-modal' : (variant === 'full-sheet' ? 'app-sheet-modal app-sheet-modal-full' : 'app-fullscreen-modal')"
    :expand-to-scroll="variant === 'fullscreen' ? undefined : false"
    :handle="variant === 'fullscreen' ? false : true"
    :keep-contents-mounted="true"
    @didDismiss="emit('close')"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ title }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="emit('close')">{{ closeLabel }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div class="app-sheet-content">
        <slot />
      </div>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
.app-sheet-content {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
</style>
