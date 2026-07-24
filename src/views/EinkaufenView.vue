<script setup lang="ts">
import { ref, computed, watch, onScopeDispose } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import { useShopping } from '@/composables/useShopping'
import { useExpenses } from '@/composables/useExpenses'
import { setFabAction } from '@/composables/useFab'
import { showToast } from '@/composables/useToast'
import { showPaywall } from '@/composables/usePaywall'
import { useBackDismiss } from '@/composables/useBackButton'
import { usePersistedRef, DRAFT_TTL_MS } from '@/composables/usePersistedRef'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import ProfileButton from '@/components/ui/ProfileButton.vue'
import ShoppingListCard from '@/components/shopping/ShoppingListCard.vue'
import ShoppingListDetail from '@/components/shopping/ShoppingListDetail.vue'
import ShoppingModeView from '@/components/shopping/ShoppingModeView.vue'
import EssensplanView from '@/components/mealplan/EssensplanView.vue'
import RezeptWikiView from '@/components/mealplan/RezeptWikiView.vue'

// embedded: als Segment „Küche" innerhalb von AlltagView gerendert — AlltagView
// trägt dann die Kopfzeile, der eigene Segmentumschalter wird sekundär.
withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })

// Meldet der Shell, dass eine Vollbild-Unteransicht (Listendetail /
// Einkaufsmodus) offen ist. Nur im eingebetteten Zustand relevant.
const emit = defineEmits<{ subview: [active: boolean] }>()

const { user } = useAuth()
const { couple } = useCouple()
const coupleId = computed(() => user.value?.coupleId ?? null)

const {
  lists,
  items,
  activeListId,
  activeList,
  activeItems,
  loading,
  canCreateList,
  setActiveList,
  createList,
  renameList,
  deleteList,
  addItem,
  toggleChecked,
  deleteItem,
  clearChecked,
  linkItemsToExpense,
} = useShopping(coupleId)

const { addExpense } = useExpenses(coupleId)

const rezeptWikiRef = ref<InstanceType<typeof RezeptWikiView> | null>(null)

// Seit dem 3er-Umbau kein Segmentumschalter mehr. 'main' ist der Hub:
// oben zwei Karten (Einkaufsliste · Rezepte) auf eigene Seiten, darunter der
// Wochenplan. 'shopping' ist die Listenübersicht, 'rezepte' das Rezept-Wiki;
// 'detail'/'shopping-mode' bleiben wie bisher.
type View = 'main' | 'shopping' | 'detail' | 'shopping-mode' | 'rezepte'
const view = usePersistedRef<View>('einkaufen.view', 'main', { ttlMs: DRAFT_TTL_MS })
// Migration des früheren 'lists'-Werts (war der Hub) auf 'main'.
if ((view.value as string) === 'lists') view.value = 'main'

// Alle Vollbild-Unteransichten der Shell melden, damit sie eingebettet ihre
// Chrome (Kopf + Segmentleiste) ausblendet.
watch(view, (v) => emit('subview', v !== 'main'), { immediate: true })

// Die aktive Liste lebt in useShopping und würde beim Kaltstart auf die erste
// Liste zurückfallen. Wir merken uns die zuletzt geöffnete separat und stellen
// sie wieder her, sobald die Listen geladen sind — einmalig.
const persistedListId = usePersistedRef<string | null>('einkaufen.listId', null, { ttlMs: DRAFT_TTL_MS })
const stopListRestore = watch(
  () => lists.value.length,
  (len) => {
    if (len === 0) return
    const savedId = persistedListId.value
    const valid = !!savedId && lists.value.some(l => l.id === savedId)
    if (valid) setActiveList(savedId as string)
    // Detail/Einkaufsmodus wurden restauriert, aber die Liste gibt es nicht mehr
    // (gelöscht) → sauber zurück auf die Übersicht statt einer fremden Liste.
    if (!valid && (view.value === 'detail' || view.value === 'shopping-mode')) {
      view.value = 'shopping'
    }
    stopListRestore()
  },
  { immediate: true }
)

const showNewList = usePersistedRef('einkaufen.showNewList', false, { ttlMs: DRAFT_TTL_MS })
const newListName = usePersistedRef('einkaufen.newListName', '', { ttlMs: DRAFT_TTL_MS })

// Die Paywall greift schon beim Antippen des FAB — den Namen erst tippen zu
// lassen und dann abzulehnen wäre die unfreundlichere Reihenfolge.
function handleNewListTap() {
  if (!canCreateList.value) {
    showPaywall('shoppingLists')
    return
  }
  showNewList.value = true
}

