<script setup lang="ts">
import { computed } from 'vue'
import type { Chore, ChoreHistoryEntry, Couple } from '@/types'
import { recentPoints } from '@/utils/choreBalance'
import { roomDef, roomOf } from '@/utils/rooms'

// „Übernehmen statt zuweisen" — der Gegenentwurf zur Delegation.
//
// Mental Load entsteht auch dadurch, dass eine Person Aufgaben VERTEILEN muss.
// Wer ohnehin alles im Kopf hat, soll nicht zusätzlich Aufseherin sein. Also
// dreht die App die Richtung um: offene Aufgaben liegen in einem Pool, und
// derjenige mit der GERINGEREN Last wird eingeladen, sich etwas zu nehmen.
//
// Nicht die Sichtbarkeit unterscheidet sich zwischen den beiden, sondern die
// ANSPRACHE. Ein erster Entwurf blendete die Karte bei der stärker belasteten
// Person komplett aus — das war zu clever: Die Aufgaben verschwanden aus dem
// Blick, und das Feature war nicht auffindbar. Jetzt sehen es beide:
//   wer weniger trägt → Einladung mit „Ich nehm's"
//   wer mehr trägt    → nur die Info, dass der Pool gefüllt ist, ohne Knöpfe
//                       und mit dem ausdrücklichen Hinweis, dass es nicht an
//                       ihr oder ihm hängt. Das ist die Entlastung.
const props = defineProps<{
  chores: readonly Chore[]
  history: readonly ChoreHistoryEntry[]
  couple: Couple | null
  currentUserId: string
}>()

const emit = defineEmits<{ claim: [chore: Chore] }>()

const MAX_SHOWN = 3

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

// Trage ich gerade weniger? Gleichstand zählt als „ja" — im Zweifel einladen.
// Ohne Partner (Paar noch allein) gibt es niemanden, der mehr trägt: dann ist
// der Pool ganz normal die eigene Liste.
const iAmLighter = computed(() => {
  const ids = props.couple?.memberIds ?? []
  if (!props.currentUserId) return false
  if (ids.length < 2 || !partnerUid.value) return true
  const points = recentPoints(props.history, ids)
  return (points[props.currentUserId] ?? 0) <= (points[partnerUid.value] ?? 0)
})

const visible = computed(() => open.value.length > 0)

const shown = computed(() => open.value.slice(0, MAX_SHOWN))
const rest = computed(() => Math.max(0, open.value.length - MAX_SHOWN))
</script>

<template>
  <div v-if="visible" class="oc">
    <div class="oc-head">
      <span class="oc-lab">{{ iAmLighter ? 'Wartet auf jemanden' : 'Liegt im Pool' }}</span>
      <span v-if="rest" class="oc-rest">+{{ rest }} weitere</span>
    </div>

    <div class="oc-list">
      <div v-for="c in shown" :key="c.id" class="oc-row">
        <span class="oc-emoji">{{ roomDef(roomOf(c)).icon }}</span>
        <span class="oc-name">{{ c.name }}</span>
        <button
          v-if="iAmLighter"
          type="button"
          class="oc-take"
          @click="emit('claim', c)"
        >Ich nehm's</button>
      </div>
    </div>

    <!-- Wer ohnehin mehr trägt, bekommt keine Knöpfe, sondern die Auskunft,
         dass es nicht an ihm oder ihr hängt. Genau das ist die Entlastung. -->
    <p v-if="!iAmLighter && partnerName" class="oc-note">
      Das ist gerade nicht an dir — {{ partnerName }} sieht diese Aufgaben auch.
    </p>
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
  margin-bottom: 11px;
}

.oc-lab {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--text-meta);
}

.oc-rest {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-faint);
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

.oc-note {
  margin: 12px 0 0;
  font-size: 12.5px;
  color: var(--text-meta);
  line-height: 1.5;
}
</style>
