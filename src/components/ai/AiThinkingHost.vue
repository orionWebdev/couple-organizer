<script setup lang="ts">
import { useAiThinking } from '@/composables/useAiThinking'
import AiThinkingModal from './AiThinkingModal.vue'

// Einmal in TabsView gemountet. Der Denk-Zustand selbst lebt in-context (Sheet-
// Glow / Ziel-Karte); global bleibt nur der kurze Vollbild-Bloom.
const { bloomActive } = useAiThinking()
</script>

<template>
  <AiThinkingModal :open="bloomActive" />
</template>
