import { ref, computed, readonly, watch } from 'vue'
import {
  doc, collection, addDoc, updateDoc, deleteField,
  query, where, getDocs, onSnapshot, serverTimestamp, arrayUnion, writeBatch
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import { useAuth } from './useAuth'
import type { Couple, CouplePlan, ExpenseCategoryDef, IdeaCategoryDef, RecipeCategoryDef } from '@/types'
import { DEFAULT_EXPENSE_CATEGORIES } from '@/utils/expenseCategories'
import { DEFAULT_IDEA_CATEGORIES } from '@/utils/ideen'
import { DEFAULT_RECIPE_CATEGORIES, nextRecipeCategoryColor } from '@/utils/recipeTags'

// Collections, die pro Couple komplett geleert werden, wenn "App zurücksetzen"
// ausgelöst wird — Couple-Doc + Mitgliedschaft selbst bleiben unangetastet.
const RESETTABLE_COLLECTIONS = [
  'chores', 'choreHistory', 'shoppingItems', 'shoppingLists',
  'expenses', 'financeEvents', 'recipes', 'mealPlans', 'bucketListItems',
  'bookings', 'resources'
] as const

const BATCH_LIMIT = 450 // unter dem Firestore-Limit von 500 Operationen/Batch

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous chars (0/O, 1/I)
  let code = ''
  const array = new Uint8Array(6)
  crypto.getRandomValues(array)
  for (const byte of array) {
    code += chars[byte % chars.length]
  }
  return code
}

// Modul-Singleton (wie useAuth): EIN onSnapshot auf das Couple-Doc für die ganze
// App. Vorher legte jeder der 9 Aufrufer einen eigenen Listener an, und
// onScopeDispose riss ihn ab, sobald *irgendeine* der Komponenten unmountete.
// Der Premium-Flag hängt an genau diesem Dokument — er braucht einen Listener,
// der die ganze Session hält.
const couple = ref<Couple | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

let unsubscribe: (() => void) | null = null
let watchedCoupleId: string | null = null

// Auflösen, sobald der erste Snapshot da ist — der Router-Guard muss den
// Premium-Status kennen, bevor er eine premium-pflichtige Route freigibt.
let resolveCoupleReady: () => void
export const coupleReady: Promise<void> = new Promise((resolve) => {
  resolveCoupleReady = resolve
})

// Direkt nach einem Kauf ist der RevenueCat-Webhook noch nicht durch. Ohne das
// hier stünde der Nutzer für ein paar Sekunden wieder vor der Paywall, die er
// gerade bezahlt hat. Der onSnapshot bestätigt es danach dauerhaft.
const optimisticPremium = ref(false)

const plan = computed<CouplePlan>(() => couple.value?.plan ?? 'free')

// Muss zu isPremiumActive() in functions/src/lib/entitlements.ts passen.
const GRACE_MS = 3 * 24 * 60 * 60 * 1000

const isPremium = computed(() => {
  if (optimisticPremium.value) return true
  if (plan.value !== 'premium') return false
  const until = couple.value?.premiumUntil?.toMillis?.() ?? 0
  return until > Date.now() - GRACE_MS
})

export function setOptimisticPremium(value: boolean) {
  optimisticPremium.value = value
}

function watchCouple(coupleId: string) {
  if (watchedCoupleId === coupleId) return
  if (unsubscribe) unsubscribe()
  watchedCoupleId = coupleId

  unsubscribe = onSnapshot(doc(db, 'couples', coupleId), (snap) => {
    if (snap.exists()) {
      couple.value = { id: snap.id, ...snap.data() } as Couple
      // Firestore ist die Wahrheit — sobald sie da ist, gilt sie.
      optimisticPremium.value = false
    }
    resolveCoupleReady()
  })
}

function stopWatching() {
  if (unsubscribe) unsubscribe()
  unsubscribe = null
  watchedCoupleId = null
  couple.value = null
  optimisticPremium.value = false
  resolveCoupleReady()
}

// Ein einziger Watcher für die gesamte App-Laufzeit. Bewusst kein
// onScopeDispose: der Listener gehört dem Modul, nicht der Komponente, die
// useCouple() zufällig als Erste aufgerufen hat.
watch(
  () => useAuth().user.value?.coupleId,
  (coupleId) => {
    if (coupleId) watchCouple(coupleId)
    else stopWatching()
  },
  { immediate: true }
)

