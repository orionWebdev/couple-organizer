<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import type { Couple, ShoppingList, ShoppingItem } from '@/types'
import ShoppingItemRow from './ShoppingItem.vue'
import { useJustAdded } from '@/composables/useJustAdded'
import { usePersistedRef, DRAFT_TTL_MS } from '@/composables/usePersistedRef'
import { sectionDef, sectionOfItem, sectionOrder } from '@/utils/shoppingSections'

const props = defineProps<{
  list: ShoppingList
  items: ShoppingItem[]
  couple: Couple | null
}>()

const emit = defineEmits<{
  toggle: [id: string, checked: boolean]
  delete: [id: string]
  add: [name: string]
  startShopping: []
  clearChecked: []
  back: []
  renameList: [title: string]
  deleteList: []
}>()

// Tippt man einen Artikel und minimiert die App, geht der Text sonst verloren.
const newName = usePersistedRef('shopping.newItem', '', { ttlMs: DRAFT_TTL_MS })
const inputRef = ref<HTMLInputElement | null>(null)

function handleAdd() {
  if (!newName.value.trim()) return
  emit('add', newName.value.trim())
  newName.value = ''
  nextTick(() => inputRef.value?.focus())
}

function quickAdd(name: string) {
  emit('add', name)
}

const menuOpen = ref(false)
const renameValue = ref(props.list.title)

watch(() => props.list.title, (title) => {
  if (!menuOpen.value) renameValue.value = title
})

function toggleMenu() {
  menuOpen.value = !menuOpen.value
  if (menuOpen.value) renameValue.value = props.list.title
}

function commitRename() {
  const clean = renameValue.value.trim()
  if (!clean || clean === props.list.title) return
  emit('renameList', clean)
  menuOpen.value = false
}

function handleDeleteList() {
  emit('deleteList')
  menuOpen.value = false
}

// ── Fortschritt ────────────────────────────────────────────────
const total = computed(() => props.items.length)
const doneCount = computed(() => props.items.filter((i) => i.checked).length)
const uncheckedCount = computed(() => total.value - doneCount.value)
const progressPct = computed(() => (total.value ? Math.round((doneCount.value / total.value) * 100) : 0))

// ── Gruppierung nach Laden-Bereich ─────────────────────────────
interface SectionGroup {
  id: string
  emoji: string
  label: string
  openCount: number
  items: ShoppingItem[]
}

const grouped = computed<SectionGroup[]>(() => {
  const map = new Map<string, ShoppingItem[]>()
  for (const item of props.items) {
    const sec = sectionOfItem(item)
    if (!map.has(sec)) map.set(sec, [])
    map.get(sec)!.push(item)
  }
  return [...map.entries()]
    .sort(([a], [b]) => sectionOrder(a) - sectionOrder(b))
    .map(([id, items]) => {
      const def = sectionDef(id)
      return {
        id,
        emoji: def.emoji,
        label: def.label,
        openCount: items.filter((i) => !i.checked).length,
        // Offene zuerst, Erledigtes ans Ende des Bereichs.
        items: [...items].sort((a, b) => (a.checked === b.checked ? 0 : a.checked ? 1 : -1)),
      }
    })
})

// ── „Oft gekauft“ (kuratierte Staples, bereits vorhandene ausgeblendet) ──
const STAPLES = ['Milch', 'Eier', 'Brot', 'Butter', 'Kaffee', 'Bananen', 'Käse', 'Klopapier'] as const
const presentNames = computed(() => new Set(props.items.filter((i) => !i.checked).map((i) => i.name.toLowerCase())))
const suggestions = computed(() => STAPLES.filter((s) => !presentNames.value.has(s.toLowerCase())))

const { justAdded } = useJustAdded(() => props.items, (i) => i.id)
</script>

<template>
  <div class="detail">
    <!-- Nav -->
    <div class="detail-nav">
      <button class="back-caret" type="button" @click="emit('back')" aria-label="Zurück">‹</button>
      <h2 class="detail-title">{{ list.title }}</h2>
      <button class="menu-btn" @click="toggleMenu">⋯</button>
    </div>

    <div v-if="menuOpen" class="manage-menu">
      <input
        v-model="renameValue"
        class="rename-input"
        type="text"
        placeholder="Listenname"
        @keyup.enter="commitRename"
      />
      <div class="menu-row">
        <button class="menu-action" @click="commitRename">Speichern</button>
        <button class="menu-action menu-action--danger" @click="handleDeleteList">Liste löschen</button>
      </div>
    </div>

    <div class="scroll">
      <!-- Fortschritt -->
      <div v-if="total > 0" class="progress-wrap">
        <div class="progress-top">
          <span class="progress-label">{{ doneCount }} von {{ total }} erledigt</span>
          <button v-if="doneCount > 0" type="button" class="clear-btn" @click="emit('clearChecked')">
            🧹 Erledigte entfernen
          </button>
        </div>
        <div class="prog"><i :style="{ width: progressPct + '%' }" /></div>
      </div>

      <div v-if="grouped.length === 0" class="empty">
        Keine Artikel. Füge unten welche hinzu.
      </div>

      <div v-else class="sections">
        <div v-for="group in grouped" :key="group.id" class="section">
          <div class="grouphd">
            <span class="grouphd-emoji">{{ group.emoji }}</span>
            <span class="grouphd-label">{{ group.label }}</span>
            <span class="grouphd-count">{{ group.openCount }}</span>
          </div>
          <div class="section-card">
            <TransitionGroup tag="div" name="list-add">
              <ShoppingItemRow
                v-for="item in group.items"
                :key="item.id"
                :item="item"
                :couple="couple"
                :class="{ 'just-added': justAdded.has(item.id) }"
                @toggle="emit('toggle', item.id, !item.checked)"
                @delete="emit('delete', item.id)"
              />
            </TransitionGroup>
          </div>
        </div>
      </div>

      <!-- Oft gekauft -->
      <template v-if="suggestions.length">
        <div class="grouphd grouphd--plain">
          <span class="grouphd-emoji">💡</span>
          <span class="grouphd-label">Oft gekauft</span>
        </div>
        <div class="staples">
          <button v-for="name in suggestions" :key="name" type="button" class="staple-chip" @click="quickAdd(name)">
            ＋ {{ name }}
          </button>
        </div>
      </template>
    </div>

    <!-- Schnell-Add-Leiste -->
    <div class="addbar">
      <span class="addbar-icon">🛒</span>
      <input
        ref="inputRef"
        v-model="newName"
        class="addbar-field"
        type="text"
        placeholder="Artikel hinzufügen …"
        @keyup.enter="handleAdd"
      />
      <button class="addbar-go" :disabled="!newName.trim()" aria-label="Hinzufügen" @click="handleAdd">＋</button>
    </div>

    <!-- Einkaufsmodus -->
    <div class="start-wrap">
      <button class="btn-primary" :disabled="uncheckedCount === 0" @click="emit('startShopping')">
        Einkaufsmodus starten
      </button>
    </div>
  </div>
