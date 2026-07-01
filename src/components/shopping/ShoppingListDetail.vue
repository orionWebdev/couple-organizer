<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ShoppingList, ShoppingItem } from '@/types'
import ShoppingItemRow from './ShoppingItem.vue'

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
        <ShoppingItemRow
          v-for="item in group.items"
          :key="item.id"
          :item="item"
          @toggle="emit('toggle', item.id, !item.checked)"
          @delete="emit('delete', item.id)"
        />
      </div>
    </div>

    <!-- Inline add input -->
    <div class="add-row">
      <input
        v-model="newName"
        class="app-field add-field"
        type="text"
        placeholder="Artikel hinzufügen…"
        @keyup.enter="handleAdd"
      />
      <button class="add-btn" :disabled="!newName.trim()" @click="handleAdd">+</button>
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

.back-btn {
  background: none;
  border: none;
  color: var(--accent);
  font-family: 'Mali', system-ui, sans-serif;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}

.detail-title {
  flex: 1;
  font-size: 18px;
  font-weight: 600;
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
  padding: 10px var(--screen-pad) 4px;
  background: var(--surface-deep);
  color: var(--text-faint);
  letter-spacing: 0.1em;
}

.add-row {
  display: flex;
  gap: 10px;
  padding: 14px var(--screen-pad);
  border-top: 1px solid var(--border-softer);
}

.add-field {
  flex: 1;
  margin-bottom: 0;
}

.add-btn {
  width: 46px;
  height: 46px;
  background: var(--accent-tint);
  border: 1px solid var(--accent);
  border-radius: 12px;
  color: var(--accent);
  font-size: 22px;
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
