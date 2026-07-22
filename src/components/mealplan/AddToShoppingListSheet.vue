<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { showPaywall } from '@/composables/usePaywall'
import type { ShoppingList } from '@/types'

const props = defineProps<{
  isOpen: boolean
  // Was hinzugefügt wird — z. B. „Montag · Spaghetti Bolognese" oder
  // „Ganze Woche · 5 Gerichte". Rein informativ über der Auswahl.
  subtitle: string
  lists: readonly ShoppingList[]
  activeListId: string | null
  canCreateList: boolean
  createList: (title: string) => Promise<string | null>
}>()

const emit = defineEmits<{ close: []; confirm: [listId: string] }>()

// 'new' = neue Liste anlegen, sonst die gewählte bestehende Liste.
const selectedListId = ref<string | null>(null)
const newListName = ref('')
const busy = ref(false)

const creatingNew = computed(() => selectedListId.value === '__new__')

watch(() => props.isOpen, (open) => {
  if (!open) return
  busy.value = false
  newListName.value = ''
  // Ohne bestehende Liste direkt in den „neue Liste"-Modus, sonst die aktive
  // (bzw. die erste) vorwählen.
  if (props.lists.length === 0) {
    selectedListId.value = '__new__'
  } else {
    selectedListId.value = props.activeListId ?? props.lists[0]?.id ?? '__new__'
  }
})

function pickNew() {
  if (!props.canCreateList) {
    showPaywall('shoppingLists')
    return
  }
  selectedListId.value = '__new__'
}

const canConfirm = computed(() => {
  if (busy.value) return false
  if (creatingNew.value) return newListName.value.trim().length > 0
  return !!selectedListId.value
})

async function handleConfirm() {
  if (!canConfirm.value) return
  busy.value = true

  if (creatingNew.value) {
    const id = await props.createList(newListName.value.trim())
    if (!id) {
      busy.value = false
      // createList lehnt am Free-Limit ab (oder ein echter Fehler) → Paywall
      // ist die häufigste Ursache und die sinnvollere Reaktion.
      showPaywall('shoppingLists')
      return
    }
    emit('confirm', id)
    return
  }

  emit('confirm', selectedListId.value as string)
}
</script>

<template>
  <BottomSheet :isOpen="isOpen" title="Auf Einkaufsliste" @close="emit('close')">
    <p class="add-sub">{{ subtitle }}</p>

    <div class="field-label">In welche Liste?</div>
    <div class="list-pick">
      <button
        v-for="l in lists"
        :key="l.id"
        type="button"
        class="list-row"
        :class="{ 'list-row--active': selectedListId === l.id }"
        @click="selectedListId = l.id"
      >
        <span class="radio" :class="{ 'radio--on': selectedListId === l.id }"></span>
        <span class="list-title">{{ l.title }}</span>
      </button>

      <button
        type="button"
        class="list-row list-row--new"
        :class="{ 'list-row--active': creatingNew }"
        @click="pickNew"
      >
        <span class="radio" :class="{ 'radio--on': creatingNew }"></span>
        <span class="list-title">＋ Neue Liste</span>
      </button>
    </div>

    <input
      v-if="creatingNew"
      v-model="newListName"
      class="app-field new-name"
      type="text"
      placeholder="Name der Liste"
      @keyup.enter="handleConfirm"
    />

    <button class="btn-primary confirm-btn" :disabled="!canConfirm" @click="handleConfirm">
      🛒 Hinzufügen
    </button>
  </BottomSheet>
</template>

<style scoped>
.add-sub {
  font-size: 13px;
  color: var(--text-meta);
  margin: 0 0 14px;
  line-height: 1.4;
}

.field-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--text-meta);
  margin-bottom: 8px;
}

.list-pick {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
  max-height: 40vh;
  overflow-y: auto;
}

.list-row {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  border: 1.5px solid var(--border-softer);
  background: var(--surface);
  border-radius: 12px;
  padding: 12px 14px;
  cursor: pointer;
  text-align: left;
}

.list-row--active {
  border-color: var(--accent);
  background: var(--accent-tint);
}

.list-row--new .list-title {
  color: var(--accent);
}

.radio {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--border);
  position: relative;
}

.radio--on {
  border-color: var(--accent);
}

.radio--on::after {
  content: '';
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background: var(--accent);
}

.list-title {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.new-name {
  margin-bottom: 12px;
}

.confirm-btn {
  width: 100%;
}
</style>
