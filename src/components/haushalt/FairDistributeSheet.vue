<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import type { Chore, ChoreHistoryEntry, Couple } from '@/types'
import { balanceChores } from '@/utils/choreBalance'
import { personName, assigneeAvatarVisual } from '@/utils/chores'

// Faire Aufgabenverteilung (TwoDo Plus): schlägt vor, die wiederkehrenden
// Aufgaben so umzuverteilen, dass die Last ausgeglichen ist. Vorschau mit
// Ein/Aus je Änderung, erst dann wird geschrieben.
const props = defineProps<{
  isOpen: boolean
  chores: readonly Chore[]
  history: readonly ChoreHistoryEntry[]
  couple: Couple | null
  apply: (changes: { choreId: string; to: string }[]) => Promise<number>
}>()

const emit = defineEmits<{ close: []; applied: [count: number] }>()

const memberIds = computed(() => props.couple?.memberIds ?? [])
const canBalance = computed(() => memberIds.value.length >= 2)

const away = ref<string | null>(null)
const excluded = ref<Set<string>>(new Set())
const applying = ref(false)

watch(() => props.isOpen, (open) => {
  if (!open) return
  away.value = null
  excluded.value = new Set()
  applying.value = false
})

const result = computed(() =>
  balanceChores({
    chores: props.chores,
    history: props.history,
    memberIds: memberIds.value,
    awayUid: away.value,
  })
)

const changed = computed(() => result.value.proposals.filter((p) => p.changed))
const unchangedCount = computed(() => result.value.proposals.length - changed.value.length)
const includedChanges = computed(() => changed.value.filter((p) => !excluded.value.has(p.chore.id)))
const canApply = computed(() => canBalance.value && includedChanges.value.length > 0)

// Zwei-Segment-Balken der projizierten Last (bei voller Übernahme).
const afterSplit = computed(() => {
  const [a, b] = memberIds.value
  const va = result.value.after[a] ?? 0
  const vb = result.value.after[b] ?? 0
  const total = va + vb
  return { a: va, b: vb, pctA: total ? Math.round((va / total) * 100) : 50 }
})

const nameFor = (uid: string) => personName(uid, props.couple)

function toggle(choreId: string) {
  const next = new Set(excluded.value)
  if (next.has(choreId)) next.delete(choreId)
  else next.add(choreId)
  excluded.value = next
}

async function applyDistribution() {
  if (!canApply.value || applying.value) return
  applying.value = true
  const changes = includedChanges.value.map((p) => ({ choreId: p.chore.id, to: p.to }))
  const count = await props.apply(changes)
  applying.value = false
  emit('applied', count)
}
</script>

