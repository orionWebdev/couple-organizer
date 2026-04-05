import { computed, onScopeDispose, readonly, ref, type Ref, watch } from 'vue'
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import { useAuth } from './useAuth'
import type { MealPlan, MealPlanDayKey, MealPlanDays } from '@/types'

const dayFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
})

export const MEAL_PLAN_DAYS: Array<{ key: MealPlanDayKey; label: string }> = [
  { key: 'monday', label: 'Montag' },
  { key: 'tuesday', label: 'Dienstag' },
  { key: 'wednesday', label: 'Mittwoch' },
  { key: 'thursday', label: 'Donnerstag' },
  { key: 'friday', label: 'Freitag' },
  { key: 'saturday', label: 'Samstag' },
  { key: 'sunday', label: 'Sonntag' }
]

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function createWeekKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function getStartOfWeek(date: Date): Date {
  const start = new Date(date)
  const day = start.getDay()
  const diff = day === 0 ? -6 : 1 - day
  start.setDate(start.getDate() + diff)
  start.setHours(0, 0, 0, 0)
  return start
}

function createEmptyDays(): MealPlanDays {
  return {
    monday: null,
    tuesday: null,
    wednesday: null,
    thursday: null,
    friday: null,
    saturday: null,
    sunday: null
  }
}

function getPlanDocumentId(coupleId: string, weekKey: string): string {
  return `${coupleId}_${weekKey}`
}

export function useMealPlan(coupleId: Ref<string | null>) {
  const { user } = useAuth()
  const selectedWeekStart = ref(getStartOfWeek(new Date()))
  const mealPlan = ref<MealPlan | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)
  let unsubscribe: (() => void) | null = null

  const weekKey = computed(() => createWeekKey(selectedWeekStart.value))
  const days = computed<MealPlanDays>(() => mealPlan.value?.days ?? createEmptyDays())

  const weekLabel = computed(() => {
    const start = selectedWeekStart.value
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return `${dayFormatter.format(start)} - ${dayFormatter.format(end)}`
  })

  function startListening(couple: string, selectedKey: string) {
    if (unsubscribe) unsubscribe()
    loading.value = true
    error.value = null

    const weekQuery = query(
      collection(db, 'mealPlans'),
      where('coupleId', '==', couple),
      where('weekKey', '==', selectedKey)
    )

    unsubscribe = onSnapshot(
      weekQuery,
      (snap) => {
        if (snap.empty) {
          mealPlan.value = null
          loading.value = false
          return
        }

        const firstDoc = snap.docs[0]
        mealPlan.value = {
          id: firstDoc.id,
          ...firstDoc.data()
        } as MealPlan
        loading.value = false
      },
      (err) => {
        console.error('Meal plan listener error:', err)
        error.value = err.message
        loading.value = false
      }
    )
  }

  watch([coupleId, weekKey], ([id, selectedKey]) => {
    if (!id) {
      mealPlan.value = null
      loading.value = false
      return
    }
    startListening(id, selectedKey)
  }, { immediate: true })

  function shiftWeek(offsetInWeeks: number) {
    const nextWeek = new Date(selectedWeekStart.value)
    nextWeek.setDate(nextWeek.getDate() + offsetInWeeks * 7)
    selectedWeekStart.value = getStartOfWeek(nextWeek)
  }

  function goToCurrentWeek() {
    selectedWeekStart.value = getStartOfWeek(new Date())
  }

  async function setRecipeForDay(day: MealPlanDayKey, recipeId: string | null) {
    if (!coupleId.value || !user.value) return

    try {
      const selectedKey = weekKey.value
      const planDocRef = doc(db, 'mealPlans', mealPlan.value?.id || getPlanDocumentId(coupleId.value, selectedKey))
      const updatedDays = {
        ...(mealPlan.value?.days ?? createEmptyDays()),
        [day]: recipeId
      }

      if (mealPlan.value) {
        await updateDoc(planDocRef, {
          days: updatedDays,
          updatedAt: serverTimestamp()
        })
        return
      }

      await setDoc(planDocRef, {
        coupleId: coupleId.value,
        weekKey: selectedKey,
        days: updatedDays,
        createdBy: user.value.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    } catch (err: any) {
      console.error('Failed to update meal plan:', err)
      error.value = err.message
    }
  }

  onScopeDispose(() => {
    if (unsubscribe) unsubscribe()
  })

  return {
    mealPlan: readonly(mealPlan),
    loading: readonly(loading),
    error: readonly(error),
    selectedWeekStart: readonly(selectedWeekStart),
    weekKey,
    weekLabel,
    days,
    shiftWeek,
    goToCurrentWeek,
    setRecipeForDay
  }
}
