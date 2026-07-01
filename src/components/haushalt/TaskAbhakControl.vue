<script setup lang="ts">
import { computed } from 'vue'
import type { Chore, ChoreAssignee, Couple } from '@/types'
import { assigneeChips, isDoneToday } from '@/utils/chores'

const props = defineProps<{
  chore: Chore
  couple: Couple | null
}>()

const emit = defineEmits<{
  pick: [assignee: ChoreAssignee]
  undo: []
}>()

const done = computed(() => isDoneToday(props.chore))
const chips = computed(() => assigneeChips(props.chore.completedBy, props.couple))
</script>

<template>
  <div class="switch">
    <Transition name="task-switch">
      <div v-if="!done" class="cluster actions" key="actions">
        <button class="pick pick--chris" title="Chris" @click="emit('pick', couple?.memberIds[0] ?? null)">C</button>
        <button class="pick pick--sarah" title="Sarah" @click="emit('pick', couple?.memberIds[1] ?? null)">S</button>
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

.pick {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: transparent;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Mali', system-ui, sans-serif;
}

.pick--chris {
  border: 1.5px solid #3a5a78;
  color: var(--chris);
}

.pick--sarah {
  border: 1.5px solid #7a5240;
  color: var(--sarah);
}

.pick--both {
  border: 1.5px solid #4a5a52;
  color: var(--accent);
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
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  color: var(--on-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: -4px;
  border: 1.5px solid var(--surface-deep);
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
