<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ShoppingList, ShoppingItem } from '@/types'

const props = defineProps<{
  list: ShoppingList
  items: ShoppingItem[]
  menuOpen: boolean
}>()

const emit = defineEmits<{
  select: []
  toggleMenu: []
  rename: [title: string]
  delete: []
}>()

const uncheckedCount = computed(() => props.items.filter(i => !i.checked).length)

const renameValue = ref(props.list.title)

watch(() => props.menuOpen, (open) => {
  if (open) renameValue.value = props.list.title
})

function commitRename() {
  const clean = renameValue.value.trim()
  if (!clean || clean === props.list.title) return
  emit('rename', clean)
}
</script>

<template>
  <div class="list-card-wrap">
    <div class="list-card">
      <button class="card-main" @click="emit('select')">
        <div class="card-body">
          <span class="card-title">{{ list.title }}</span>
          <span class="card-badge mono" :class="{ 'badge--zero': uncheckedCount === 0 }">
            {{ uncheckedCount }}
          </span>
        </div>
        <div class="card-chevron">›</div>
      </button>
      <button class="menu-btn" @click="emit('toggleMenu')">⋯</button>
    </div>

    <div v-if="menuOpen" class="menu">
      <input
        v-model="renameValue"
        class="rename-input"
        type="text"
        placeholder="Listenname"
        @keyup.enter="commitRename"
      />
      <div class="menu-row">
        <button class="menu-action" @click="commitRename">Speichern</button>
        <button class="menu-action menu-action--danger" @click="emit('delete')">Löschen</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.list-card {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 8px 10px 8px 20px;
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  transition: background 0.15s ease;
}

.card-main {
  flex: 1;
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 10px 0;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
}

.list-card:active {
  background: var(--surface-deep);
}

.menu-btn {
  flex-shrink: 0;
  background: transparent;
  border: none;
  color: var(--text-faint);
  font-size: 20px;
  line-height: 1;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
}

.menu {
  margin: 6px 0 0;
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

.card-body {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.card-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 26px;
  padding: 0 7px;
  background: var(--accent-tint);
  color: var(--accent-hover);
  border-radius: 9px;
  font-size: 13px;
  flex-shrink: 0;
}

.badge--zero {
  background: var(--surface-deep);
  color: var(--text-faint);
}

.card-chevron {
  font-size: 20px;
  color: var(--text-faint);
  margin-left: 12px;
  flex-shrink: 0;
}
</style>
