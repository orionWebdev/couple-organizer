<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import { useBucketList } from '@/composables/useBucketList'
import { showToast } from '@/composables/useToast'
import type { BucketListCategory, BucketListItem } from '@/types'

const router = useRouter()
const { user } = useAuth()
const { couple } = useCouple()
const coupleId = computed(() => user.value?.coupleId ?? null)
const { items, loading, addItem, toggleDone } = useBucketList(coupleId)

function goBack() {
  router.push('/dashboard')
}

const subtitle = computed(() => {
  if (!couple.value) return 'Schöne Dinge'
  const names = couple.value.memberIds.map((uid) => couple.value!.memberNames[uid]).filter(Boolean)
  return names.length ? `Schöne Dinge · ${names.join(' & ')}` : 'Schöne Dinge'
})

const TABS: Array<{ key: 'all' | BucketListCategory; label: string }> = [
  { key: 'all', label: 'Alle' },
  { key: 'ort', label: 'Orte' },
  { key: 'restaurant', label: 'Restaurants' },
]

const filter = ref<'all' | BucketListCategory>('all')

const filteredItems = computed(() =>
  items.value.filter((i) => filter.value === 'all' || i.category === filter.value)
)

function categoryIcon(category: BucketListCategory) {
  return category === 'ort' ? '📍' : '🍽️'
}

async function handleToggle(item: BucketListItem) {
  const ok = await toggleDone(item)
  if (!ok) showToast('Fehler beim Speichern')
}

const showForm = ref(false)
const formCategory = ref<BucketListCategory>('ort')
const formName = ref('')
const formNote = ref('')

function toggleForm() {
  showForm.value = !showForm.value
}

async function handleSave() {
  const ok = await addItem({ category: formCategory.value, name: formName.value, note: formNote.value })
  if (ok) {
    formName.value = ''
    formNote.value = ''
    formCategory.value = 'ort'
    showForm.value = false
    showToast('Eintrag gespeichert')
  } else {
    showToast('Fehler beim Speichern')
  }
}
</script>

<template>
  <div class="bucket-page area-bucket">
    <div class="detail-header">
      <button class="back-caret" type="button" @click="goBack" aria-label="Zurück">‹</button>
      <div class="header-text">
        <span class="page-title">Bucket-List</span>
        <span class="page-subtitle">{{ subtitle }}</span>
      </div>
    </div>

    <div class="tab-row">
      <button
        v-for="t in TABS"
        :key="t.key"
        type="button"
        class="tab-btn"
        :class="{ 'tab-btn--active': filter === t.key }"
        @click="filter = t.key"
      >{{ t.label }}</button>
    </div>

    <div class="bucket-scroll">
      <div v-if="loading" class="loading-msg">Laden…</div>
      <div v-else-if="filteredItems.length === 0" class="empty-msg">Noch nichts hier — leg direkt los ✨</div>
      <div v-else class="item-list">
        <div v-for="item in filteredItems" :key="item.id" class="item-card">
          <button
            class="item-check"
            :class="{ 'item-check--done': item.done }"
            type="button"
            @click="handleToggle(item)"
            aria-label="Erledigt"
          >
            <span v-if="item.done" class="check-mark">✓</span>
          </button>
          <span class="item-icon">{{ categoryIcon(item.category) }}</span>
          <div class="item-text">
            <span class="item-name" :class="{ 'item-name--done': item.done }">{{ item.name }}</span>
            <span v-if="item.note" class="item-note">{{ item.note }}</span>
          </div>
        </div>
      </div>

      <div v-if="showForm" class="form-card">
        <div class="form-chips">
          <button
            type="button"
            class="chip-btn"
            :class="{ 'chip-btn--active': formCategory === 'ort' }"
            @click="formCategory = 'ort'"
          >📍 Ort</button>
          <button
            type="button"
            class="chip-btn"
            :class="{ 'chip-btn--active': formCategory === 'restaurant' }"
            @click="formCategory = 'restaurant'"
          >🍽️ Restaurant</button>
        </div>
        <input v-model="formName" class="app-field form-field" type="text" placeholder="Name (Ort oder Restaurant)" />
        <input v-model="formNote" class="app-field form-field" type="text" placeholder="Notiz (optional)" />
        <button class="btn-primary" type="button" :disabled="!formName.trim()" @click="handleSave">
          Eintrag speichern
        </button>
      </div>
    </div>

    <div class="cta-wrap">
      <button class="cta-btn" type="button" @click="toggleForm">
        <span class="cta-icon">{{ showForm ? '✕' : '+' }}</span>
        {{ showForm ? 'Schließen' : 'Eintrag hinzufügen' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.bucket-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: calc(var(--safe-top) + 20px) var(--screen-pad) 4px;
}

.back-caret {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: transparent;
  border: none;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-faint);
  cursor: pointer;
}

.back-caret:active {
  color: var(--text);
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.page-title {
  font-family: var(--font-headline);
  font-size: 19px;
  font-weight: 700;
  color: var(--text);
}

.page-subtitle {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-secondary);
}

.tab-row {
  display: flex;
  gap: 6px;
  padding: 10px var(--screen-pad) 6px;
}

.tab-btn {
  flex: 1;
  padding: 9px 0;
  background: var(--surface-deep);
  border: 1.5px solid var(--border-softer);
  border-radius: 12px;
  font-family: var(--font-body);
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-meta);
  cursor: pointer;
}

.tab-btn--active {
  background: var(--bucket);
  border-color: var(--bucket);
  color: #fff;
}

.bucket-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 6px var(--screen-pad) 16px;
}

.loading-msg,
.empty-msg {
  padding: 40px var(--screen-pad);
  font-size: 14px;
  color: var(--text-faint);
  text-align: center;
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.item-card {
  display: flex;
  align-items: center;
  gap: 11px;
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  padding: 12px 13px;
}

.item-check {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 8px;
  border: 2px solid var(--border);
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
}

.item-check--done {
  background: var(--success);
  border-color: var(--success);
}

.check-mark {
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.item-icon {
  flex-shrink: 0;
  font-size: 16px;
}

.item-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.item-name {
  font-family: var(--font-headline);
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-name--done {
  text-decoration: line-through;
  color: var(--text-faint);
}

.item-note {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-meta);
}

.form-card {
  margin-top: 14px;
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card-lg);
  box-shadow: var(--shadow-card);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-chips {
  display: flex;
  gap: 8px;
}

.chip-btn {
  padding: 8px 14px;
  background: var(--surface-deep);
  border: 1px solid var(--border-soft);
  border-radius: 100px;
  font-family: var(--font-body);
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-secondary);
  cursor: pointer;
}

.chip-btn--active {
  background: var(--bucket);
  border-color: var(--bucket);
  color: #fff;
}

.form-field {
  margin: 0;
}

.cta-wrap {
  padding: 10px var(--screen-pad) calc(20px + var(--safe-bottom));
}

.cta-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 50px;
  border: none;
  border-radius: 16px;
  background: var(--bucket);
  color: #fff;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 10px 22px color-mix(in srgb, var(--bucket) 35%, transparent);
}

.cta-icon {
  font-size: 18px;
  font-weight: 300;
}
</style>