// Globaler FAB (App-Shell): in der Listenübersicht ('shopping') legt er eine
// neue Liste an, in der Rezept-Seite ein neues Rezept (versteckt, solange das
// Formular ohnehin offen ist). Der Hub ('main') und die Detail-/Einkaufsmodus-
// Ansichten bringen ihre eigenen Einstiege mit.
const fabAction = computed(() => {
  if (view.value === 'shopping') return { label: 'Neue Liste', handler: handleNewListTap }
  if (view.value === 'rezepte' && !rezeptWikiRef.value?.showForm) {
    return { label: 'Rezept hinzufügen', handler: () => rezeptWikiRef.value?.openCreateForm() }
  }
  return null
})
watch(fabAction, (a) => setFabAction(a), { immediate: true })
onScopeDispose(() => setFabAction(null))

async function handleCreateList() {
  if (!newListName.value.trim()) return
  const ok = await createList(newListName.value.trim())
  if (!ok) {
    showNewList.value = false
    showPaywall('shoppingLists')
    return
  }
  showToast('Liste erstellt')
  newListName.value = ''
  showNewList.value = false
}

function selectList(id: string) {
  setActiveList(id)
  persistedListId.value = id
  view.value = 'detail'
}

const menuOpenId = ref<string | null>(null)

function toggleListMenu(id: string) {
  menuOpenId.value = menuOpenId.value === id ? null : id
}

async function handleRenameList(id: string, title: string) {
  await renameList(id, title)
  showToast('Liste umbenannt')
  menuOpenId.value = null
}

async function handleDeleteList(id: string) {
  const wasActive = activeListId.value === id
  await deleteList(id)
  showToast('Liste gelöscht')
  menuOpenId.value = null
  if (wasActive) view.value = 'shopping'
}

// Navigations-Hierarchie: main (Hub) → shopping (Übersicht) → detail →
// shopping-mode; rezepte hängt direkt am Hub.
function backToMain() { view.value = 'main' }
function goBack() { view.value = 'shopping' } // aus dem Detail zurück zur Übersicht
function openShopping() { view.value = 'shopping' }
function openRezepte() { view.value = 'rezepte' }

function startShopping() {
  view.value = 'shopping-mode'
}

// Alle Unteransichten ohne eigene Route brauchen Back-to-Dismiss, sonst
// verlässt der Android-Zurück-Wisch die App. Tieferes zuerst registrieren,
// damit der Zurück-Wisch Ebene für Ebene hochgeht (Einkaufsmodus → Detail →
// Übersicht → Hub).
useBackDismiss(() => view.value === 'shopping-mode', () => { view.value = 'detail' })
useBackDismiss(() => view.value === 'detail', goBack)
useBackDismiss(() => view.value === 'shopping', backToMain)
useBackDismiss(() => view.value === 'rezepte', backToMain)

async function handleToggle(id: string, checked: boolean) {
  await toggleChecked(id, checked, user.value?.uid)
}

async function handleDeleteItem(id: string) {
  await deleteItem(id)
}

async function handleAddItem(name: string) {
  if (!activeListId.value) return
  await addItem({ listId: activeListId.value, name })
}

async function handleClearChecked() {
  if (!activeList.value) return
  await clearChecked(activeList.value.id)
  showToast('Erledigte entfernt')
}

async function handleFinish(payload: {
  checkedIds: string[]
  createExpense: boolean
  amountInCents: number
  paidBy: string
}) {
  if (payload.createExpense && payload.amountInCents > 0 && activeList.value) {
    const uid = user.value?.uid ?? payload.paidBy
    const partner = couple.value?.memberIds.find(id => id !== uid) ?? null
    const half = Math.round(payload.amountInCents / 2)
    const owedBy: Record<string, number> = { [uid]: half }
    if (partner) owedBy[partner] = payload.amountInCents - half

    const expenseId = await addExpense({
      title: activeList.value.title,
      amountInCents: payload.amountInCents,
      paidBy: payload.paidBy,
      category: 'food',
      owedBy,
    })

    if (expenseId && payload.checkedIds.length > 0) {
      await linkItemsToExpense(payload.checkedIds, expenseId)
    }
  }

  await clearChecked()
  showToast('Einkauf abgeschlossen')
  view.value = 'shopping'
}

function listItemsFor(listId: string) {
  return items.value.filter(i => i.listId === listId)
}
</script>

