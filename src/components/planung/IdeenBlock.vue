<script setup lang="ts">
import { computed, ref } from 'vue'
import type { BucketListItem, Couple } from '@/types'
import { categoryDef, ideaAuthor, ideaCategory, resolveIdeaCategories } from '@/utils/ideen'
import SectionCard from './SectionCard.vue'
import InitialChip from '@/components/ui/InitialChip.vue'

const props = defineProps<{
  items: readonly BucketListItem[]
  couple: Couple | null
}>()

const emit = defineEmits<{
  (e: 'add'): void
  (e: 'toggle', item: BucketListItem): void
  (e: 'delete', item: BucketListItem): void
}>()

const categories = computed(() => resolveIdeaCategories(props.couple))

const filter = ref<string>('all')

const shown = computed(() =>
  props.items.filter(
    (i) => filter.value === 'all' || ideaCategory(i.category, categories.value) === filter.value
  )
)

const openCount = computed(() => props.items.filter((i) => !i.done).length)
</script>

<template>
  <SectionCard icon="💡" title="Ideen für uns" :count="`${openCount} offen`">
    <template #action>
      <button class="add-btn" type="button" aria-label="Idee hinzufügen" @click="emit('add')">＋</button>
    </template>

    <div class="filters">
      <button
        class="cat-filter"
        :class="{ 'cat-filter--on': filter === 'all' }"
        type="button"
        @click="filter = 'all'"
      >Alle</button>
      <button
        v-for="cat in categories"
        :key="cat.id"
        class="cat-filter"
        :class="{ 'cat-filter--on': filter === cat.id }"
        type="button"
        @click="filter = cat.id"
      >{{ cat.emoji }} {{ cat.label }}</button>
    </div>

    <div class="list">
      <div
        v-for="item in shown"
        :key="item.id"
        class="idea"
        :class="{ 'idea--done': item.done }"
      >
        <button
          class="check"
          :class="{ 'check--on': item.done }"
          type="button"
          :aria-label="item.done ? 'Wieder öffnen' : 'Abhaken'"
          @click="emit('toggle', item)"
        >{{ item.done ? '✓' : '' }}</button>
        <span class="idea-emoji">{{ categoryDef(item.category, categories).emoji }}</span>
        <span class="idea-title">{{ item.name }}</span>
        <InitialChip :uid="ideaAuthor(item)" :couple="couple" :size="20" />
        <button class="del" type="button" aria-label="Idee löschen" @click="emit('delete', item)">✕</button>
      </div>

      <p v-if="!shown.length" class="empty">Noch keine Idee hier — tippt ＋.</p>
    </div>
  </SectionCard>
</template>

<style scoped>
.add-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
}

/* Die Kategorien sind frei definierbar — bei vielen davon würde eine umbrechende
   Chip-Reihe die Karte immer weiter aufblähen. Stattdessen eine Zeile, die
   innerhalb der Karte horizontal scrollt (bis unter deren 15px-Padding, damit
   sichtbar bleibt, dass es weitergeht). */
.filters {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  margin: 0 -15px 12px;
  padding: 0 15px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
}

.filters::-webkit-scrollbar {
  display: none;
}

.cat-filter {
  flex: 0 0 auto;
  white-space: nowrap;
  padding: 5px 11px;
  border: 1px solid var(--border-soft);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text-secondary);
  font-family: var(--font-body);
  font-size: 11.5px;
  font-weight: 800;
  cursor: pointer;
}

.cat-filter--on {
  border-color: var(--accent);
  background: var(--accent-tint);
  color: var(--accent);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.idea {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-tile);
}

.idea--done {
  background: var(--surface-deep);
  opacity: 0.6;
}

.check {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border: 2px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  color: #fff;
  font-size: 13px;
  font-weight: 900;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.check--on {
  border: none;
  background: var(--success);
}

.idea-emoji {
  font-size: 15px;
}

.idea-title {
  flex: 1;
  min-width: 0;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.idea--done .idea-title {
  text-decoration: line-through;
}

.del {
  border: none;
  background: none;
  padding: 0 2px;
  color: var(--text-faint);
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  flex-shrink: 0;
}

.empty {
  margin: 0;
  padding: 4px 2px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-meta);
}
</style>
