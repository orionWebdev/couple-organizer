<script setup lang="ts">
import { computed } from 'vue'
import type { ChoreAssignee, ChoreHistoryEntry, Couple } from '@/types'
import { assigneeChips, personName } from '@/utils/chores'

const props = defineProps<{
  entry: ChoreHistoryEntry
  couple: Couple | null
  menuOpen: boolean
}>()

const emit = defineEmits<{
  toggleMenu: []
  assign: [assignee: ChoreAssignee]
  delete: []
}>()

const chips = computed(() => assigneeChips(props.entry.completedBy, props.couple))
const whoLabel = computed(() => personName(props.entry.completedBy, props.couple))
const timeLabel = computed(() => {
  const date = (props.entry.completedAt as any)?.toDate?.() ?? new Date()
  return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(date)
})

const personA = computed(() => props.couple?.memberIds[0] ?? null)
const personB = computed(() => props.couple?.memberIds[1] ?? null)
</script>

<template>
  <div class="card" :class="{ 'card--expanded': menuOpen }">
    <div class="row">
      <div class="text">
        <div class="name">{{ entry.choreName }}</div>
        <div class="meta">
          <span class="chips">
            <span v-for="(chip, i) in chips" :key="i" class="chip" :class="{ 'chip--icon': chip.icon }" :style="{ background: chip.bg }">{{ chip.icon ?? chip.ch }}</span>
          </span>
          <span class="who">{{ whoLabel }} · {{ timeLabel }}</span>
        </div>
      </div>
      <button class="menu-btn" @click="emit('toggleMenu')">⋯</button>
    </div>

    <div class="expand-track">
      <div class="expand-inner">
        <div class="menu">
          <div class="menu-label">Zuweisen</div>
          <div class="menu-row">
            <button
              class="menu-pill"
              :class="{ 'menu-pill--chris-active': entry.completedBy === personA }"
              @click="emit('assign', personA)"
            >{{ couple?.memberNames[personA ?? ''] ?? 'Person A' }}</button>
            <button
              class="menu-pill"
              :class="{ 'menu-pill--sarah-active': entry.completedBy === personB }"
              @click="emit('assign', personB)"
            >{{ couple?.memberNames[personB ?? ''] ?? 'Person B' }}</button>
            <button
              class="menu-pill"
              :class="{ 'menu-pill--both-active': entry.completedBy === 'both' }"
              @click="emit('assign', 'both')"
            >Beide</button>
          </div>
          <button class="delete-btn" @click="emit('delete')">Eintrag löschen</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  border: 1px solid var(--border-softer);
  background: var(--surface);
  border-radius: var(--radius-card);
  padding: 14px;
  margin-bottom: 8px;
  box-shadow: var(--shadow-card);
  transition: box-shadow 0.2s var(--ease-standard), border-color 0.2s var(--ease-standard);
}

.card--expanded {
  border-color: var(--accent);
  box-shadow: var(--shadow-float);
}

.row {
  display: flex;
  align-items: center;
  gap: 11px;
}

.text {
  flex: 1;
  min-width: 0;
}

.name {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--text);
}

.meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.chips {
  display: flex;
}

.chip {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 9px;
  font-weight: 700;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: -4px;
  border: 1.5px solid var(--surface);
  box-shadow: 0 2px 6px rgba(60, 45, 30, 0.12);
}

.chip:first-child {
  margin-left: 0;
}

.chip--icon {
  font-size: 11px;
}

.who {
  font-size: 11.5px;
  color: var(--text-meta);
}

.menu-btn {
  flex-shrink: 0;
  background: transparent;
  border: none;
  color: var(--text-faint);
  font-size: 20px;
  line-height: 1;
  padding: 4px 6px;
  border-radius: 8px;
  cursor: pointer;
}

/* Höhen-Animation ohne feste Höhe: Grid-Trick statt max-height-Hack. */
.expand-track {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.32s var(--ease-standard);
}

.card--expanded .expand-track {
  grid-template-rows: 1fr;
}

.expand-inner {
  overflow: hidden;
  min-height: 0;
}

.menu {
  margin-top: 11px;
  padding-top: 11px;
  border-top: 1px solid var(--border-softer);
}

.menu-label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--text-meta);
  margin-bottom: 8px;
}

.menu-row {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
}

.menu-pill {
  flex: 1;
  border: 1.5px solid var(--border);
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 700;
  padding: 8px 0;
  border-radius: 10px;
  background: transparent;
  color: var(--text-meta);
  cursor: pointer;
}

.menu-pill--chris-active { background: var(--chris-tint); color: var(--chris); }
.menu-pill--sarah-active { background: var(--sarah-tint); color: var(--sarah); }
.menu-pill--both-active { background: var(--accent-tint); color: var(--accent); }

.delete-btn {
  width: 100%;
  border: 1.5px solid var(--danger-border);
  font-family: var(--font-body);
  font-size: 12.5px;
  font-weight: 700;
  padding: 9px 0;
  border-radius: 10px;
  background: transparent;
  color: var(--danger);
  cursor: pointer;
}
</style>
