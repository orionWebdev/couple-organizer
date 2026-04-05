import { ref, computed, onScopeDispose, readonly, type Ref, watch } from 'vue'
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  writeBatch
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import { useAuth } from './useAuth'
import type { RecipeIngredient, ShoppingItem, ShoppingList } from '@/types'

interface AddShoppingItemInput {
  listId: string
  name: string
  category: string
}

interface ShoppingFromMealPlanResult {
  added: number
  skipped: number
  totalMerged: number
}

function toMillis(timestamp: unknown): number {
  if (timestamp && typeof timestamp === 'object' && 'toMillis' in timestamp && typeof (timestamp as any).toMillis === 'function') {
    return (timestamp as any).toMillis()
  }
  return 0
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase()
}

function formatAmount(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)))
}

function buildMergedIngredientName(ingredient: RecipeIngredient): string {
  const normalizedName = ingredient.name.trim()
  if (!normalizedName) return ''

  if (!ingredient.amount || ingredient.amount <= 0) {
    return normalizedName
  }

  const unit = ingredient.unit.trim()
  if (!unit) {
    return `${normalizedName} (${formatAmount(ingredient.amount)})`
  }

  return `${normalizedName} (${formatAmount(ingredient.amount)} ${unit})`
}

function mapShoppingItem(data: Record<string, any>, id: string): ShoppingItem {
  return {
    id,
    coupleId: data.coupleId,
    listId: data.listId || `${data.coupleId}_default`,
    name: data.name || '',
    category: data.category || 'Sonstiges',
    checked: data.checked ?? data.bought ?? false,
    addedBy: data.addedBy || '',
    source: data.source || 'manual',
    sourceWeekKey: data.sourceWeekKey ?? null,
    expenseId: data.expenseId ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt || data.createdAt
  }
}

function mapShoppingList(data: Record<string, any>, id: string): ShoppingList {
  return {
    id,
    coupleId: data.coupleId,
    title: data.title || 'Unbenannte Liste',
    archived: data.archived ?? false,
    createdBy: data.createdBy || '',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt || data.createdAt
  }
}