</template>

<style scoped>
.detail {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.detail-nav {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: calc(var(--safe-top) + 16px) var(--screen-pad) 12px;
}

.back-caret {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: transparent;
  border: none;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-faint);
  cursor: pointer;
}

.back-caret:active {
  color: var(--text);
}

.detail-title {
  flex: 1;
  font-family: var(--font-headline);
  font-size: 19px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu-btn {
  flex-shrink: 0;
  background: var(--surface);
  border: none;
  color: var(--text-faint);
  font-size: 18px;
  line-height: 1;
  padding: 8px 12px;
  border-radius: 12px;
  box-shadow: var(--shadow-float);
  cursor: pointer;
}

.manage-menu {
  margin: 0 var(--screen-pad) 12px;
  padding: 12px 13px;
  border: 1px solid var(--border-softer);
  background: var(--surface);
  border-radius: 14px;
  box-shadow: var(--shadow-card);
}

.rename-input {
  width: 100%;
  padding: 10px 12px;
  margin-bottom: 8px;
  background: var(--surface-deep);
  border: 1px solid var(--border-softer);
  border-radius: 10px;
  color: var(--text);
  font-family: var(--font-body);
  font-size: 13.5px;
  font-weight: 600;
  outline: none;
}

.menu-row {
  display: flex;
  gap: 6px;
}

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

.scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0 var(--screen-pad) 12px;
}

.progress-wrap {
  margin-bottom: 14px;
}

.progress-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.progress-label {
  font-size: 13px;
  font-weight: 800;
  color: var(--text-secondary);
}

.clear-btn {
  flex-shrink: 0;
  border: none;
  background: none;
  padding: 2px 4px;
  font-family: var(--font-body);
  font-size: 12.5px;
  font-weight: 800;
  color: var(--accent);
  cursor: pointer;
}

.clear-btn:active {
  opacity: 0.6;
}

.prog {
  height: 10px;
  border-radius: 6px;
  background: var(--surface-deep);
  overflow: hidden;
}

.prog i {
  display: block;
  height: 100%;
  border-radius: 6px;
  background: var(--accent);
  transition: width 0.6s var(--ease-standard);
}

.empty {
  padding: 40px 20px;
  font-size: 14px;
  color: var(--text-faint);
  text-align: center;
}

.section {
  margin-bottom: 6px;
}

.grouphd {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 6px;
  font-size: 13px;
  font-weight: 800;
  color: var(--text-secondary);
}

.grouphd--plain {
  padding-top: 14px;
}

.grouphd-emoji {
  font-size: 15px;
}

.grouphd-count {
  margin-left: auto;
  font-size: 12px;
  font-weight: 800;
  color: var(--text-meta);
}

.section-card {
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  padding: 4px 14px;
}

.staples {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 2px;
}

.staple-chip {
  border: 1px solid var(--border-softer);
  background: var(--surface);
  border-radius: 13px;
  padding: 9px 14px;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 800;
  color: var(--text-secondary);
  cursor: pointer;
  box-shadow: var(--shadow-card);
  transition: transform 0.12s var(--ease-overshoot);
}

.staple-chip:active {
  transform: scale(0.96);
}

/* Schnell-Add-Leiste über der Nav (reference/index.html .addbar) */
.addbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 6px var(--screen-pad) 0;
  padding: 0 8px 0 16px;
  height: 52px;
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: 17px;
  box-shadow: var(--shadow-float);
}

.addbar-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.addbar-field {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text);
  font-family: var(--font-body);
  font-size: 14.5px;
  font-weight: 700;
}

.addbar-field::placeholder {
  color: var(--text-faint);
  opacity: 1;
}

.addbar-go {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: var(--accent);
  border: none;
  color: #fff;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
  display: grid;
  place-items: center;
}

.addbar-go:disabled {
  opacity: 0.4;
}

.start-wrap {
  padding: 12px var(--screen-pad) calc(20px + var(--safe-bottom));
}
</style>
