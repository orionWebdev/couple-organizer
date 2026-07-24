<script setup lang="ts">
// Gestapelte Verlaufsseite, geöffnet aus dem Aufgaben-Hub. Umschließt das
// bestehende HaushaltVerlauf (Monatsfilter + Premium-Gate stecken dort schon)
// mit Kopfzeile und Zurück-Pfeil.
//
// Bekommt `history` + `couple` als Props vom Hub (AufgabenPane) — KEINE eigene
// useChores-Instanz: eine frisch gemountete Instanz rendert leer, bis ihr
// Listener async feuert (das war der „lädt erst bei Reload"-Fehler). Der Hub
// hat die Daten längst geladen, hier sind sie damit sofort da.
import type { ChoreAssignee, ChoreHistoryEntry, Couple } from '@/types'
import HaushaltVerlauf from '@/components/haushalt/HaushaltVerlauf.vue'

defineProps<{
  history: readonly ChoreHistoryEntry[]
  couple: Couple | null
}>()

defineEmits<{
  back: []
  assign: [entry: ChoreHistoryEntry, assignee: ChoreAssignee]
  delete: [entry: ChoreHistoryEntry]
}>()
</script>

<template>
  <div class="verlauf-page area-alltag">
    <div class="sub-head">
      <button type="button" class="sub-back" @click="$emit('back')" aria-label="Zurück">‹</button>
      <h1 class="sub-title">Verlauf</h1>
    </div>

    <HaushaltVerlauf
      class="rise-stagger"
      :history="history"
      :couple="couple"
      @assign="(e, a) => $emit('assign', e, a)"
      @delete="(e) => $emit('delete', e)"
    />
  </div>
</template>

<style scoped>
.verlauf-page {
  height: 100%;
  overflow-y: auto;
}

.sub-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px var(--screen-pad) 12px;
}

.sub-back {
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--surface);
  box-shadow: var(--shadow-card);
  border: none;
  display: grid;
  place-items: center;
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
  cursor: pointer;
  margin-right: 4px;
}

.sub-title {
  font-family: var(--font-headline);
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}
</style>
