<script setup lang="ts">
import { computed } from 'vue'
import type { Todo, Couple } from '@/types'
import InitialChip from '@/components/ui/InitialChip.vue'

const props = defineProps<{
  todo: Todo
  couple: Couple | null
}>()

const emit = defineEmits<{ delete: [id: string] }>()

const timeLabel = computed(() => {
  const date = (props.todo.updatedAt as any)?.toDate?.() ?? new Date()
  return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(date)
})
</script>

<template>
  <div class="entry">
    <div class="entry-dot" />
    <div class="entry-content">
      <span class="entry-title">{{ todo.title }}</span>
      <div class="entry-meta">
        <InitialChip v-if="todo.assignedTo" :uid="todo.assignedTo" :couple="couple" :size="16" />
        <span class="entry-time">{{ timeLabel }}</span>
      </div>
    </div>
    <button class="entry-del" @click="emit('delete', todo.id)">×</button>
  </div>
</template>

<style scoped>
.entry {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 0;
  position: relative;
}

.entry-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--accent);
  margin-top: 5px;
  flex-shrink: 0;
}

.entry-content {
  flex: 1;
  min-width: 0;
}

.entry-title {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 4px;
}

.entry-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.entry-time {
  font-size: 11.5px;
  color: var(--text-meta);
}

.entry-del {
  background: none;
  border: none;
  color: var(--text-faint);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  padding: 2px 6px;
  flex-shrink: 0;
}
</style>
