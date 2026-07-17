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
const iconA = computed(() => props.couple?.memberIcons?.[props.couple?.memberIds[0] ?? ''] ?? null)
const iconB = computed(() => props.couple?.memberIcons?.[props.couple?.memberIds[1] ?? ''] ?? null)
</script>

<template>
  <!-- Recurring: buttons always available + count badge for repeat logging -->
  <div v-if="repeatable" class="switch switch--repeat">
    <div class="cluster actions actions--static">
      <button class="pick pick--chris" :class="{ 'pick--icon': iconA }" :title="nameA" @click="emit('pick', couple?.memberIds[0] ?? null)">{{ iconA ?? nameA.charAt(0).toUpperCase() }}</button>
      <button class="pick pick--sarah" :class="{ 'pick--icon': iconB }" :title="nameB" @click="emit('pick', couple?.memberIds[1] ?? null)">{{ iconB ?? nameB.charAt(0).toUpperCase() }}</button>
      <button class="pick pick--both" title="Beide" @click="emit('pick', 'both')">Beide</button>
    </div>
    <Transition name="count-pop">
      <button
        v-if="todayCount > 0"
        class="count-badge"
        title="Letzte Erledigung zurücknehmen"
        @click="emit('undo')"
      >
        <span v-for="(chip, i) in chips" :key="i" class="chip-ini" :class="{ 'chip-ini--icon': chip.icon }" :style="{ background: chip.bg }">{{ chip.icon ?? chip.ch }}</span>
        <span class="count-num">{{ todayCount }}×</span>
      </button>
    </Transition>
  </div>

  <!-- One-off: simple done / undo toggle -->
  <div v-else class="switch">
    <Transition name="task-switch">
      <div v-if="!done" class="cluster actions" key="actions">
        <button class="pick pick--chris" :title="nameA" @click="emit('pick', couple?.memberIds[0] ?? null)">{{ nameA.charAt(0).toUpperCase() }}</button>
        <button class="pick pick--sarah" :title="nameB" @click="emit('pick', couple?.memberIds[1] ?? null)">{{ nameB.charAt(0).toUpperCase() }}</button>
        <button class="pick pick--both" title="Beide" @click="emit('pick', 'both')">Beide</button>
      </div>
      <button v-else class="chips chip" key="chip" @click="emit('undo')">
        <span v-for="(chip, i) in chips" :key="i" class="chip-ini" :class="{ 'chip-ini--icon': chip.icon }" :style="{ background: chip.bg }">{{ chip.icon ?? chip.ch }}</span>
        <span class="chip-done-label">Erledigt · zurücknehmen</span>
      </button>
    </Transition>
  </div>
</template>

<style scoped>
/* Both states stack in a fixed-size box so enter/leave can overlap.
   Auf eigener Zeile: volle Breite, größere Tap-Ziele. */
.switch {
  position: relative;
  width: 100%;
  height: 44px;
  flex-shrink: 0;
}

.cluster {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 8px;
}

/* Recurring layout: buttons + count badge sit side by side, no overlap */
.switch--repeat {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
}

.actions--static {
  position: static;
  flex: 1;
}

.count-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 44px;
  padding: 0 14px 0 6px;
  border: none;
  border-radius: 14px;
  background: var(--surface-deep);
  box-shadow: inset 0 0 0 1px var(--border-softer);
  cursor: pointer;
  flex-shrink: 0;
}

.count-badge .chip-ini {
  position: static;
  width: 22px;
  height: 22px;
  border-radius: 7px;
  font-size: 11px;
  border: none;
  margin-left: -6px;
}

.count-badge .chip-ini:first-child {
  margin-left: 0;
}

.count-num {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-secondary);
  font-family: var(--font-headline);
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

/* Größere, gut tappbare Erledigt-Buttons (mind. 44px hoch) */
.pick {
  flex: 1;
  height: 44px;
  min-width: 44px;
  border-radius: 13px;
  background: var(--surface);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-body);
  transition: transform 0.12s var(--ease-standard), background 0.15s;
}

.pick:active {
  transform: scale(0.94);
}

.pick--chris {
  border: 2px solid var(--chris);
  color: var(--chris);
}

.pick--chris:active {
  background: var(--chris-tint);
}

.pick--sarah {
  border: 2px solid var(--sarah);
  color: var(--sarah);
}

.pick--sarah:active {
  background: var(--sarah-tint);
}

.pick--both {
  border: 2px solid var(--border);
  background: linear-gradient(90deg, var(--chris-tint) 50%, var(--sarah-tint) 50%);
  color: var(--text);
}

/* Avatar-Emoji statt Initiale: etwas größer, Rand bleibt in Personenfarbe */
.pick--icon {
  font-size: 20px;
}

.chips {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 44px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--accent-tint);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  border-radius: 13px;
  padding: 0 14px;
  cursor: pointer;
}

.chip-done-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--accent);
  font-family: var(--font-body);
}

.chip-ini {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: -8px;
  border: 2px solid var(--surface);
  box-shadow: 0 2px 6px rgba(60, 45, 30, 0.12);
  flex-shrink: 0;
}

.chip-ini:first-child {
  margin-left: 0;
}

.chip-ini--icon {
  font-size: 15px;
}

.count-badge .chip-ini--icon {
  font-size: 12px;
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
