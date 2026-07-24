<script setup lang="ts">
// Gestapelte Zuweisungs-Seite, geöffnet aus dem Aufgaben-Hub. „Wie früher":
// oben die Meine/Partner/Alle-Ansicht der zugewiesenen Aufgaben (mit
// „zuletzt erledigt"-Spalte), darunter der Pool der offenen Aufgaben zum
// Zuweisen. Alle Daten kommen als Props vom Hub (eine useChores-Instanz),
// alle Aktionen gehen als Emits zurück — so lädt die Seite sofort und der Hub
// bleibt die einzige Quelle.
import { ref, computed } from 'vue'
import type { Chore, ChoreAssignee, ChoreHistoryEntry, Couple } from '@/types'
import HaushaltZuweisungen from '@/components/haushalt/HaushaltZuweisungen.vue'
import TaskRowAll from '@/components/haushalt/TaskRowAll.vue'

const props = defineProps<{
  chores: readonly Chore[]
  history: readonly ChoreHistoryEntry[]
  couple: Couple | null
  currentUserId: string
  todayCounts: ReadonlyMap<string, number>
  isPremium: boolean
}>()

const emit = defineEmits<{
  back: []
  pick: [chore: Chore, assignee: ChoreAssignee]
  undo: [chore: Chore]
  assign: [chore: Chore, assignee: ChoreAssignee]
  edit: [chore: Chore]
  delete: [chore: Chore]
  seed: []
  openFair: []
}>()

// Offener Pool (ohne Zuweisung), aktive Aufgaben — hier wird zugewiesen.
const poolChores = computed(() =>
  props.chores.filter((c) => c.assignee === null && !(c.type === 'once' && c.done))
)

const menuOpenId = ref<string | null>(null)
function toggleMenu(id: string) { menuOpenId.value = menuOpenId.value === id ? null : id }

const hasAnyChore = computed(() =>
  props.chores.some((c) => !(c.type === 'once' && c.done))
)
</script>

<template>
  <div class="zuweisung-page area-alltag">
    <div class="sub-head">
      <button type="button" class="sub-back" @click="emit('back')" aria-label="Zurück">‹</button>
      <h1 class="sub-title">Zuweisungen</h1>
    </div>

    <!-- Fair verteilen (Plus) -->
    <button class="fair" type="button" @click="emit('openFair')">
      ⚖️ Aufgaben fair verteilen
      <span v-if="!isPremium" class="fair__plus">Plus</span>
    </button>

    <!-- Meine / Partner / Alle — zugewiesene Aufgaben (wie früher) -->
    <HaushaltZuweisungen
      class="rise-stagger"
      :chores="chores"
      :history="history"
      :couple="couple"
      :currentUserId="currentUserId"
      :todayCounts="todayCounts"
      @pick="(c, a) => emit('pick', c, a)"
      @undo="(c) => emit('undo', c)"
    />

    <!-- Offener Pool — hier zuweisen -->
    <div class="sec">
      <span class="section-label">Ohne Zuweisung</span>
      <span class="sec-meta">{{ poolChores.length }} im Pool</span>
    </div>

    <div v-if="!hasAnyChore" class="card empty-seed">
      <p class="empty-text">Noch keine Aufgaben im Pool.</p>
      <button class="seed-btn" @click="emit('seed')">Standardaufgaben laden</button>
    </div>
    <div v-else-if="poolChores.length === 0" class="card"><div class="empty">Alles zugewiesen. ✓</div></div>
    <div v-else class="card list">
      <TaskRowAll
        v-for="c in poolChores"
        :key="c.id"
        :chore="c"
        :couple="couple"
        :menuOpen="menuOpenId === c.id"
        :todayCount="todayCounts.get(c.id) ?? 0"
        @pick="(a) => emit('pick', c, a)"
        @undo="emit('undo', c)"
        @toggleMenu="toggleMenu(c.id)"
        @assign="(a) => emit('assign', c, a)"
        @edit="emit('edit', c)"
        @delete="emit('delete', c)"
      />
    </div>
  </div>
</template>

<style scoped>
.zuweisung-page {
  height: 100%;
  overflow-y: auto;
}

.sub-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px var(--screen-pad) 12px;
}
.sub-back {
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--surface);
  box-shadow: var(--shadow-card);
  border: none;
  display: grid;
  place-items: center;
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
  cursor: pointer;
  margin-right: 4px;
}
.sub-title {
  font-family: var(--font-headline);
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.fair {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: calc(100% - 2 * var(--screen-pad));
  margin: 0 var(--screen-pad) 14px;
  padding: 11px;
  border: none;
  border-radius: 14px;
  background: var(--accent-tint);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 800;
  color: var(--accent);
  cursor: pointer;
}
.fair__plus {
  font-size: 10px;
  font-weight: 800;
  background: var(--accent);
  color: #fff;
  padding: 2px 6px;
  border-radius: 999px;
}

.sec {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 4px 8px;
  margin: 16px var(--screen-pad) 0;
}
.sec-meta {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-meta);
}

.card {
  background: var(--surface);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  padding: 12px 14px;
  margin: 0 var(--screen-pad) 12px;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.empty {
  text-align: center;
  padding: 24px 20px;
  color: var(--text-faint);
  font-size: 13.5px;
}
.empty-seed {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 28px 20px;
}
.empty-text { margin: 0; color: var(--text-faint); }
.seed-btn {
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 700;
  padding: 11px 20px;
  border-radius: 100px;
  border: none;
  background: var(--accent);
  color: var(--on-accent);
  cursor: pointer;
  box-shadow: var(--shadow-accent);
}
</style>
