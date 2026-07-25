<script setup lang="ts">
import { computed } from 'vue'
import type { Chore, ChoreHistoryEntry, Couple } from '@/types'
import { recentPoints } from '@/utils/choreBalance'
import { roomDef, roomOf } from '@/utils/rooms'

// „Magst du eine abnehmen?" — die optionale Einladung, wenn die Last schief liegt.
//
// Ursprünglich zeigte diese Karte JEDE unzugewiesene Aufgabe als „wartet auf
// jemanden". Das war falsch gerahmt: Ein offener Pool ist der Normalzustand —
// nicht alles soll zugewiesen werden, und es gibt immer Aufgaben, die einfach
// im Pool liegen. Die Karte las sich dadurch als Dauer-Mahnung.
//
// Jetzt hängt sie nicht mehr an „gibt es offene Aufgaben", sondern an der
// LASTVERTEILUNG: Sie erscheint nur, wenn der Partner gerade spürbar mehr trägt
// und man selbst Luft hat — als freundliche, ausdrücklich freiwillige Einladung,
// etwas abzunehmen. Bei Balance (oder wenn man selbst mehr trägt) rendert sie
// gar nicht; der volle Pool lebt ohnehin im Alltag-Tab.
const props = defineProps<{
  chores: readonly Chore[]
  history: readonly ChoreHistoryEntry[]
  couple: Couple | null
  currentUserId: string
}>()

const emit = defineEmits<{ claim: [chore: Chore] }>()

const MAX_SHOWN = 2
// Spürbare Schieflage: mindestens so viele Punkte hinter dem Partner UND
// höchstens 75 % seiner Last. Beides zusammen filtert Rauschen (0 vs. 1) und
// Fast-Gleichstand weg — die Einladung kommt nur, wenn Abnehmen wirklich hilft.
const MIN_GAP = 3

const open = computed(() =>
  props.chores
    .filter((c) => c.assignee === null && !(c.type === 'once' && c.done))
    .slice()
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, 'de'))
)

const partnerUid = computed(
  () => props.couple?.memberIds.find((id) => id !== props.currentUserId) ?? null
)

const partnerName = computed(() =>
  partnerUid.value ? props.couple?.memberNames[partnerUid.value] ?? 'Dein Partner' : null
)

// Habe ich gerade Luft? Nur bei echter Schieflage zu meinen Gunsten (Partner
// trägt mehr). Ohne Partner oder ohne Historie: nein — dann keine Einladung.
const iHaveRoom = computed(() => {
  const ids = props.couple?.memberIds ?? []
  if (ids.length < 2 || !partnerUid.value || !props.currentUserId) return false
  const points = recentPoints(props.history, ids)
  const mine = points[props.currentUserId] ?? 0
  const theirs = points[partnerUid.value] ?? 0
  return theirs - mine >= MIN_GAP && mine <= theirs * 0.75
})

const visible = computed(() => iHaveRoom.value && open.value.length > 0)
const shown = computed(() => open.value.slice(0, MAX_SHOWN))
</script>

<template>
  <div v-if="visible" class="oc">
    <div class="oc-head">
      <span class="oc-lab">Du hast gerade Luft</span>
    </div>
    <p class="oc-intro">
      {{ partnerName }} trägt gerade etwas mehr. Nichts muss — aber wenn du magst,
      nimm eine ab.
    </p>

    <div class="oc-list">
      <div v-for="c in shown" :key="c.id" class="oc-row">
        <span class="oc-emoji">{{ roomDef(roomOf(c)).icon }}</span>
        <span class="oc-name">{{ c.name }}</span>
        <button type="button" class="oc-take" @click="emit('claim', c)">Ich nehm's</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.oc {
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card-lg);
  box-shadow: var(--shadow-card);
  padding: 15px 16px 16px;
}

.oc-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.oc-lab {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--text-meta);
}

.oc-intro {
  margin: 6px 0 13px;
  font-size: 12.5px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.oc-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.oc-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.oc-emoji {
  flex: none;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: var(--surface-deep);
  font-size: 15px;
}

.oc-name {
  flex: 1;
  min-width: 0;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Einladung, keine Zuweisung — deshalb ein weicher Knopf und die Ich-Form. */
.oc-take {
  flex: none;
  padding: 7px 13px;
  border: none;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  font-family: var(--font-body);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.12s ease;
}

.oc-take:active {
  transform: scale(0.94);
}
</style>
