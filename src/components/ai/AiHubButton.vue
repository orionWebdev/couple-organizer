<script setup lang="ts">
// Der dauerhaft sichtbare KI-Einstieg — global im App-Shell (TabsView), rechts
// neben der schmalen 3er-Nav auf gleicher Fußzeilenhöhe. Bereichs-neutral
// (Gradient), damit die KI überall gleich aussieht. Ein Tap öffnet den KI-Hub.
//
// Bewusst eine BREITE, waagerechte Pille mit Wort („✨ Helfer") statt eines
// kleinen Quadrats: so hebt sie sich klar vom kontextbezogenen ＋-FAB darüber
// ab (der bleibt ein Icon-Quadrat) und liest sich als eigenständige Funktion.
// Die feste Breite (140) ist Teil des Fußzeilen-Layouts — die Nav-Breite in
// TabsView reserviert genau diesen Platz; beim Ändern beide anpassen.
import { openAiHub } from '@/composables/useAiHub'
</script>

<template>
  <button class="ki-fab" type="button" aria-label="Helfer öffnen" @click="openAiHub">
    <span class="spark" aria-hidden="true">✨</span>
    <span class="lab">Helfer</span>
  </button>
</template>

<style scoped>
.ki-fab {
  position: fixed;
  right: 16px;
  bottom: calc(20px + var(--safe-bottom));
  width: 140px;
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
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8px;
  animation: aiShift 6s ease-in-out infinite;
  transition: transform 0.15s var(--ease-overshoot);
}

.ki-fab:active {
  transform: scale(0.96);
}

.ki-fab .spark {
  font-size: 22px;
  line-height: 1;
  filter: drop-shadow(0 1px 2px rgba(35, 20, 60, 0.45));
}

.ki-fab .lab {
  font-family: var(--font-headline);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.2px;
  text-shadow: var(--ai-textshadow);
}
</style>
