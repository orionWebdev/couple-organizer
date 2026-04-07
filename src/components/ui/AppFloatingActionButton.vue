<script setup lang="ts">
import { IonFab, IonFabButton, IonIcon } from '@ionic/vue'
import { addOutline } from 'ionicons/icons'

withDefaults(defineProps<{
  icon?: string | object
  ariaLabel?: string
}>(), {
  icon: addOutline,
  ariaLabel: 'Hinzufügen'
})

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <ion-fab vertical="bottom" horizontal="end" class="app-fab-shell">
    <ion-fab-button color="primary" :aria-label="ariaLabel" @click="emit('click')">
      <ion-icon :icon="icon" />
    </ion-fab-button>
  </ion-fab>
</template>

<style scoped>
.app-fab-shell {
  position: fixed;
  right: 1rem;
  bottom: calc(5.25rem + env(safe-area-inset-bottom, 0px));
  z-index: 40;
}
</style>
