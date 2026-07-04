<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import type { ShoppingList, ShoppingItem } from '@/types'
import ShoppingItemRow from './ShoppingItem.vue'
import { useJustAdded } from '@/composables/useJustAdded'

const props = defineProps<{
  list: ShoppingList
  items: ShoppingItem[]
}>()

const emit = defineEmits<{
  toggle: [id: string, checked: boolean]
  delete: [id: string]
  add: [name: string]
  startShopping: []
  back: []
  renameList: [title: string]
  deleteList: []
}>()

const newName = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

function handleAdd() {
  if (!newName.value.trim()) return
  emit('add', newName.value.trim())
  newName.value = ''
  nextTick(() => inputRef.value?.focus())
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

interface CategoryGroup { cat: string; items: ShoppingItem[] }

const grouped = computed<CategoryGroup[]>(() => {
  const map = new Map<string, ShoppingItem[]>()
  for (const item of props.items) {
    const key = item.category ?? 'Sonstiges'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  const sorted = [...map.entries()].sort(([a], [b]) => {
    const aChecked = !map.get(a)!.some(i => !i.checked)
    const bChecked = !map.get(b)!.some(i => !i.checked)
    if (aChecked !== bChecked) return aChecked ? 1 : -1
    return a.localeCompare(b, 'de')
  })
  return sorted.map(([cat, items]) => ({ cat, items }))
})

const uncheckedCount = computed(() => props.items.filter(i => !i.checked).length)

const { justAdded } = useJustAdded(() => props.items, i => i.id)
</script>

<template>
  <div class="detail">
    <!-- Nav -->
    <div class="detail-nav">
      <button class="back-btn" @click="emit('back')">‹ Zurück</button>
      <h2 class="detail-title">{{ list.title }}</h2>
      <span class="detail-count mono">{{ uncheckedCount }}</span>
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

    <!-- Items by category -->
    <div v-if="grouped.length === 0" class="empty">
      Keine Artikel. Füge unten welche hinzu.
    </div>
    <div v-else class="item-list">
      <div v-for="group in grouped" :key="group.cat">
        <div class="cat-header section-label">{{ group.cat }}</div>
        <TransitionGroup tag="div" name="list-add">
          <ShoppingItemRow
            v-for="item in group.items"
            :key="item.id"
            :item="item"
            :class="{ 'just-added': justAdded.has(item.id) }"
            @toggle="emit('toggle', item.id, !item.checked)"
            @delete="emit('delete', item.id)"
          />
        </TransitionGroup>
      </div>
    </div>

    <!-- Inline add input (Nido: weiße Bar mit Plus-Kachel links) -->
    <div class="add-row">
      <button class="add-btn" :disabled="!newName.trim()" @click="handleAdd">+</button>
      <input
        ref="inputRef"
        v-model="newName"
        class="add-field"
        type="text"
        placeholder="Artikel hinzufügen…"
        @keyup.enter="handleAdd"
      />
    </div>

    <!-- Start shopping button -->
    <div class="start-wrap">
      <button
        class="btn-primary"
        :disabled="uncheckedCount === 0"
        @click="emit('startShopping')"
      >
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
  padding: calc(var(--safe-top) + 16px) var(--screen-pad) 16px;
}

/* Nido: Zurück-Button als weiße Icon-Kachel */
.back-btn {
  background: var(--surface);
  border: none;
  color: var(--text);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  padding: 8px 14px;
  border-radius: 12px;
  box-shadow: var(--shadow-float);
  flex-shrink: 0;
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

.detail-count {
  font-size: 14px;
  color: var(--text-meta);
  flex-shrink: 0;
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

.empty {
  padding: 40px var(--screen-pad);
  font-size: 14px;
  color: var(--text-faint);
  text-align: center;
  flex: 1;
}

.item-list {
  flex: 1;
  overflow-y: auto;
}

.cat-header {
  padding: 14px var(--screen-pad) 9px;
  color: var(--text-meta);
}

/* Nido: weiße Eingabe-Bar mit Amber-Plus-Kachel (Frame „Einkaufsliste") */
.add-row {
  display: flex;
  align-items: center;
  gap: 11px;
  margin: 14px var(--screen-pad) 0;
  padding: 0 14px;
  height: 50px;
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: 16px;
  box-shadow: var(--shadow-float);
}

.add-field {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text);
  font-family: var(--font-body);
  font-size: 13.5px;
  font-weight: 600;
}

.add-field::placeholder {
  color: var(--text-meta);
  opacity: 1;
}

.add-btn {
  width: 32px;
  height: 32px;
  background: var(--accent);
  border: none;
  border-radius: 11px;
  color: #fff;
  font-size: 22px;
  font-weight: 300;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-btn:disabled {
  opacity: 0.4;
}

.start-wrap {
  padding: 12px var(--screen-pad) calc(20px + var(--safe-bottom));
}
</style>