export function useShopping(coupleId: Ref<string | null>) {
  const { user } = useAuth()
  const lists = ref<ShoppingList[]>([])
  const items = ref<ShoppingItem[]>([])
  const activeListId = ref<string | null>(null)
  const loadingLists = ref(true)
  const loadingItems = ref(true)
  const error = ref<string | null>(null)
  let listsUnsubscribe: (() => void) | null = null
  let itemsUnsubscribe: (() => void) | null = null
  let creatingDefaultList = false

  const activeLists = computed(() => lists.value.filter((list) => !list.archived))
  const archivedLists = computed(() => lists.value.filter((list) => list.archived))

  const activeList = computed(() => {
    if (!activeListId.value) return null
    return activeLists.value.find((list) => list.id === activeListId.value) || null
  })

  const allItems = computed(() => {
    return [...items.value].sort((a, b) => {
      if (a.checked !== b.checked) return a.checked ? 1 : -1
      return toMillis(b.createdAt) - toMillis(a.createdAt)
    })
  })

  const activeItems = computed(() => {
    if (!activeListId.value) return []
    return allItems.value.filter((item) => item.listId === activeListId.value)
  })

  const loading = computed(() => loadingLists.value || loadingItems.value)

  async function ensureDefaultListExists(id: string) {
    if (creatingDefaultList || !user.value) return
    creatingDefaultList = true
    try {
      await setDoc(doc(db, 'shoppingLists', `${id}_default`), {
        coupleId: id,
        title: 'Standard',
        archived: false,
        createdBy: user.value.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true })
    } catch (err: any) {
      console.error('Failed to ensure default shopping list:', err)
      error.value = err.message
    } finally {
      creatingDefaultList = false
    }
  }

  function startListeningToLists(id: string) {
    if (listsUnsubscribe) listsUnsubscribe()
    loadingLists.value = true
    error.value = null

    const q = query(
      collection(db, 'shoppingLists'),
      where('coupleId', '==', id),
      orderBy('updatedAt', 'desc')
    )

    listsUnsubscribe = onSnapshot(
      q,
      (snap) => {
        lists.value = snap.docs.map((listDoc) => mapShoppingList(listDoc.data(), listDoc.id))

        if (lists.value.length === 0) {
          void ensureDefaultListExists(id)
        }

        if (!activeListId.value || !activeLists.value.some((list) => list.id === activeListId.value)) {
          activeListId.value = activeLists.value[0]?.id || null
        }

        loadingLists.value = false
      },
      (err) => {
        console.error('Shopping lists listener error:', err)
        error.value = err.message
        loadingLists.value = false
      }
    )
  }

  function startListeningToItems(id: string) {
    if (itemsUnsubscribe) itemsUnsubscribe()
    loadingItems.value = true
    error.value = null

    const q = query(
      collection(db, 'shoppingItems'),
      where('coupleId', '==', id),
      orderBy('createdAt', 'desc')
    )

    itemsUnsubscribe = onSnapshot(
      q,
      (snap) => {
        items.value = snap.docs.map((itemDoc) => mapShoppingItem(itemDoc.data(), itemDoc.id))
        loadingItems.value = false
      },
      (err) => {
        console.error('Shopping items listener error:', err)
        error.value = err.message
        loadingItems.value = false
      }
    )
  }

  watch(coupleId, (id) => {
    if (!id) {
      lists.value = []
      items.value = []
      activeListId.value = null
      loadingLists.value = false
      loadingItems.value = false
      return
    }

    startListeningToLists(id)
    startListeningToItems(id)
  }, { immediate: true })

  async function createList(title: string) {
    if (!coupleId.value || !user.value) return
    const cleanTitle = title.trim()
    if (!cleanTitle) return

    try {
      await addDoc(collection(db, 'shoppingLists'), {
        coupleId: coupleId.value,
        title: cleanTitle,
        archived: false,
        createdBy: user.value.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    } catch (err: any) {
      console.error('Failed to create shopping list:', err)
      error.value = err.message
    }
  }

  async function archiveList(listId: string) {
    try {
      await updateDoc(doc(db, 'shoppingLists', listId), {
        archived: true,
        updatedAt: serverTimestamp()
      })
    } catch (err: any) {
      console.error('Failed to archive shopping list:', err)
      error.value = err.message
    }
  }

  async function addItem(input: AddShoppingItemInput) {
    if (!coupleId.value || !user.value) return
    const cleanName = input.name.trim()
    const cleanCategory = input.category.trim()
    if (!cleanName || !cleanCategory) return

    try {
      await addDoc(collection(db, 'shoppingItems'), {
        coupleId: coupleId.value,
        listId: input.listId,
        name: cleanName,
        category: cleanCategory,
        checked: false,
        addedBy: user.value.uid,
        source: 'manual',
        sourceWeekKey: null,
        expenseId: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      await updateDoc(doc(db, 'shoppingLists', input.listId), {
        updatedAt: serverTimestamp()
      })
    } catch (err: any) {
      console.error('Failed to add shopping item:', err)
      error.value = err.message
    }
  }

  async function toggleChecked(id: string, checked: boolean) {
    try {
      await updateDoc(doc(db, 'shoppingItems', id), {
        checked,
        updatedAt: serverTimestamp()
      })
    } catch (err: any) {
      console.error('Failed to toggle shopping item:', err)
      error.value = err.message
    }
  }

  async function deleteItem(id: string) {
    try {
      await deleteDoc(doc(db, 'shoppingItems', id))
    } catch (err: any) {
      console.error('Failed to delete shopping item:', err)
      error.value = err.message
    }
  }

  async function clearChecked(listId = activeListId.value) {
    if (!listId) return
    try {
      const checkedItems = activeItems.value.filter((item) => item.checked)
      await Promise.all(checkedItems.map((item) => deleteDoc(doc(db, 'shoppingItems', item.id))))
    } catch (err: any) {
      console.error('Failed to clear checked shopping items:', err)
      error.value = err.message
    }
  }

  async function generateItemsFromIngredients(
    listId: string,
    ingredients: RecipeIngredient[],
    weekKey: string
  ): Promise<ShoppingFromMealPlanResult> {
    if (!coupleId.value || !user.value) {
      return { added: 0, skipped: 0, totalMerged: 0 }
    }

    const merged = new Map<string, RecipeIngredient>()
    for (const ingredient of ingredients) {
      const name = ingredient.name.trim()
      if (!name) continue

      const amount = Number(ingredient.amount) || 0
      const unit = ingredient.unit.trim()
      const mergeKey = `${normalizeText(name)}__${normalizeText(unit)}`

      const existing = merged.get(mergeKey)
      if (!existing) {
        merged.set(mergeKey, { name, amount, unit })
        continue
      }

      existing.amount += amount
    }

    const existingNames = new Set(
      items.value
        .filter((item) => item.listId === listId && !item.checked)
        .map((item) => normalizeText(item.name))
    )

    let added = 0
    let skipped = 0
    const batch = writeBatch(db)

    for (const mergedIngredient of merged.values()) {
      const name = buildMergedIngredientName(mergedIngredient)
      if (!name) continue

      if (existingNames.has(normalizeText(name))) {
        skipped += 1
        continue
      }

      const itemRef = doc(collection(db, 'shoppingItems'))
      batch.set(itemRef, {
        coupleId: coupleId.value,
        listId,
        name,
        category: 'Lebensmittel',
        checked: false,
        addedBy: user.value.uid,
        source: 'mealPlan',
        sourceWeekKey: weekKey,
        expenseId: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      added += 1
      existingNames.add(normalizeText(name))
    }

    if (added > 0) {
      batch.update(doc(db, 'shoppingLists', listId), {
        updatedAt: serverTimestamp()
      })
      await batch.commit()
    }

    return {
      added,
      skipped,
      totalMerged: merged.size
    }
  }

  async function linkItemsToExpense(itemIds: string[], expenseId: string) {
    if (itemIds.length === 0) return
    try {
      const batch = writeBatch(db)
      for (const itemId of itemIds) {
        batch.update(doc(db, 'shoppingItems', itemId), {
          checked: true,
          expenseId,
          updatedAt: serverTimestamp()
        })
      }
      await batch.commit()
    } catch (err: any) {
      console.error('Failed to link shopping items to expense:', err)
      error.value = err.message
    }
  }

  function setActiveList(id: string) {
    activeListId.value = id
  }

  onScopeDispose(() => {
    if (listsUnsubscribe) listsUnsubscribe()
    if (itemsUnsubscribe) itemsUnsubscribe()
  })

  return {
    lists: readonly(activeLists),
    archivedLists: readonly(archivedLists),
    activeListId: readonly(activeListId),
    activeList,
    items: allItems,
    activeItems,
    loading,
    error: readonly(error),
    setActiveList,
    createList,
    archiveList,
    addItem,
    toggleChecked,
    deleteItem,
    clearChecked,
    generateItemsFromIngredients,
    linkItemsToExpense
  }
}
