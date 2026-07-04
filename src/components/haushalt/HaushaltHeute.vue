<script setup lang="ts">
import { computed } from 'vue'
import type { Chore, ChoreAssignee, Couple } from '@/types'
import TaskRowToday from './TaskRowToday.vue'
import { dueBucket, isDoneToday } from '@/utils/chores'
import { useJustAdded } from '@/composables/useJustAdded'

const props = defineProps<{
  chores: readonly Chore[]
  couple: Couple | null
  currentUserId: string
  todayCounts: ReadonlyMap<string, number>
}>()

const emit = defineEmits<{
  pick: [chore: Chore, assignee: ChoreAssignee]
  undo: [chore: Chore]
}>()

const myChores = computed(() =>
  props.chores.filter((c) => !(c.type === 'once' && c.done) && (c.assignee === props.currentUserId || c.assignee === 'both'))
)

const heuteItems = computed(() => myChores.value.filter((c) => {
  const bucket = dueBucket(c)
  return bucket === 'today' || bucket === 'none'
}))

const demnaechstItems = computed(() =>
  myChores.value
    .map((c) => ({ chore: c, bucket: dueBucket(c) }))
    .filter((entry): entry is { chore: Chore; bucket: { days: number } } => typeof entry.bucket === 'object')
    .sort((a, b) => a.bucket.days - b.bucket.days)
    .map((entry) => entry.chore)
)

const heuteDoneCount = computed(() => heuteItems.value.filter(isDoneToday).length)
const heuteTotalCount = computed(() => heuteItems.value.length)
const heutePct = computed(() => heuteTotalCount.value === 0 ? 0 : Math.round(heuteDoneCount.value / heuteTotalCount.value * 100))

const { justAdded } = useJustAdded(() => myChores.value, c => c.id)
</script>

<template>
  <div class="heute">
    <div class="progress-card">
      <div class="progress-head">
        <span class="progress-title">Heute</span>
        <span class="progress-count mono">{{ heuteDoneCount }} / {{ heuteTotalCount }}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: heutePct + '%' }" />
      </div>
    </div>

    <div v-if="heuteItems.length === 0" class="empty">Nichts für heute geplant. ✓</div>
    <TransitionGroup v-else tag="div" name="list-add" class="list">
      <TaskRowToday
        v-for="c in heuteItems"
        :key="c.id"
        :chore="c"
        :couple="couple"
        :todayCount="todayCounts.get(c.id) ?? 0"
        :class="{ 'just-added': justAdded.has(c.id) }"
        @pick="emit('pick', c, $event)"
        @undo="emit('undo', c)"
      />
    </TransitionGroup>

    <template v-if="demnaechstItems.length > 0">
      <div class="section-label demnaechst-label">Demnächst</div>
      <TransitionGroup tag="div" name="list-add" class="list">
        <TaskRowToday
          v-for="c in demnaechstItems"
          :key="c.id"
          :chore="c"
          :couple="couple"
          :todayCount="todayCounts.get(c.id) ?? 0"
          :class="{ 'just-added': justAdded.has(c.id) }"
          @pick="emit('pick', c, $event)"
          @undo="emit('undo', c)"
        />
      </TransitionGroup>
    </template>
  </div>
</template>

<style scoped>
.heute {
  padding: 0 var(--screen-pad);
}

/* Nido: Fortschritt als getönte Karte mit weißem Balken-Track */
.progress-card {
  background: var(--accent-tint);
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: var(--radius-card-lg);
  padding: 15px 16px;
  margin-bottom: 16px;
}

.progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.progress-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}

.progress-count {
  font-size: 13px;
  color: var(--accent);
}

.progress-bar {
  height: 10px;
  border-radius: 6px;
  background: var(--surface);
  overflow: hidden;
  margin-top: 11px;
}

.progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 6px;
  transition: width 0.3s ease;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.empty {
  text-align: center;
  padding: 30px 20px;
  color: var(--text-faint);
  font-size: 13.5px;
  line-height: 1.5;
}

.demnaechst-label {
  margin: 22px 0 4px;
}
</style>
