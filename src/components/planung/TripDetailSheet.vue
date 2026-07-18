<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Trip, TripChecklistItem } from '@/types'
import { rangeLabel, countdownLabel } from '@/utils/dateLabels'
import BottomSheet from '@/components/ui/BottomSheet.vue'

const props = defineProps<{
  trip: Trip | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'edit', trip: Trip): void
  (e: 'delete', trip: Trip): void
  (e: 'patch', id: string, patch: { links?: string[]; checklist?: TripChecklistItem[] }): void
}>()

const isOpen = computed(() => !!props.trip)

const checklist = computed<readonly TripChecklistItem[]>(() => props.trip?.checklist ?? [])
const links = computed<readonly string[]>(() => props.trip?.links ?? [])

const rangeText = computed(() => (props.trip ? rangeLabel(props.trip.startDate, props.trip.endDate) : ''))
const countdown = computed(() => (props.trip?.startDate ? countdownLabel(props.trip.startDate) : ''))

const doneCount = computed(() => checklist.value.filter((c) => c.done).length)

// Eingaben leeren, sobald eine andere Reise geöffnet wird.
const newItem = ref('')
const newLink = ref('')
watch(() => props.trip?.id, () => { newItem.value = ''; newLink.value = '' })

function hostname(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function href(url: string): string {
  return url.startsWith('http') ? url : `https://${url}`
}

// ── Packliste ──────────────────────────────────────────────────
function toggleItem(idx: number) {
  if (!props.trip) return
  const next = checklist.value.map((c, i) => (i === idx ? { ...c, done: !c.done } : c))
  emit('patch', props.trip.id, { checklist: next })
}

function addItem() {
  const text = newItem.value.trim()
  if (!text || !props.trip) return
  emit('patch', props.trip.id, { checklist: [...checklist.value, { text, done: false }] })
  newItem.value = ''
}

function removeItem(idx: number) {
  if (!props.trip) return
  emit('patch', props.trip.id, { checklist: checklist.value.filter((_, i) => i !== idx) })
}

// ── Links ──────────────────────────────────────────────────────
function addLink() {
  const url = newLink.value.trim()
  if (!url || !props.trip) return
  emit('patch', props.trip.id, { links: [...links.value, url] })
  newLink.value = ''
}

function removeLink(idx: number) {
  if (!props.trip) return
  emit('patch', props.trip.id, { links: links.value.filter((_, i) => i !== idx) })
}
</script>

<template>
  <BottomSheet :isOpen="isOpen" :title="trip?.title ?? 'Reise'" @close="emit('close')">
    <div v-if="trip" class="area-planung trip-detail">
      <!-- Kopf -->
      <div class="td-head">
        <span class="td-emoji">{{ trip.emoji }}</span>
        <div class="td-headtext">
          <span v-if="trip.location" class="td-loc">📍 {{ trip.location }}</span>
          <span v-if="rangeText" class="td-range">
            📅 {{ rangeText }}<template v-if="countdown"> · {{ countdown }}</template>
          </span>
          <span v-else class="td-range td-range--soft">{{ trip.when }}</span>
        </div>
      </div>

      <p v-if="trip.notes" class="td-notes">{{ trip.notes }}</p>

      <!-- Packliste -->
      <div class="td-sec-head">
        <span class="section-label">Packliste / To-dos</span>
        <span v-if="checklist.length" class="td-count">{{ doneCount }}/{{ checklist.length }}</span>
      </div>
      <div class="td-list">
        <div v-for="(item, idx) in checklist" :key="idx" class="td-item" :class="{ 'td-item--done': item.done }">
          <button class="td-check" :class="{ 'td-check--on': item.done }" type="button" @click="toggleItem(idx)">
            <span v-if="item.done">✓</span>
          </button>
          <span class="td-item-text">{{ item.text }}</span>
          <button class="td-del" type="button" aria-label="Entfernen" @click="removeItem(idx)">✕</button>
        </div>
      </div>
      <div class="td-add">
        <input v-model="newItem" class="app-field td-add-field" placeholder="Punkt hinzufügen …" @keyup.enter="addItem" />
        <button class="td-add-btn" :disabled="!newItem.trim()" @click="addItem">＋</button>
      </div>

      <!-- Links -->
      <div class="td-sec-head td-sec-head--spaced">
        <span class="section-label">Links</span>
      </div>
      <div v-if="links.length" class="td-links">
        <div v-for="(url, idx) in links" :key="idx" class="td-link">
          <a class="td-link-a" :href="href(url)" target="_blank" rel="noopener noreferrer">🔗 {{ hostname(url) }}</a>
          <button class="td-del" type="button" aria-label="Link entfernen" @click="removeLink(idx)">✕</button>
        </div>
      </div>
      <div class="td-add">
        <input v-model="newLink" class="app-field td-add-field" placeholder="Link einfügen …" inputmode="url" @keyup.enter="addLink" />
        <button class="td-add-btn" :disabled="!newLink.trim()" @click="addLink">＋</button>
      </div>

      <!-- Aktionen -->
      <div class="td-actions">
        <button class="td-edit" type="button" @click="emit('edit', trip)">Bearbeiten</button>
        <button class="td-delete" type="button" @click="emit('delete', trip)">Löschen</button>
      </div>
    </div>
  </BottomSheet>
</template>

<style scoped>
.trip-detail {
  display: flex;
  flex-direction: column;
}

.td-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.td-emoji {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background: color-mix(in srgb, var(--bucket) 14%, var(--surface));
  font-size: 26px;
}

.td-headtext {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.td-loc {
  font-size: 14px;
  font-weight: 800;
  color: var(--text);
}

.td-range {
  font-size: 13px;
  font-weight: 700;
  color: var(--accent);
}

.td-range--soft {
  color: var(--text-meta);
}

.td-notes {
  margin: 0 0 16px;
  padding: 12px 14px;
  background: var(--surface-deep);
  border-radius: 12px;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--text-secondary);
  white-space: pre-wrap;
}

.td-sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.td-sec-head--spaced {
  margin-top: 18px;
}

.td-count {
  font-size: 12px;
  font-weight: 800;
  color: var(--accent);
}

.td-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.td-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 11px;
  background: var(--surface-deep);
  border-radius: var(--radius-tile);
}

.td-check {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border: 2px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}

.td-check--on {
  background: var(--accent);
  border-color: var(--accent);
}

.td-item-text {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}

.td-item--done .td-item-text {
  text-decoration: line-through;
  color: var(--text-faint);
}

.td-del {
  flex-shrink: 0;
  border: none;
  background: none;
  padding: 0 2px;
  color: var(--text-faint);
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.td-add {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.td-add-field {
  flex: 1;
  margin-bottom: 0;
}

.td-add-btn {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: none;
  border-radius: 12px;
  background: var(--accent);
  color: #fff;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.td-add-btn:disabled {
  opacity: 0.4;
}

.td-links {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.td-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 11px;
  background: var(--surface-deep);
  border-radius: var(--radius-tile);
}

.td-link-a {
  flex: 1;
  min-width: 0;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--accent);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.td-actions {
  display: flex;
  gap: 10px;
  margin-top: 22px;
}

.td-edit {
  flex: 1;
  padding: 13px;
  border: none;
  border-radius: 14px;
  background: var(--accent);
  color: #fff;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.td-delete {
  flex-shrink: 0;
  padding: 13px 18px;
  border: 1.5px solid var(--danger-border);
  border-radius: 14px;
  background: transparent;
  color: var(--danger);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}
</style>