export function useCouple() {
  const { user, refreshUser } = useAuth()

  async function createCouple(): Promise<string | null> {
    if (!user.value) return null
    error.value = null
    loading.value = true
    try {
      const inviteCode = generateInviteCode()
      const coupleData = {
        memberIds: [user.value.uid],
        memberNames: { [user.value.uid]: user.value.displayName },
        inviteCode,
        createdAt: serverTimestamp()
      }

      const coupleRef = await addDoc(collection(db, 'couples'), coupleData)

      // Update user doc with coupleId
      await updateDoc(doc(db, 'users', user.value.uid), { coupleId: coupleRef.id })
      await refreshUser()
      watchCouple(coupleRef.id)
      return inviteCode
    } catch (e: any) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function joinCouple(inviteCode: string) {
    if (!user.value) return
    error.value = null
    loading.value = true
    try {
      // Find couple by invite code
      const q = query(collection(db, 'couples'), where('inviteCode', '==', inviteCode.toUpperCase()))
      const snap = await getDocs(q)

      if (snap.empty) {
        error.value = 'Invalid invite code'
        return
      }

      const coupleDoc = snap.docs[0]
      const coupleData = coupleDoc.data()

      if (coupleData.memberIds.length >= 2) {
        error.value = 'This couple already has 2 members'
        return
      }

      if (coupleData.memberIds.includes(user.value.uid)) {
        error.value = 'You are already in this couple'
        return
      }

      // Add user to couple
      await updateDoc(doc(db, 'couples', coupleDoc.id), {
        memberIds: arrayUnion(user.value.uid),
        [`memberNames.${user.value.uid}`]: user.value.displayName
      })

      // Update user doc
      await updateDoc(doc(db, 'users', user.value.uid), { coupleId: coupleDoc.id })
      await refreshUser()
      watchCouple(coupleDoc.id)
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function updateBudget(monthlyBudget: number | null): Promise<boolean> {
    if (!couple.value) return false
    try {
      await updateDoc(doc(db, 'couples', couple.value.id), { monthlyBudget })
      error.value = null
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    }
  }

  async function regenerateInviteCode(): Promise<string | null> {
    if (!couple.value) return null
    try {
      const inviteCode = generateInviteCode()
      await updateDoc(doc(db, 'couples', couple.value.id), { inviteCode })
      error.value = null
      return inviteCode
    } catch (e: any) {
      error.value = e.message
      return null
    }
  }

  // Leerer/`null`-Wert entfernt das Icon-Feld wieder → Fallback auf Initialen.
  async function updateMyIcon(icon: string | null): Promise<boolean> {
    if (!couple.value || !user.value) return false
    try {
      await updateDoc(doc(db, 'couples', couple.value.id), {
        [`memberIcons.${user.value.uid}`]: icon ? icon : deleteField()
      })
      error.value = null
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    }
  }

  async function saveExpenseCategories(next: ExpenseCategoryDef[]): Promise<boolean> {
    if (!couple.value) return false
    try {
      await updateDoc(doc(db, 'couples', couple.value.id), { expenseCategories: next })
      error.value = null
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    }
  }

  function currentExpenseCategories(): ExpenseCategoryDef[] {
    return couple.value?.expenseCategories ?? [...DEFAULT_EXPENSE_CATEGORIES]
  }

  async function addExpenseCategory(name: string, icon: string): Promise<boolean> {
    if (!couple.value) return false
    const cleanName = name.trim()
    if (!cleanName) return false
    return saveExpenseCategories([
      ...currentExpenseCategories(),
      { id: crypto.randomUUID(), name: cleanName, icon },
    ])
  }

  async function updateExpenseCategory(id: string, name: string, icon: string): Promise<boolean> {
    if (!couple.value) return false
    const cleanName = name.trim()
    if (!cleanName) return false
    return saveExpenseCategories(
      currentExpenseCategories().map((c) => (c.id === id ? { ...c, name: cleanName, icon } : c))
    )
  }

  async function removeExpenseCategory(id: string): Promise<boolean> {
    if (!couple.value) return false
    const next = currentExpenseCategories().filter((c) => c.id !== id)
    // Ohne Kategorie könnte keine neue Ausgabe mehr angelegt werden.
    if (next.length === 0) {
      error.value = 'Mindestens eine Kategorie muss übrig bleiben'
      return false
    }
    return saveExpenseCategories(next)
  }

  // Ideen-Kategorien ("Ideen für uns"). Gleiches Muster wie die Ausgaben-
  // Kategorien: Liste auf dem Couple-Doc, absent = DEFAULT_IDEA_CATEGORIES.
  // Gelöschte Kategorien nehmen ihre Ideen NICHT mit — die behalten ihren Wert
  // und werden über categoryDef() als "Ohne Kategorie" angezeigt.
  async function saveIdeaCategories(next: IdeaCategoryDef[]): Promise<boolean> {
    if (!couple.value) return false
    try {
      await updateDoc(doc(db, 'couples', couple.value.id), { ideaCategories: next })
      error.value = null
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    }
  }

  function currentIdeaCategories(): IdeaCategoryDef[] {
    return couple.value?.ideaCategories ?? [...DEFAULT_IDEA_CATEGORIES]
  }

  async function addIdeaCategory(label: string, emoji: string): Promise<boolean> {
    if (!couple.value) return false
    const cleanLabel = label.trim()
    if (!cleanLabel) return false
    return saveIdeaCategories([
      ...currentIdeaCategories(),
      { id: crypto.randomUUID(), label: cleanLabel, emoji },
    ])
  }

  async function updateIdeaCategory(id: string, label: string, emoji: string): Promise<boolean> {
    if (!couple.value) return false
    const cleanLabel = label.trim()
    if (!cleanLabel) return false
    return saveIdeaCategories(
      currentIdeaCategories().map((c) => (c.id === id ? { ...c, label: cleanLabel, emoji } : c))
    )
  }

  async function removeIdeaCategory(id: string): Promise<boolean> {
    if (!couple.value) return false
    const next = currentIdeaCategories().filter((c) => c.id !== id)
    // Ohne Kategorie könnte keine neue Idee mehr angelegt werden.
    if (next.length === 0) {
      error.value = 'Mindestens eine Kategorie muss übrig bleiben'
      return false
    }
    return saveIdeaCategories(next)
  }

  // Rezept-Kategorien (Rezept-Wiki). Gleiches Muster wie oben, mit zwei
  // Unterschieden: die Farbe kommt beim Anlegen aus der Palette (das Formular
  // wählt nur Name + Icon), und es darf auf null Kategorien heruntergehen —
  // Recipe.tags ist optional, ein Rezept ohne Kategorie ist ein gültiges Rezept.
  async function saveRecipeCategories(next: RecipeCategoryDef[]): Promise<boolean> {
    if (!couple.value) return false
    try {
      await updateDoc(doc(db, 'couples', couple.value.id), { recipeCategories: next })
      error.value = null
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    }
  }

  function currentRecipeCategories(): RecipeCategoryDef[] {
    return couple.value?.recipeCategories ?? [...DEFAULT_RECIPE_CATEGORIES]
  }

  async function addRecipeCategory(label: string, emoji: string): Promise<boolean> {
    if (!couple.value) return false
    const cleanLabel = label.trim()
    if (!cleanLabel) return false
    const current = currentRecipeCategories()
    return saveRecipeCategories([
      ...current,
      { id: crypto.randomUUID(), label: cleanLabel, emoji, color: nextRecipeCategoryColor(current.length) },
    ])
  }

  async function updateRecipeCategory(id: string, label: string, emoji: string): Promise<boolean> {
    if (!couple.value) return false
    const cleanLabel = label.trim()
    if (!cleanLabel) return false
    return saveRecipeCategories(
      currentRecipeCategories().map((c) => (c.id === id ? { ...c, label: cleanLabel, emoji } : c))
    )
  }

  async function removeRecipeCategory(id: string): Promise<boolean> {
    if (!couple.value) return false
    return saveRecipeCategories(currentRecipeCategories().filter((c) => c.id !== id))
  }

  // Löscht alle Aufgaben/Einkäufe/Ausgaben/Rezepte/etc. der Couple, aber NICHT
  // das Couple-Doc oder die Mitgliedschaft selbst — "App zurücksetzen", nicht
  // "Konto/Beziehung löschen".
  async function resetCoupleData(): Promise<boolean> {
    if (!couple.value) return false
    const coupleId = couple.value.id

    try {
      for (const collectionName of RESETTABLE_COLLECTIONS) {
        const q = query(collection(db, collectionName), where('coupleId', '==', coupleId))
        const snap = await getDocs(q)
        const docs = snap.docs

        for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
          const batch = writeBatch(db)
          for (const d of docs.slice(i, i + BATCH_LIMIT)) {
            batch.delete(d.ref)
          }
          await batch.commit()
        }
      }
      error.value = null
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    }
  }

  return {
    couple,
    loading: readonly(loading),
    error: readonly(error),
    plan,
    isPremium,
    createCouple,
    joinCouple,
    watchCouple,
    updateBudget,
    regenerateInviteCode,
    updateMyIcon,
    addExpenseCategory,
    updateExpenseCategory,
    removeExpenseCategory,
    addIdeaCategory,
    updateIdeaCategory,
    removeIdeaCategory,
    addRecipeCategory,
    updateRecipeCategory,
    removeRecipeCategory,
    resetCoupleData
  }
}