<template>
  <div class="einkaufen-page area-food" :class="{ 'is-embedded': embedded }">
    <!-- Shopping mode — fullscreen overlay within the tab -->
    <ShoppingModeView
      v-if="view === 'shopping-mode' && activeList"
      :list="activeList"
      :items="activeItems"
      :couple="couple"
      :currentUserId="user?.uid ?? ''"
      @toggle="handleToggle"
      @finish="handleFinish"
    />

    <!-- List detail -->
    <ShoppingListDetail
      v-else-if="view === 'detail' && activeList"
      :list="activeList"
      :items="activeItems"
      :couple="couple"
      @toggle="handleToggle"
      @delete="handleDeleteItem"
      @add="handleAddItem"
      @startShopping="startShopping"
      @clearChecked="handleClearChecked"
      @back="goBack"
      @renameList="handleRenameList(activeList.id, $event)"
      @deleteList="handleDeleteList(activeList.id)"
    />

    <!-- Rezept-Wiki als gestapelte Unterseite (Zurück-Pfeil). -->
    <div v-else-if="view === 'rezepte'" class="rezepte-sub">
      <div class="sub-head">
        <button type="button" class="sub-back" @click="backToMain" aria-label="Zurück">‹</button>
        <h1 class="sub-title">Rezepte</h1>
      </div>
      <RezeptWikiView
        ref="rezeptWikiRef"
        class="rezepte-body rise-stagger"
        :coupleId="coupleId"
      />
    </div>

    <!-- Einkaufslisten-Übersicht als gestapelte Unterseite. -->
    <div v-else-if="view === 'shopping'" class="shopping-sub">
      <div class="sub-head">
        <button type="button" class="sub-back" @click="backToMain" aria-label="Zurück">‹</button>
        <h1 class="sub-title">Einkaufslisten</h1>
      </div>
      <div v-if="loading" class="loading-msg">Laden…</div>
      <div v-else class="lists-wrap rise-stagger">
        <TransitionGroup tag="div" name="list-add" class="lists-grid">
          <ShoppingListCard
            v-for="list in lists"
            :key="list.id"
            :list="list"
            :items="listItemsFor(list.id)"
            :menuOpen="menuOpenId === list.id"
            @select="selectList(list.id)"
            @toggleMenu="toggleListMenu(list.id)"
            @rename="handleRenameList(list.id, $event)"
            @delete="handleDeleteList(list.id)"
          />
        </TransitionGroup>
        <p v-if="lists.length === 0" class="empty-lists">Noch keine Liste — tippe auf ＋.</p>
      </div>
    </div>

    <!-- Hub: zwei Karten (Einkaufsliste · Rezepte) über dem Wochenplan. -->
    <template v-else>
      <div v-if="!embedded" class="page-header">
        <h1 class="page-title">Einkaufen</h1>
        <ProfileButton />
      </div>

      <div class="kueche-scroll">
        <div class="hub-grid">
          <button type="button" class="hub-tile" @click="openShopping">
            <span class="hub-tile__ico" aria-hidden="true">🛒</span>
            <span class="hub-tile__title">Einkaufsliste</span>
            <span class="hub-tile__meta">{{ lists.length }} {{ lists.length === 1 ? 'Liste' : 'Listen' }}</span>
          </button>
          <button type="button" class="hub-tile" @click="openRezepte">
            <span class="hub-tile__ico" aria-hidden="true">📖</span>
            <span class="hub-tile__title">Rezepte</span>
            <span class="hub-tile__meta">Sammlung &amp; KI</span>
          </button>
        </div>

        <EssensplanView
          class="rise-stagger"
          :coupleId="coupleId"
          :couple="couple"
        />
      </div>
    </template>

    <!-- New list sheet -->
    <BottomSheet :isOpen="showNewList" title="Neue Liste" @close="showNewList = false">
      <input
        v-model="newListName"
        class="app-field"
        type="text"
        placeholder="Listenname"
        @keyup.enter="handleCreateList"
      />
      <button class="btn-primary" :disabled="!newListName.trim()" @click="handleCreateList">
        Erstellen
      </button>
    </BottomSheet>
  </div>
</template>

<style scoped>
.einkaufen-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: calc(var(--safe-top) + 20px) var(--screen-pad) 20px;
}

.page-title {
  font-family: var(--font-headline);
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

/* Hub: zwei Karten über dem Wochenplan. */
.kueche-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

/* 2-Spalten-Kacheln (Einkaufsliste · Rezepte) → eigene Seiten. */
.hub-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 4px var(--screen-pad) 16px;
}
.hub-tile {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 16px;
  border: none;
  border-radius: var(--radius-card);
  background: var(--surface);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  text-align: left;
}
.hub-tile__ico {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-tile);
  display: grid;
  place-items: center;
  font-size: 20px;
  background: var(--accent-tint);
  margin-bottom: 6px;
}
.hub-tile__title {
  font-family: var(--font-headline);
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}
.hub-tile__meta {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-meta);
}

.loading-msg {
  padding: 40px var(--screen-pad);
  font-size: 14px;
  color: var(--text-faint);
  text-align: center;
}

.lists-wrap {
  padding: 0 var(--screen-pad);
}
.lists-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.empty-lists {
  padding: 30px var(--screen-pad);
  text-align: center;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-faint);
}

/* Gestapelte Unterseiten (Rezepte · Einkaufslisten) — Zurück-Pfeil. */
.rezepte-sub,
.shopping-sub {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}
.rezepte-body {
  flex: 1;
  min-height: 0;
}
.sub-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px var(--screen-pad) 10px;
}
.sub-back {
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--surface);
  box-shadow: var(--shadow-card);
  border: none;
  display: grid;
  place-items: center;
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
  cursor: pointer;
  margin-right: 4px;
}
.sub-title {
  font-family: var(--font-headline);
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}
</style>
