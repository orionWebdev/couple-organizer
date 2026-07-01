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
  <div v-if="!done" class="cluster">
    <button class="pick pick--chris" title="Chris" @click="emit('pick', couple?.memberIds[0] ?? null)">C</button>
    <button class="pick pick--sarah" title="Sarah" @click="emit('pick', couple?.memberIds[1] ?? null)">S</button>
    <button class="pick pick--both" title="Beide" @click="emit('pick', 'both')">B</button>
  </div>
  <button v-else class="chips" @click="emit('undo')">
    <span v-for="(chip, i) in chips" :key="i" class="chip" :style="{ background: chip.bg }">{{ chip.ch }}</span>
  </button>
</template>

<style scoped>
.cluster {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
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
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
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
  display: flex;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  flex-shrink: 0;
}

.chip {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  color: #15110d;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: -4px;
  border: 1.5px solid var(--surface-deep);
}

.chip:first-child {
  margin-left: 0;
}
</style>
