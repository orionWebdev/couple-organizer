<script setup lang="ts">
import type { Note } from '@/types'
import SectionCard from './SectionCard.vue'

defineProps<{ notes: readonly Note[] }>()

const emit = defineEmits<{
  (e: 'add'): void
  (e: 'delete', note: Note): void
}>()
</script>

<template>
  <SectionCard title="Notizen" :count="notes.length">
    <template #action>
      <button class="add-btn" type="button" aria-label="Notiz hinzufügen" @click="emit('add')">＋</button>
    </template>

    <div class="list">
      <div v-for="note in notes" :key="note.id" class="note">
        <span class="note-bullet">·</span>
        <span class="note-text">{{ note.text }}</span>
        <button class="del" type="button" aria-label="Notiz löschen" @click="emit('delete', note)">✕</button>
      </div>

      <p v-if="!notes.length" class="empty">Nichts notiert.</p>
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

.note {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 9px 11px;
  background: var(--surface-deep);
  border-radius: var(--radius-tile);
}

.note-bullet {
  margin-top: 1px;
  color: var(--accent);
  font-weight: 900;
}

.note-text {
  flex: 1;
  min-width: 0;
  font-size: 13.5px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--text);
  overflow-wrap: anywhere;
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
