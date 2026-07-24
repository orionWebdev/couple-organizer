<script setup lang="ts">
// Der dauerhaft sichtbare KI-Button — global im App-Shell (TabsView), rechts
// neben der schmalen 3er-Nav auf gleicher Fußzeilenhöhe. Bereichs-neutral
// (Gradient), damit KI überall gleich aussieht. Ein Tap öffnet den KI-Hub.
import { openAiHub } from '@/composables/useAiHub'
</script>

<template>
  <button class="ki-fab" type="button" aria-label="KI öffnen" @click="openAiHub">
    <span class="spark" aria-hidden="true">✨</span>
    <span class="lab">KI</span>
  </button>
</template>

<style scoped>
.ki-fab {
  position: fixed;
  right: 16px;
  bottom: calc(20px + var(--safe-bottom));
  width: 66px;
  height: 66px;
  border-radius: 24px;
  z-index: 100;
  /* Theme-unabhängiger KI-Gradient (Light == Dark) mit Scrim für lesbaren
     weißen Text in der hellen Amber-Phase. */
  background: var(--ai-scrim), var(--ai-gradient);
  background-size: 100% 100%, var(--ai-gradient-size);
  box-shadow: var(--ai-glow);
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  animation: aiShift 6s ease-in-out infinite;
  transition: transform 0.15s var(--ease-overshoot);
}

.ki-fab:active {
  transform: scale(0.95);
}

.ki-fab .spark {
  font-size: 22px;
  line-height: 1;
  filter: drop-shadow(0 1px 2px rgba(35, 20, 60, 0.45));
}

.ki-fab .lab {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.3px;
  text-shadow: var(--ai-textshadow);
}
</style>
