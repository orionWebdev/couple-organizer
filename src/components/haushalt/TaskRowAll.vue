<script setup lang="ts">
import { computed } from 'vue'
import type { Chore, ChoreAssignee, Couple } from '@/types'
import TaskAbhakControl from './TaskAbhakControl.vue'
import { assigneeAvatarVisual, metaLine, recurLabel } from '@/utils/chores'
import { pointsForChore } from '@/utils/points'

const props = withDefaults(defineProps<{
  chore: Chore
  couple: Couple | null
  menuOpen: boolean
  todayCount?: number
}>(), { todayCount: 0 })

const emit = defineEmits<{
  pick: [assignee: ChoreAssignee]
  undo: []
  toggleMenu: []
  assign: [assignee: ChoreAssignee]
  edit: []
  delete: []
}>()

const points = computed(() => pointsForChore(props.chore))
const avatar = computed(() => assigneeAvatarVisual(props.chore.assignee, props.couple))
const personA = computed(() => props.couple?.memberIds[0] ?? null)
const personB = computed(() => props.couple?.memberIds[1] ?? null)
</script>

<template>
  <div class="list-row">
    <div class="row" :class="{ 'row--expanded': menuOpen }">
      <div class="row-main">
        <div class="row-top">
          <div class="row-text">
            <div class="row-title-line">
              <span class="row-name">{{ chore.name }}</span>
              <span class="points-badge">{{ points }} P</span>
              <span class="recur-badge">{{ recurLabel(chore) }}</span>
            </div>
            <span class="row-meta">{{ metaLine(chore, couple, todayCount) }}</span>
          </div>
          <span
            class="assignee-avatar"
            :class="{ 'assignee-avatar--icon': avatar.icon }"
            :style="{ background: avatar.bg, border: avatar.border, color: avatar.color }"
          >{{ avatar.icon ?? avatar.init }}</span>
          <button class="menu-btn" @click="emit('toggleMenu')">⋯</button>
        </div>
        <div class="row-actions">
          <TaskAbhakControl :chore="chore" :couple="couple" :todayCount="todayCount" @pick="emit('pick', $event)" @undo="emit('undo')" />
        </div>
      </div>

      <div class="expand-track">
        <div class="expand-inner">
          <div class="menu">
            <div class="menu-label">Zuweisen an</div>
            <div class="menu-row">
              <button class="menu-pill menu-pill--chris" @click="emit('assign', personA)">
                {{ couple?.memberNames[personA ?? ''] ?? 'Person A' }}
              </button>
              <button class="menu-pill menu-pill--sarah" @click="emit('assign', personB)">
                {{ couple?.memberNames[personB ?? ''] ?? 'Person B' }}
              </button>
              <button class="menu-pill menu-pill--both" @click="emit('assign', 'both')">Beide</button>
              <button class="menu-pill menu-pill--open" @click="emit('assign', null)">Offen</button>
            </div>
            <div class="menu-row">
              <button class="menu-action" @click="emit('edit')">Bearbeiten</button>
              <button class="menu-action menu-action--danger" @click="emit('delete')">Aus Pool löschen</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Nido: weiße Karte — Text/Zuweisung oben, Erledigt-Buttons als zweite Zeile */
.row {
  padding: 12px 13px;
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  transition: box-shadow 0.2s var(--ease-standard), border-color 0.2s var(--ease-standard);
}

.row--expanded {
  border-color: var(--accent);
  box-shadow: var(--shadow-float);
}

.row-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.row-top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.row-actions {
  display: flex;
}

.row-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.row-title-line {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}

.points-badge {
  font-family: var(--font-headline);
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  color: var(--accent);
  flex-shrink: 0;
}

.row-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  transition: color var(--dur-base) var(--ease-standard);
}

.recur-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 7px;
  background: var(--accent-tint);
  color: var(--accent);
}

.row-meta {
  font-size: 11.5px;
  color: var(--text-meta);
}

.assignee-avatar {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(60, 45, 30, 0.12);
}

.assignee-avatar--icon {
  font-size: 16px;
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

.row--expanded .expand-track {
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

.menu-row:last-child {
  margin-bottom: 0;
}

.menu-pill {
  flex: 1;
  border: 1.5px solid var(--border);
  background: transparent;
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 700;
  padding: 8px 0;
  border-radius: 10px;
  cursor: pointer;
}

.menu-pill--chris { color: var(--chris); }
.menu-pill--sarah { color: var(--sarah); }
.menu-pill--both { color: var(--accent); }
.menu-pill--open { color: var(--text-meta); }

.menu-action {
  flex: 1;
  border: 1.5px solid var(--border);
  background: transparent;
  font-family: var(--font-body);
  font-size: 12.5px;
  font-weight: 700;
  padding: 9px 0;
  border-radius: 10px;
  color: var(--text-secondary);
  cursor: pointer;
}

.menu-action--danger {
  border-color: var(--danger-border);
  color: var(--danger);
}
</style>
