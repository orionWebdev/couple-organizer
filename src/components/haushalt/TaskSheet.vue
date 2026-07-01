<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Chore, ChoreAssignee, ChoreInterval, ChoreRoom, ChoreType, Couple } from '@/types'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { ROOMS, DEFAULT_ROOM, roomOf } from '@/utils/rooms'

const props = defineProps<{
  isOpen: boolean
  couple: Couple | null
  editingChore: Chore | null
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: {
    name: string
    room: ChoreRoom
    type: ChoreType
    interval: ChoreInterval | null
    dueDate: Date | null
    assignee: ChoreAssignee
  }]
}>()

const name = ref('')
const room = ref<ChoreRoom>(DEFAULT_ROOM)
const type = ref<ChoreType>('recurring')
const interval = ref<ChoreInterval>('wöchentlich')
const due = ref<'none' | 'today' | 'soon'>('none')
const assignee = ref<ChoreAssignee>(null)

function resetForm(chore: Chore | null) {
  if (!chore) {
    name.value = ''
    room.value = DEFAULT_ROOM
    type.value = 'recurring'
    interval.value = 'wöchentlich'
    due.value = 'none'
    assignee.value = null
    return
  }
  name.value = chore.name
  room.value = roomOf(chore)
  type.value = chore.type
  interval.value = chore.interval ?? 'wöchentlich'
  due.value = dueFromChore(chore)
  assignee.value = chore.assignee
}

function dueFromChore(chore: Chore): 'none' | 'today' | 'soon' {
  const date = (chore.dueDate as any)?.toDate?.() ?? null
  if (!date) return 'none'
  const now = new Date()
  const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  return isToday ? 'today' : 'soon'
}

watch(() => props.isOpen, (open) => {
  if (open) resetForm(props.editingChore)
})

const personA = computed(() => props.couple?.memberIds[0] ?? null)
const personB = computed(() => props.couple?.memberIds[1] ?? null)
const personAName = computed(() => props.couple?.memberNames[personA.value ?? ''] ?? 'Person A')
const personBName = computed(() => props.couple?.memberNames[personB.value ?? ''] ?? 'Person B')

const title = computed(() => (props.editingChore ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'))
const confirmLabel = computed(() => (props.editingChore ? 'Änderungen speichern' : 'Aufgabe anlegen'))

function dueToDate(): Date | null {
  if (due.value === 'none') return null
  const now = new Date()
  if (due.value === 'today') return now
  const soon = new Date(now)
  soon.setDate(soon.getDate() + 3)
  return soon
}

function handleSubmit() {
  if (!name.value.trim()) return
  emit('submit', {
    name: name.value.trim(),
    room: room.value,
    type: type.value,
    interval: type.value === 'recurring' ? interval.value : null,
    dueDate: dueToDate(),
    assignee: assignee.value
  })
}
</script>

<template>
  <BottomSheet :isOpen="isOpen" :title="title" @close="emit('close')">
    <input
      v-model="name"
      class="app-field"
      type="text"
      placeholder="Name · z. B. Bad putzen"
      style="margin-bottom: 12px"
    />

    <div class="field-block">
      <div class="field-label">Raum</div>
      <div class="room-grid">
        <button
          v-for="r in ROOMS"
          :key="r.id"
          type="button"
          class="room-pill"
          :class="{ 'room-pill--active': room === r.id }"
          @click="room = r.id"
        >
          <span class="room-pill__icon">{{ r.icon }}</span>{{ r.label }}
        </button>
      </div>
    </div>

    <div class="toggle-row">
      <button class="toggle-btn" :class="{ 'toggle-btn--active': type === 'recurring' }" @click="type = 'recurring'">
        Wiederkehrend
      </button>
      <button class="toggle-btn" :class="{ 'toggle-btn--active': type === 'once' }" @click="type = 'once'">
        Einmalig
      </button>
    </div>

    <div v-if="type === 'recurring'" class="field-block">
      <div class="field-label">Intervall</div>
      <div class="pill-row">
        <button class="pill" :class="{ 'pill--active': interval === 'täglich' }" @click="interval = 'täglich'">Täglich</button>
        <button class="pill" :class="{ 'pill--active': interval === 'wöchentlich' }" @click="interval = 'wöchentlich'">Wöchentlich</button>
        <button class="pill" :class="{ 'pill--active': interval === 'monatlich' }" @click="interval = 'monatlich'">Monatlich</button>
      </div>
    </div>

    <div class="field-block">
      <div class="field-label">Termin</div>
      <div class="pill-row">
        <button class="pill" :class="{ 'pill--active': due === 'none' }" @click="due = 'none'">Kein fester Tag</button>
        <button class="pill" :class="{ 'pill--active': due === 'today' }" @click="due = 'today'">Heute</button>
        <button class="pill" :class="{ 'pill--active': due === 'soon' }" @click="due = 'soon'">Bald</button>
      </div>
    </div>

    <div class="field-block field-block--last">
      <div class="field-label">Zuweisen an</div>
      <div class="pill-row">
        <button class="pill" :class="{ 'pill--active': assignee === personA }" @click="assignee = personA">{{ personAName }}</button>
        <button class="pill" :class="{ 'pill--active': assignee === personB }" @click="assignee = personB">{{ personBName }}</button>
        <button class="pill" :class="{ 'pill--active': assignee === 'both' }" @click="assignee = 'both'">Beide</button>
        <button class="pill" :class="{ 'pill--active': assignee === null }" @click="assignee = null">Offen</button>
      </div>
    </div>

    <button class="btn-primary" :disabled="!name.trim()" @click="handleSubmit">
      {{ confirmLabel }}
    </button>
  </BottomSheet>
</template>

<style scoped>
.toggle-row {
  display: flex;
  background: var(--surface-deep);
  border: 1px solid var(--border-softer);
  border-radius: 12px;
  padding: 3px;
  margin-bottom: 12px;
}

.toggle-btn {
  flex: 1;
  border: none;
  font-family: 'Mali', system-ui, sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  padding: 9px 0;
  border-radius: 9px;
  background: transparent;
  color: var(--text-meta);
  cursor: pointer;
}

.toggle-btn--active {
  background: var(--accent);
  color: var(--on-accent);
}

.field-block {
  margin-bottom: 12px;
}

.field-block--last {
  margin-bottom: 18px;
}

.field-label {
  font-size: 11px;
  color: var(--text-faint);
  margin-bottom: 7px;
}

.pill-row {
  display: flex;
  gap: 6px;
}

.pill {
  flex: 1;
  border: none;
  font-family: 'Mali', system-ui, sans-serif;
  font-size: 12px;
  font-weight: 600;
  padding: 8px 0;
  border-radius: 9px;
  background: transparent;
  color: var(--text-meta);
  cursor: pointer;
}

.pill--active {
  background: var(--accent);
  color: var(--on-accent);
}

.room-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.room-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--border-softer);
  font-family: 'Mali', system-ui, sans-serif;
  font-size: 12px;
  font-weight: 600;
  padding: 7px 11px;
  border-radius: 9px;
  background: transparent;
  color: var(--text-meta);
  cursor: pointer;
}

.room-pill__icon {
  font-size: 14px;
  line-height: 1;
}

.room-pill--active {
  border-color: var(--accent);
  background: var(--accent-tint);
  color: var(--text);
}
</style>
