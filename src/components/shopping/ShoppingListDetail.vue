<script setup lang="ts">
import { ref, computed } from 'vue'
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
}>()

const newName = ref('')

function handleAdd() {
  if (!newName.value.trim()) return
  emit('add', newName.value.trim())
  newName.value = ''
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
