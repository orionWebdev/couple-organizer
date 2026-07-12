import { ref, onScopeDispose, readonly } from 'vue'
import {
  doc, collection, addDoc, updateDoc, deleteField,
  query, where, getDocs, onSnapshot, serverTimestamp, arrayUnion, writeBatch
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import { useAuth } from './useAuth'
import type { Couple, ExpenseCategoryDef } from '@/types'
import { DEFAULT_EXPENSE_CATEGORIES } from '@/utils/expenseCategories'

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

export function useCouple() {
  const { user, refreshUser } = useAuth()
  const couple = ref<Couple | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  let unsubscribe: (() => void) | null = null

  // Listen to couple document in realtime
  function watchCouple(coupleId: string) {
    if (unsubscribe) unsubscribe()
    unsubscribe = onSnapshot(doc(db, 'couples', coupleId), (snap) => {
      if (snap.exists()) {
        couple.value = { id: snap.id, ...snap.data() } as Couple
      }
    })
  }

  // Start watching if user already has a coupleId
  if (user.value?.coupleId) {
    watchCouple(user.value.coupleId)
  }

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

  async function addExpenseCategory(name: string, icon: string): Promise<boolean> {
    if (!couple.value) return false
    const cleanName = name.trim()
    if (!cleanName) return false

    try {
      const current = couple.value.expenseCategories ?? [...DEFAULT_EXPENSE_CATEGORIES]
      const next: ExpenseCategoryDef[] = [...current, { id: crypto.randomUUID(), name: cleanName, icon }]
      await updateDoc(doc(db, 'couples', couple.value.id), { expenseCategories: next })
      error.value = null
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    }
  }

  async function removeExpenseCategory(id: string): Promise<boolean> {
    if (!couple.value) return false

    try {
      const current = couple.value.expenseCategories ?? [...DEFAULT_EXPENSE_CATEGORIES]
      const next = current.filter((c) => c.id !== id)
      if (next.length === 0) {
        error.value = 'Mindestens eine Kategorie muss übrig bleiben'
        return false
      }
      await updateDoc(doc(db, 'couples', couple.value.id), { expenseCategories: next })
      error.value = null
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    }
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

  onScopeDispose(() => {
    if (unsubscribe) unsubscribe()
  })

  return {
    couple,
    loading: readonly(loading),
    error: readonly(error),
    createCouple,
    joinCouple,
    watchCouple,
    updateBudget,
    regenerateInviteCode,
    updateMyIcon,
    addExpenseCategory,
    removeExpenseCategory,
    resetCoupleData
  }
}
