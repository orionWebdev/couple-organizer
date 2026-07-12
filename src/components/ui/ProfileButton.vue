<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useCouple } from '@/composables/useCouple'
import InitialChip from './InitialChip.vue'

// Avatare des Paares im Header — der einzige Weg in die App-Einstellungen,
// seit der "Mehr"-Tab dem Belegung-Tab gewichen ist.
const props = defineProps<{ size?: number }>()

const router = useRouter()
const { couple } = useCouple()
</script>

<template>
  <button
    type="button"
    class="profile-btn"
    aria-label="Einstellungen"
    @click="router.push('/settings')"
  >
    <InitialChip
      v-for="uid in couple?.memberIds ?? []"
      :key="uid"
      :uid="uid"
      :couple="couple"
      :size="props.size ?? 34"
    />
  </button>
</template>

<style scoped>
/* Überlappender Avatar-Stapel */
.profile-btn {
  display: flex;
  align-items: center;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.profile-btn > :deep(*:not(:first-child)) {
  margin-left: -10px;
}

.profile-btn:active {
  transform: scale(0.94);
}
</style>
