<script setup lang="ts">
import AppSheetModal from '@/components/ui/AppSheetModal.vue'
import type { FinanceEventKind } from '@/types'

interface ArchiveEntry {
  id: string
  title: string
  kind: FinanceEventKind
}

defineProps<{
  isOpen: boolean
  entries: ArchiveEntry[]
}>()

const emit = defineEmits<{
  close: []
  reactivate: [id: string]
  delete: [id: string]
}>()

function getKindLabel(kind: FinanceEventKind): string {
  return kind === 'monthly' ? 'Monatlich' : 'Event'
}
</script>

<template>
  <AppSheetModal
    :is-open="isOpen"
    title="Archiv"
    variant="full-sheet"
    close-label="Schließen"
    @close="emit('close')"
  >
    <section class="archive-screen">
      <div v-if="entries.length === 0" class="archive-empty-card">
        <p class="text-base font-medium text-slate-200">Noch keine archivierten Events.</p>
        <p class="mt-2 text-sm text-slate-400">Archivierte Events tauchen hier gesammelt auf.</p>
      </div>

      <div v-else class="space-y-4">
        <article
          v-for="entry in entries"
          :key="entry.id"
          class="archive-entry-card"
        >
          <div>
            <p class="text-base font-semibold text-slate-100">{{ entry.title }}</p>
            <p class="mt-1 text-sm text-slate-400">{{ getKindLabel(entry.kind) }}</p>
          </div>

          <div class="archive-entry-actions">
            <button
              type="button"
              class="archive-action-button archive-action-button-neutral"
              @click="emit('reactivate', entry.id)"
            >
              Reaktivieren
            </button>
            <button
              type="button"
              class="archive-action-button archive-action-button-danger"
              @click="emit('delete', entry.id)"
            >
              Löschen
            </button>
          </div>
        </article>
      </div>
    </section>
  </AppSheetModal>
</template>

<style scoped>
.archive-screen {
  min-height: 100%;
  padding-top: 0.25rem;
}

.archive-empty-card,
.archive-entry-card {
  border: 1px solid rgba(71, 85, 105, 0.5);
  border-radius: 1.6rem;
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.97), rgba(15, 23, 42, 0.97));
  box-shadow: 0 18px 40px rgba(2, 6, 23, 0.24);
}

.archive-empty-card {
  padding: 2rem 1.4rem;
  text-align: center;
}

.archive-entry-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.1rem;
}

.archive-entry-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.6rem;
}

.archive-action-button {
  border: 0;
  border-radius: 9999px;
  padding: 0.6rem 0.95rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.archive-action-button-neutral {
  background: rgba(51, 65, 85, 0.72);
  color: rgb(226 232 240);
}

.archive-action-button-danger {
  background: rgba(239, 68, 68, 0.16);
  color: rgb(252 165 165);
}
</style>
