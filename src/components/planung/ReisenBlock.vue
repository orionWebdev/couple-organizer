<script setup lang="ts">
import type { Trip } from '@/types'
import SectionCard from './SectionCard.vue'

defineProps<{ trips: readonly Trip[] }>()

const emit = defineEmits<{
  (e: 'add'): void
  (e: 'delete', trip: Trip): void
}>()
</script>

<template>
  <SectionCard icon="🧳" title="Reisen & Ausflüge" :count="trips.length">
    <template #action>
      <button class="add-btn" type="button" aria-label="Reise hinzufügen" @click="emit('add')">＋</button>
    </template>

    <div class="list">
      <div v-for="trip in trips" :key="trip.id" class="trip">
        <span class="trip-emoji">{{ trip.emoji }}</span>
        <span class="trip-title">{{ trip.title }}</span>
        <span class="trip-when">{{ trip.when }}</span>
        <button class="del" type="button" aria-label="Reise löschen" @click="emit('delete', trip)">✕</button>
      </div>

      <p v-if="!trips.length" class="empty">Wohin als Nächstes? Tippt ＋.</p>
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

.list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.trip {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 11px;
  background: var(--surface-deep);
  border-radius: var(--radius-tile);
}

.trip-emoji {
  font-size: 20px;
}

.trip-title {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 800;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trip-when {
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--accent-tint);
  color: var(--accent);
  font-size: 11.5px;
  font-weight: 800;
  white-space: nowrap;
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
