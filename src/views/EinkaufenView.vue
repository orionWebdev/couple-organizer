<script setup lang="ts">
import { ref, computed, watch, onScopeDispose } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import { useShopping } from '@/composables/useShopping'
import { useExpenses } from '@/composables/useExpenses'
import { useTabSwipe } from '@/composables/useTabSwipe'
import { setFabAction } from '@/composables/useFab'
import { showToast } from '@/composables/useToast'
import { showPaywall } from '@/composables/usePaywall'
import { useBackDismiss } from '@/composables/useBackButton'
import { usePersistedRef, DRAFT_TTL_MS } from '@/composables/usePersistedRef'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import SegmentToggle from '@/components/ui/SegmentToggle.vue'
import ProfileButton from '@/components/ui/ProfileButton.vue'
import ShoppingListCard from '@/components/shopping/ShoppingListCard.vue'
import ShoppingListDetail from '@/components/shopping/ShoppingListDetail.vue'
import ShoppingModeView from '@/components/shopping/ShoppingModeView.vue'
import EssensplanView from '@/components/mealplan/EssensplanView.vue'
import RezeptWikiView from '@/components/mealplan/RezeptWikiView.vue'

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

type Tab = 'wochenplan' | 'liste' | 'rezepte'
// Der Nav-Slot heißt "Essen" und landet deshalb auf dem Wochenplan; die
// Einkaufsliste ist von hier einen Tap entfernt.
// Überlebt den Android-Kaltstart: gewähltes Segment ohne TTL (harmlos), die
// In-Page-Unteransicht + zuletzt geöffnete Liste mit TTL (siehe Restore unten).
const tab = usePersistedRef<Tab>('einkaufen.tab', 'wochenplan')
const tabOptions = [
  { label: 'Wochenplan', value: 'wochenplan' },
  { label: 'Einkaufsliste', value: 'liste' },
  { label: 'Rezepte', value: 'rezepte' },
]

const rezeptWikiRef = ref<InstanceType<typeof RezeptWikiView> | null>(null)

// Reihenfolge muss die sichtbare Tab-Reihenfolge widerspiegeln.
const tabOrder: Tab[] = ['wochenplan', 'liste', 'rezepte']
const { onTouchStart, onTouchMove, onTouchEnd } = useTabSwipe(tabOrder, tab)

type View = 'lists' | 'detail' | 'shopping-mode'
const view = usePersistedRef<View>('einkaufen.view', 'lists', { ttlMs: DRAFT_TTL_MS })

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
      view.value = 'lists'
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

// Globaler FAB (App-Shell): nur in der Listenübersicht (nicht in Detail/
// Einkaufsmodus). Liste → neue Liste, Rezepte → neues Rezept (versteckt,
// solange das Rezept-Formular ohnehin offen ist). Wochenplan hat kein Add.
const fabAction = computed(() => {
  if (view.value !== 'lists') return null
  if (tab.value === 'liste') return { label: 'Neue Liste', handler: handleNewListTap }
  if (tab.value === 'rezepte' && !rezeptWikiRef.value?.showForm) {
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
  if (wasActive) view.value = 'lists'
}

function goBack() {
  view.value = 'lists'
}

function startShopping() {
  view.value = 'shopping-mode'
}

// Listendetail und Einkaufsmodus sind In-Page-Unteransichten ohne eigene Route.
// Der Einkaufsmodus liegt "über" dem Detail, also muss er zuerst registriert
// werden — sonst landet man aus dem Einkaufsmodus direkt auf der Listenübersicht.
useBackDismiss(() => view.value === 'detail', goBack)
useBackDismiss(() => view.value === 'shopping-mode', () => { view.value = 'detail' })

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
  view.value = 'lists'
}

function listItemsFor(listId: string) {
  return items.value.filter(i => i.listId === listId)
}
</script>

<template>
  <div class="einkaufen-page area-food">
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

    <!-- List overview + Wochenplan/Rezepte tabs -->
    <template v-else>
      <div class="page-header">
        <h1 class="page-title">Einkaufen</h1>
        <ProfileButton />
      </div>
      <div class="tab-bar-wrap">
        <SegmentToggle v-model="tab" :options="tabOptions" class="tab-bar" />
      </div>

      <!-- Touch-Handler auf .tab-area für den Tab-Swipe; touchcancel zählt wie
           touchend (siehe useTabSwipe). Der frühere Inline-FAB ist jetzt global
           im App-Shell (useFab). -->
      <div
        class="tab-area"
        @touchstart.passive="onTouchStart"
        @touchmove.passive="onTouchMove"
        @touchend.passive="onTouchEnd"
        @touchcancel.passive="onTouchEnd"
      >
        <div class="tab-content">
          <Transition name="tab-fade" mode="out-in">
            <div v-if="tab === 'liste'" key="liste" class="page-container rise-stagger">
              <div v-if="loading" class="loading-msg">Laden…</div>
              <div v-else class="lists-wrap">
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
              </div>
            </div>

            <EssensplanView
              v-else-if="tab === 'wochenplan'"
              key="wochenplan"
              class="rise-stagger"
              :coupleId="coupleId"
              :couple="couple"
            />

            <RezeptWikiView
              v-else
              key="rezepte"
              ref="rezeptWikiRef"
              class="rise-stagger"
              :coupleId="coupleId"
            />
          </Transition>
        </div>
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

.tab-bar-wrap {
  padding: 0 var(--screen-pad);
  margin-bottom: 20px;
}

.tab-bar {
  display: flex;
  width: 100%;
  border-radius: 12px;
}

.tab-bar :deep(.seg-btn) {
  padding: 13px 0;
  font-size: 13px;
}

.tab-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  touch-action: pan-y;
}

.tab-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* Sanfter Übergang beim Tab-Wechsel (gleiches Muster wie HaushaltView) */
.tab-fade-enter-active {
  transition: opacity 220ms var(--ease-standard), transform 220ms var(--ease-standard);
}

.tab-fade-leave-active {
  transition: opacity 140ms var(--ease-in), transform 140ms var(--ease-in);
}

.tab-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.tab-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Responsiver Container für die Listenübersicht, damit sie auf breiten
   Screens nicht randlos auseinanderläuft. */
.page-container {
  width: 100%;
  max-width: 880px;
  margin: 0 auto;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.loading-msg {
  padding: 40px var(--screen-pad);
  font-size: 14px;
  color: var(--text-faint);
  text-align: center;
}

.lists-wrap {
  flex: 1;
  overflow-y: auto;
  /* Nur vertikal scrollen — horizontale Gesten gehören dem Tab-Swipe. */
  touch-action: pan-y;
  padding: 0 var(--screen-pad) 100px;
}

.lists-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
