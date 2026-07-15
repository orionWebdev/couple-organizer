<script setup lang="ts">
import { computed } from 'vue'
import type { Chore, Couple } from '@/types'
import { useMountFlag } from '@/composables/useMountAnim'

const props = defineProps<{
  couple: Couple | null
  counts: Record<string, number> // erledigte Aufgaben dieser Woche je uid
  nextChore: Chore | null
}>()

const emit = defineEmits<{
  (e: 'open'): void
  (e: 'complete'): void
}>()

const run = useMountFlag(160)

const members = computed(() => props.couple?.memberIds ?? [])
const doneA = computed(() => props.counts[members.value[0]] ?? 0)
const doneB = computed(() => props.counts[members.value[1]] ?? 0)

// Ohne Erledigungen steht die Waage mittig — nicht auf 0 %, sonst sähe es aus,
// als hätte eine Person alles getragen.
const shareA = computed(() => {
  const total = doneA.value + doneB.value
  return total ? doneA.value / total : 0.5
})

function name(uid: string): string {
  return props.couple?.memberNames[uid] ?? '?'
}

const verdict = computed(() => {
  if (doneA.value === doneB.value) return 'genau fair ✨'
  const leader = doneA.value > doneB.value ? members.value[0] : members.value[1]
  return `${name(leader)} trägt gerade mehr`
})
</script>

<template>
  <div class="fair-card" @click="emit('open')">
    <div class="fair-head">
      <span class="fair-emoji">🧽</span>
      <span class="fair-title">Haushalt · diese Woche</span>
    </div>

    <div class="scale">
      <div
        class="scale-side scale-side--a"
        :style="{ width: (run ? shareA * 100 : 50) + '%', background: 'var(--chris)' }"
      >{{ doneA }}</div>
      <div class="scale-side scale-side--b" :style="{ background: 'var(--sarah)' }">{{ doneB }}</div>
    </div>

    <div class="fair-foot">
      <span class="fair-verdict">{{ verdict }}</span>
      <button v-if="nextChore" class="fair-btn" type="button" @click.stop="emit('complete')">
        ✓ {{ nextChore.name }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.fair-card {
  background: var(--haushalt-tint);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card);
  padding: 14px;
  cursor: pointer;
}

.fair-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 11px;
}

.fair-emoji {
  font-size: 15px;
}

.fair-title {
  flex: 1;
  font-family: var(--font-headline);
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}

.scale {
  display: flex;
  height: 30px;
  border-radius: 10px;
  overflow: hidden;
  background: var(--surface);
}

.scale-side {
  display: flex;
  align-items: center;
  color: #fff;
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 800;
}

.scale-side--a {
  padding-left: 9px;
  transition: width 0.9s var(--ease-overshoot);
}

.scale-side--b {
  flex: 1;
  justify-content: flex-end;
  padding-right: 9px;
}

.fair-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 9px;
}

.fair-verdict {
  font-size: 12px;
  font-weight: 800;
  color: var(--text-secondary);
}

.fair-btn {
  flex-shrink: 0;
  max-width: 55%;
  padding: 7px 12px;
  border: none;
  border-radius: 9px;
  background: var(--surface);
  color: var(--haushalt);
  font-family: var(--font-body);
  font-size: 11.5px;
  font-weight: 800;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
