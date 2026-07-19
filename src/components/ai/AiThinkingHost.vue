<script setup lang="ts">
import { useAiThinking } from '@/composables/useAiThinking'
import AiThinkingIndicator from './AiThinkingIndicator.vue'
import AiThinkingModal from './AiThinkingModal.vue'

// Einmal für die ganze App (in TabsView) gemountet — bespielt aus dem
// useAiThinking-Singleton. Während 'thinking' der inline Denk-Zustand
// (Rand-Glow oder Denk-Leiste), zur 'done'-Phase der kurze Vollbild-Bloom.
const { step, mode, status, subtitle, etaSeconds, progress, cancel } = useAiThinking()
</script>

<template>
  <AiThinkingIndicator
    v-if="step === 'thinking'"
    :mode="mode"
    :status="status"
    :subtitle="subtitle"
    :etaSeconds="etaSeconds"
    :progress="progress"
    @cancel="cancel"
  />
  <AiThinkingModal :open="step === 'done'" />
</template>
