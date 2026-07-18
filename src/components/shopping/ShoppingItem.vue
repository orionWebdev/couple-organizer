<script setup lang="ts">
import type { Couple, ShoppingItem } from '@/types'
import InitialChip from '@/components/ui/InitialChip.vue'

const props = defineProps<{
  item: ShoppingItem
  couple: Couple | null
}>()

const emit = defineEmits<{
  toggle: [id: string, checked: boolean]
  delete: [id: string]
}>()

const fromRecipe = props.item.source === 'mealPlan'

let pressTimer: ReturnType<typeof setTimeout> | null = null

function onTouchStart() {
  pressTimer = setTimeout(() => emit('delete', props.item.id), 500)
}
function onTouchEnd() {
  if (pressTimer) clearTimeout(pressTimer)
}
</script>

<template>
  <div
    class="sli list-row"
    :class="{ 'sli--done': item.checked }"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
  >
    <button
      class="schk"
      :class="{ 'schk--done': item.checked }"
      :aria-label="item.checked ? 'Abwählen' : 'Abhaken'"
      @click="emit('toggle', item.id, !item.checked)"
    >
      <svg v-if="item.checked" width="14" height="14" viewBox="0 0 12 12" fill="none">
        <path d="M1.5 6l3 3 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <span class="sli-name">{{ item.name }}</span>

    <span v-if="fromRecipe" class="sli-tag">🍝 Rezept</span>
    <span v-if="item.amount" class="sli-qty mono">{{ item.amount }}{{ item.unit ? ' ' + item.unit : '' }}</span>
    <InitialChip v-if="!fromRecipe && item.addedBy" :uid="item.addedBy" :couple="couple" :size="24" />

    <button class="sli-del" aria-label="Löschen" @click="emit('delete', item.id)">×</button>
  </div>
</template>

<style scoped>
.sli {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 2px;
  transition: background-color var(--dur-highlight) var(--ease-standard);
}

.sli + .sli {
  border-top: 1px solid var(--border-softer);
}

.schk {
  width: 27px;
  height: 27px;
  border-radius: 9px;
  border: 2.5px solid var(--border);
  background: var(--surface);
  flex: none;
  display: grid;
  place-items: center;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s var(--ease-overshoot), border-color 0.2s var(--ease-overshoot);
}

.schk--done {
  background: var(--accent);
  border-color: var(--accent);
  animation: chk-pop 0.35s var(--ease-overshoot);
}

.sli-name {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sli--done .sli-name {
  text-decoration: line-through;
  color: var(--text-faint);
}

.sli-tag {
  flex: none;
  font-size: 11px;
  font-weight: 800;
  border-radius: 7px;
  padding: 3px 8px;
  background: color-mix(in srgb, var(--food) 14%, var(--surface));
  color: var(--food);
  white-space: nowrap;
}

.sli-qty {
  flex: none;
  font-size: 13px;
  font-weight: 800;
  color: var(--text-meta);
  white-space: nowrap;
}

.sli-del {
  flex: none;
  background: none;
  border: none;
  color: var(--text-faint);
  font-size: 18px;
  line-height: 1;
  padding: 2px 4px;
  cursor: pointer;
  opacity: 0.55;
}
</style>
