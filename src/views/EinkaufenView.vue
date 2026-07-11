<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import { useShopping } from '@/composables/useShopping'
import { useExpenses } from '@/composables/useExpenses'
import { useTabSwipe } from '@/composables/useTabSwipe'
import { showToast } from '@/composables/useToast'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import FabButton from '@/components/ui/FabButton.vue'
import SegmentToggle from '@/components/ui/SegmentToggle.vue'
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

type Tab = 'liste' | 'wochenplan' | 'rezepte'
// Einkaufsliste ist der initiale Tab und sitzt ganz links.
const tab = ref<Tab>('liste')
const tabOptions = [
  { label: 'Einkaufsliste', value: 'liste' },
  { label: 'Wochenplan', value: 'wochenplan' },
  { label: 'Rezepte', value: 'rezepte' },
]

const rezeptWikiRef = ref<InstanceType<typeof RezeptWikiView> | null>(null)

// Reihenfolge muss die sichtbare Tab-Reihenfolge widerspiegeln.
const tabOrder: Tab[] = ['liste', 'wochenplan', 'rezepte']
const { onTouchStart, onTouchMove, onTouchEnd } = useTabSwipe(tabOrder, tab)

type View = 'lists' | 'detail' | 'shopping-mode'
const view = ref<View>('lists')

const showNewList = ref(false)
const newListName = ref('')

async function handleCreateList() {
  if (!newListName.value.trim()) return
  await createList(newListName.value.trim())
  showToast('Liste erstellt')
  newListName.value = ''
  showNewList.value = false
}

function selectList(id: string) {
  setActiveList(id)
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
  <div class="einkaufen-page area-einkauf">
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
      @toggle="handleToggle"
      @delete="handleDeleteItem"
      @add="handleAddItem"
      @startShopping="startShopping"
      @back="goBack"
      @renameList="handleRenameList(activeList.id, $event)"
      @deleteList="handleDeleteList(activeList.id)"
    />

    <!-- List overview + Wochenplan/Rezepte tabs -->
    <template v-else>
      <div class="page-header">
        <h1 class="page-title">Einkaufen</h1>
      </div>
      <div class="tab-bar-wrap">
        <SegmentToggle v-model="tab" :options="tabOptions" class="tab-bar" />
      </div>

      <!-- Die Touch-Handler sitzen auf .tab-area (nicht nur .tab-content), weil
           die FabButtons als Geschwister-Elemente von .tab-content gerendert
           werden (siehe Kommentar unten) — Touch-Events bubblen nicht zwischen
           Geschwistern, ein auf dem FAB startender Swipe würde sonst nicht
           erkannt. touchcancel zählt wie touchend, siehe useTabSwipe. -->
      <div
        class="tab-area"
        @touchstart.passive="onTouchStart"
        @touchmove.passive="onTouchMove"
        @touchend.passive="onTouchEnd"
        @touchcancel.passive="onTouchEnd"
      >
        <div class="tab-content">
          <Transition name="tab-fade" mode="out-in">
            <div v-if="tab === 'liste'" key="liste" class="page-container">
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
              :coupleId="coupleId"
              :couple="couple"
            />

            <RezeptWikiView
              v-else
              key="rezepte"
              ref="rezeptWikiRef"
              :coupleId="coupleId"
            />
          </Transition>
        </div>

        <!-- Außerhalb der Transition (verhindert das FAB-Slow-Slide-Problem,
             siehe unten), aber innerhalb der Swipe-Zone. -->
        <FabButton v-if="tab === 'liste'" label="Neue Liste" @click="showNewList = true" />
        <FabButton
          v-else-if="tab === 'rezepte' && !rezeptWikiRef?.showForm"
          label="Rezept hinzufügen"
          @click="rezeptWikiRef?.openCreateForm()"
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
  padding: 9px 0;
  font-size: 12px;
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