<template>
  <BottomSheet :isOpen="isOpen" title="⚖️ Aufgaben fair verteilen" @close="emit('close')">
    <div class="fd area-haushalt">
      <p v-if="!canBalance" class="fd-empty">
        Faire Verteilung braucht beide Partner — lade zuerst deine:n Partner:in ein.
      </p>

      <template v-else>
        <div class="field-label">Ist diese Woche jemand unterwegs?</div>
        <div class="fd-away">
          <button type="button" class="fd-pill" :class="{ 'fd-pill--active': away === null }" @click="away = null">
            Niemand
          </button>
          <button
            v-for="uid in memberIds"
            :key="uid"
            type="button"
            class="fd-pill"
            :class="{ 'fd-pill--active': away === uid }"
            @click="away = uid"
          >
            {{ nameFor(uid) }}
          </button>
        </div>

        <!-- Projizierte Balance -->
        <div class="field-label fd-mt">Verteilung danach</div>
        <div class="fd-bar">
          <span class="fd-bar-seg fd-bar-a" :style="{ width: afterSplit.pctA + '%' }" />
          <span class="fd-bar-seg fd-bar-b" :style="{ width: 100 - afterSplit.pctA + '%' }" />
        </div>
        <div class="fd-bar-legend">
          <span>{{ nameFor(memberIds[0]) }} · {{ afterSplit.a }} P</span>
          <span>{{ nameFor(memberIds[1]) }} · {{ afterSplit.b }} P</span>
        </div>

        <!-- Änderungen -->
        <div class="field-label fd-mt">Änderungen</div>
        <p v-if="!changed.length" class="fd-empty">Schon fair verteilt 🎉</p>

        <div v-else class="fd-list">
          <label v-for="p in changed" :key="p.chore.id" class="fd-row">
            <input type="checkbox" :checked="!excluded.has(p.chore.id)" @change="toggle(p.chore.id)" />
            <div class="fd-row-main">
              <span class="fd-row-name">{{ p.chore.name }}</span>
              <span class="fd-row-pts">{{ p.chore.points }} P</span>
            </div>
            <div class="fd-move">
              <span
                class="fd-av"
                :style="{ background: assigneeAvatarVisual(p.from, couple).bg, border: assigneeAvatarVisual(p.from, couple).border, color: assigneeAvatarVisual(p.from, couple).color }"
              >{{ assigneeAvatarVisual(p.from, couple).icon || assigneeAvatarVisual(p.from, couple).init }}</span>
              <span class="fd-arrow">→</span>
              <span
                class="fd-av"
                :style="{ background: assigneeAvatarVisual(p.to, couple).bg, border: assigneeAvatarVisual(p.to, couple).border, color: assigneeAvatarVisual(p.to, couple).color }"
              >{{ assigneeAvatarVisual(p.to, couple).icon || assigneeAvatarVisual(p.to, couple).init }}</span>
            </div>
          </label>
        </div>

        <p v-if="unchangedCount > 0" class="fd-note">
          {{ unchangedCount }} Aufgabe{{ unchangedCount === 1 ? '' : 'n' }} bleibt unverändert.
        </p>

        <button class="btn-primary fd-apply" :disabled="!canApply || applying" @click="applyDistribution">
          {{ applying ? 'Wird übertragen …' : `${includedChanges.length} Änderung${includedChanges.length === 1 ? '' : 'en'} übernehmen` }}
        </button>
      </template>
    </div>
  </BottomSheet>
</template>

<style scoped>
.field-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--text-meta);
  margin-bottom: 7px;
}

.fd-mt {
  margin-top: 18px;
}

.fd-empty {
  font-size: 13px;
  color: var(--text-secondary);
  text-align: center;
  padding: 14px 0;
  line-height: 1.5;
}

.fd-away {
  display: flex;
  gap: 6px;
}

.fd-pill {
  flex: 1;
  border: 1.5px solid var(--border-softer);
  background: var(--surface-deep);
  font-family: var(--font-body);
  font-size: 12.5px;
  font-weight: 700;
  padding: 9px 0;
  border-radius: 10px;
  color: var(--text-meta);
  cursor: pointer;
}

.fd-pill--active {
  border-color: var(--accent);
  background: var(--accent-tint);
  color: var(--text);
}

.fd-bar {
  display: flex;
  height: 14px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface-deep);
}

.fd-bar-seg {
  height: 100%;
  transition: width 0.35s var(--ease-standard, ease);
}

.fd-bar-a { background: var(--chris); }
.fd-bar-b { background: var(--sarah); }

.fd-bar-legend {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-meta);
}

.fd-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fd-row {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1.5px solid var(--border-softer);
  background: var(--surface);
  border-radius: 12px;
  padding: 10px 12px;
  cursor: pointer;
}

.fd-row input {
  width: 18px;
  height: 18px;
  accent-color: var(--accent);
  flex-shrink: 0;
}

.fd-row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.fd-row-name {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text);
}

.fd-row-pts {
  font-size: 11px;
  color: var(--text-meta);
}

.fd-move {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}

.fd-av {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}

.fd-arrow {
  color: var(--text-faint);
  font-size: 13px;
}

.fd-note {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--text-meta);
  text-align: center;
}

.fd-apply {
  margin-top: 16px;
}
</style>
