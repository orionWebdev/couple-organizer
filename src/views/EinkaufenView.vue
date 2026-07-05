<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import { useShopping } from '@/composables/useShopping'
import { useExpenses } from '@/composables/useExpenses'
import { useMealPlan } from '@/composables/useMealPlan'
import { showToast } from '@/composables/useToast'
import { dateKey } from '@/utils/mealplan'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import FabButton from '@/components/ui/FabButton.vue'
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

// Vorschau-Werte für die beiden Link-Cards (Essensplan/Rezepte)
const { week, recipes } = useMealPlan(coupleId)

const todayRecipeTitle = computed(() => {
  const today = dateKey(new Date())
  return week.value.find((d) => d.dateKey === today)?.recipe?.title ?? null
})

const planPreviewText = computed(() =>
  todayRecipeTitle.value ? `Heute: ${todayRecipeTitle.value}` : 'Diese Woche planen'
)

const wikiPreviewText = computed(() =>
  recipes.value.length > 0 ? `${recipes.value.length} Rezept${recipes.value.length === 1 ? '' : 'e'} gespeichert` : 'Eure Sammlung starten'
)

type View = 'lists' | 'detail' | 'shopping-mode' | 'essensplan' | 'wiki'
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

    <!-- Essensplan -->
    <EssensplanView
      v-else-if="view === 'essensplan'"
      :coupleId="coupleId"
      :couple="couple"
      @back="view = 'lists'"
    />

    <!-- Rezept-Wiki -->
    <RezeptWikiView
      v-else-if="view === 'wiki'"
      :coupleId="coupleId"
      @back="view = 'lists'"
    />

    <!-- List overview -->
    <template v-else>
      <div class="page-header">
        <h1 class="page-title">Einkaufen</h1>
      </div>

      <div class="page-container">
        <div class="link-cards">
          <button class="link-card" @click="view = 'essensplan'">
            <span class="link-card-icon">🍽️</span>
            <div class="link-card-text">
              <span class="link-card-title">Essensplan <span class="link-card-chevron">›</span></span>
              <span class="link-card-sub">{{ planPreviewText }}</span>
            </div>
          </button>
          <button class="link-card" @click="view = 'wiki'">
            <span class="link-card-icon">📖</span>
            <div class="link-card-text">
              <span class="link-card-title">Rezepte <span class="link-card-chevron">›</span></span>
              <span class="link-card-sub">{{ wikiPreviewText }}</span>
            </div>
          </button>
        </div>

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

      <FabButton label="Neue Liste" @click="showNewList = true" />
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

/* Responsiver Container für alles unterhalb des Headers, damit die
   50/50-Cards auf breiten Screens nicht randlos auseinanderlaufen. */
.page-container {
  width: 100%;
  max-width: 880px;
  margin: 0 auto;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.link-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 0 var(--screen-pad) 16px;
}

.link-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  min-width: 0;
  padding: 14px;
  background: var(--einkauf-tint-strong);
  border: 1px solid color-mix(in srgb, var(--einkauf) 30%, transparent);
  border-radius: var(--radius-card-lg);
  cursor: pointer;
  text-align: left;
}

.link-card:active {
  background: var(--einkauf-tint);
}

.link-card-icon {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--einkauf);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.link-card-text {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.link-card-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.link-card-sub {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.link-card-chevron {
  font-size: 18px;
  color: color-mix(in srgb, var(--einkauf) 70%, var(--text-faint));
  flex-shrink: 0;
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
  padding: 0 var(--screen-pad) 100px;
}

.lists-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
