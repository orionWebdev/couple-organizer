<script setup lang="ts">
import { computed } from 'vue'
import type { Todo, Couple } from '@/types'
import InitialChip from '@/components/ui/InitialChip.vue'

const props = defineProps<{
  todos: readonly Todo[]
  couple: Couple | null
  currentUserId: string
}>()

const currentMonth = new Date().getMonth()
const currentYear = new Date().getFullYear()

const thisDone = computed(() =>
  props.todos.filter(t => {
    if (!t.done) return false
    const d = (t.updatedAt as any)?.toDate?.() ?? null
    return d && d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })
)

const partnerUid = computed(() => {
  if (!props.couple) return null
  return props.couple.memberIds.find(id => id !== props.currentUserId) ?? null
})

function countFor(uid: string) {
  return thisDone.value.filter(t => t.assignedTo === uid || t.createdBy === uid).length
}

const myCount = computed(() => countFor(props.currentUserId))
const partnerCount = computed(() => partnerUid.value ? countFor(partnerUid.value) : 0)
const total = computed(() => myCount.value + partnerCount.value)
const myPct = computed(() => total.value === 0 ? 50 : Math.round(myCount.value / total.value * 100))

const categoryStats = computed(() => {
  const map = new Map<string, { my: number; partner: number }>()
  for (const t of thisDone.value) {
    const key = t.category ?? 'Sonstiges'
    if (!map.has(key)) map.set(key, { my: 0, partner: 0 })
    const uid = t.assignedTo ?? t.createdBy
    if (uid === props.currentUserId) map.get(key)!.my++
    else map.get(key)!.partner++
  }
  return [...map.entries()].map(([cat, counts]) => ({
    cat,
    my: counts.my,
    partner: counts.partner,
    total: counts.my + counts.partner,
    pct: total.value === 0 ? 50 : Math.round(counts.my / (counts.my + counts.partner) * 100)
  }))
})

const myName = computed(() => props.couple?.memberNames[props.currentUserId] ?? 'Ich')
const partnerName = computed(() => partnerUid.value ? (props.couple?.memberNames[partnerUid.value] ?? 'Partner') : 'Partner')
</script>

<template>
  <div class="statistik">
    <div class="stat-card">
      <div class="stat-title section-label">DIESEN MONAT</div>
      <div class="big-row">
        <div class="big-count">
          <span class="big-num mono">{{ myCount }}</span>
          <InitialChip :uid="currentUserId" :couple="couple" :size="20" />
        </div>
        <div class="divider-v" />
        <div v-if="partnerUid" class="big-count">
          <span class="big-num mono">{{ partnerCount }}</span>
          <InitialChip :uid="partnerUid" :couple="couple" :size="20" />
        </div>
      </div>

      <!-- Ratio bar -->
      <div class="ratio-bar-wrap">
        <span class="ratio-label">{{ myName }}</span>
        <div class="ratio-bar">
          <div class="ratio-fill" :style="{ width: myPct + '%' }" />
        </div>
        <span class="ratio-label">{{ partnerName }}</span>
      </div>
    </div>

    <!-- Per-category breakdown -->
    <div v-if="categoryStats.length > 0" class="cat-list">
      <div class="section-label cat-header">NACH KATEGORIE</div>
      <div
        v-for="stat in categoryStats"
        :key="stat.cat"
        class="cat-row"
      >
        <span class="cat-name">{{ stat.cat }}</span>
        <div class="cat-bar">
          <div
            class="cat-fill"
            :style="{
              background: `linear-gradient(to right, var(--chris) ${stat.pct}%, var(--sarah) ${stat.pct}%)`
            }"
          />
        </div>
        <span class="cat-count mono">{{ stat.total }}</span>
      </div>
    </div>
    <div v-else class="empty">Noch keine erledigten Aufgaben diesen Monat.</div>
  </div>
</template>

<style scoped>
.statistik {
  padding: 0 var(--screen-pad);
}

.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: 20px;
  margin-bottom: 20px;
}

.stat-title {
  color: var(--text-faint);
  letter-spacing: 0.12em;
  margin-bottom: 16px;
}

.big-row {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.big-count {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.big-num {
  font-size: 36px;
  font-weight: 600;
  color: var(--text);
}

.divider-v {
  width: 1px;
  height: 36px;
  background: var(--border);
}

.ratio-bar-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ratio-label {
  font-size: 12px;
  color: var(--text-meta);
  white-space: nowrap;
  min-width: 32px;
}

.ratio-bar {
  flex: 1;
  height: 8px;
  background: var(--sarah);
  border-radius: 100px;
  overflow: hidden;
}

.ratio-fill {
  height: 100%;
  background: var(--chris);
  border-radius: 100px;
  transition: width 0.4s ease;
}

.cat-header {
  color: var(--text-faint);
  letter-spacing: 0.12em;
  margin-bottom: 12px;
}

.cat-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cat-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cat-name {
  font-size: 13px;
  color: var(--text-secondary);
  min-width: 90px;
}

.cat-bar {
  flex: 1;
  height: 6px;
  border-radius: 100px;
  overflow: hidden;
}

.cat-fill {
  width: 100%;
  height: 100%;
  border-radius: 100px;
}

.cat-count {
  font-size: 13px;
  color: var(--text-meta);
  min-width: 24px;
  text-align: right;
}

.empty {
  font-size: 14px;
  color: var(--text-faint);
  text-align: center;
  padding: 40px 0;
}
</style>
