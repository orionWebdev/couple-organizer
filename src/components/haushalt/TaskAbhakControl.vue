<script setup lang="ts">
import { computed } from 'vue'
import type { Chore, ChoreAssignee, Couple } from '@/types'
import { assigneeChips, isDoneToday } from '@/utils/chores'

const props = withDefaults(defineProps<{
  chore: Chore
  couple: Couple | null
  todayCount?: number
}>(), { todayCount: 0 })

const emit = defineEmits<{
  pick: [assignee: ChoreAssignee]
  undo: []
}>()

// Recurring chores can be logged several times a day: the pick buttons stay
// available and a tappable count badge tracks today's completions. One-off
// chores keep the simple done/undo toggle.
const repeatable = computed(() => props.chore.type === 'recurring')
const done = computed(() => isDoneToday(props.chore))
const chips = computed(() => assigneeChips(props.chore.completedBy, props.couple))
const nameA = computed(() => props.couple?.memberNames[props.couple?.memberIds[0] ?? ''] ?? 'Person A')
const nameB = computed(() => props.couple?.memberNames[props.couple?.memberIds[1] ?? ''] ?? 'Person B')
</script>

<template>
  <!-- Recurring: buttons always available + count badge for repeat logging -->
  <div v-if="repeatable" class="switch switch--repeat">
    <div class="cluster actions actions--static">
      <button class="pick pick--chris" :title="nameA" @click="emit('pick', couple?.memberIds[0] ?? null)">C</button>
      <button class="pick pick--sarah" :title="nameB" @click="emit('pick', couple?.memberIds[1] ?? null)">S</button>
      <button class="pick pick--both" title="Beide" @click="emit('pick', 'both')">B</button>
    </div>
    <Transition name="count-pop">
      <button
        v-if="todayCount > 0"
        class="count-badge"
        title="Letzte Erledigung zurücknehmen"
        @click="emit('undo')"
      >
        <span v-for="(chip, i) in chips" :key="i" class="chip-ini" :style="{ background: chip.bg }">{{ chip.ch }}</span>
        <span class="count-num">{{ todayCount }}×</span>
      </button>
    </Transition>
  </div>

  <!-- One-off: simple done / undo toggle -->
  <div v-else class="switch">
    <Transition name="task-switch">
      <div v-if="!done" class="cluster actions" key="actions">
        <button class="pick pick--chris" :title="nameA" @click="emit('pick', couple?.memberIds[0] ?? null)">C</button>
        <button class="pick pick--sarah" :title="nameB" @click="emit('pick', couple?.memberIds[1] ?? null)">S</button>
        <button class="pick pick--both" title="Beide" @click="emit('pick', 'both')">B</button>
      </div>
      <button v-else class="chips chip" key="chip" @click="emit('undo')">
        <span v-for="(chip, i) in chips" :key="i" class="chip-ini" :style="{ background: chip.bg }">{{ chip.ch }}</span>
      </button>
    </Transition>
  </div>
</template>

<style scoped>
/* Both states stack in a fixed-size box so enter/leave can overlap */
.switch {
  position: relative;
  width: 86px;
  height: 26px;
  flex-shrink: 0;
}

.cluster {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  gap: 4px;
}

/* Recurring layout: buttons + count badge sit side by side, no overlap */
.switch--repeat {
  width: auto;
  display: flex;
  align-items: center;
  gap: 6px;
}

.actions--static {
  position: static;
}

.count-badge {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 22px;
  padding: 0 7px 0 3px;
  border: none;
  border-radius: 999px;
  background: var(--surface-deep);
  box-shadow: inset 0 0 0 1px var(--border-softer);
  cursor: pointer;
}

.count-badge .chip-ini {
  position: static;
  width: 16px;
  height: 16px;
  border-radius: 5px;
  font-size: 9px;
  border: none;
}

.count-num {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary);
  font-family: var(--font-body);
}

.count-pop-enter-active {
  transition: transform var(--dur-pop) var(--ease-overshoot),
              opacity var(--dur-base) var(--ease-standard);
}

.count-pop-leave-active {
  transition: transform var(--dur-fast) var(--ease-standard),
              opacity var(--dur-fast) var(--ease-standard);
}

.count-pop-enter-from,
.count-pop-leave-to {
  opacity: 0;
  transform: scale(0.4);
}

/* Nido-Checkbox-Optik: 26px, Radius 9px, 2px Rand, weißer Grund */
.pick {
  width: 26px;
  height: 26px;
  border-radius: 9px;
  background: var(--surface);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-body);
  transition: all 0.15s;
}

.pick--chris {
  border: 2px solid var(--chris);
  color: var(--chris);
}

.pick--sarah {
  border: 2px solid var(--sarah);
  color: var(--sarah);
}

.pick--both {
  border: 2px solid var(--border);
  background: linear-gradient(90deg, var(--chris-tint) 50%, var(--sarah-tint) 50%);
  color: var(--text);
}

.chips {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
}

.chip-ini {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: -6px;
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(60, 45, 30, 0.12);
}

.chip-ini:first-child {
  margin-left: 0;
}

/* ── Spring Pop ────────────────────────────────────────────
   Enter + leave run at the same time (no <Transition mode>):
   the result chip pops in with overshoot while the buttons
   shrink+fade out, and vice-versa on undo. */
.task-switch-enter-active.chip,
.task-switch-leave-active.chip {
  transition: transform var(--dur-pop) var(--ease-overshoot),
              opacity var(--dur-base) var(--ease-standard);
}

.task-switch-enter-from.chip,
.task-switch-leave-to.chip {
  opacity: 0;
  transform: scale(0);
}

.task-switch-enter-to.chip,
.task-switch-leave-from.chip {
  opacity: 1;
  transform: scale(1);
}

.task-switch-enter-active.actions,
.task-switch-leave-active.actions {
  transition: transform var(--dur-fast) var(--ease-standard),
              opacity var(--dur-fast) var(--ease-standard);
}

.task-switch-enter-from.actions,
.task-switch-leave-to.actions {
  opacity: 0;
  transform: scale(0.85);
}

.task-switch-enter-to.actions,
.task-switch-leave-from.actions {
  opacity: 1;
  transform: scale(1);
}
</style>
