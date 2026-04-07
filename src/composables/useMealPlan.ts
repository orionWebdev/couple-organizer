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
import type { MealPlan, MealPlanDayKey, MealPlanDayMeals, MealPlanDays, MealType } from '@/types'

const dayFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
})

export const MEAL_PLAN_DAYS: Array<{ key: MealPlanDayKey; label: string; short: string }> = [
  { key: 'monday',    label: 'Montag',     short: 'Mo' },
  { key: 'tuesday',   label: 'Dienstag',   short: 'Di' },
  { key: 'wednesday', label: 'Mittwoch',   short: 'Mi' },
  { key: 'thursday',  label: 'Donnerstag', short: 'Do' },
  { key: 'friday',    label: 'Freitag',    short: 'Fr' },
  { key: 'saturday',  label: 'Samstag',    short: 'Sa' },
  { key: 'sunday',    label: 'Sonntag',    short: 'So' }
]

export const MEAL_TYPES: Array<{ key: MealType; label: string; icon: string }> = [
  { key: 'breakfast', label: 'Frühstück',  icon: '🌅' },
  { key: 'lunch',     label: 'Mittagessen', icon: '☀️'  },
  { key: 'dinner',    label: 'Abendessen',  icon: '🌙' }
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

function emptyDayMeals(): MealPlanDayMeals {
  return { breakfast: null, lunch: null, dinner: null }
}

function normalizeDays(rawDays: any): MealPlanDays {
  const result = {} as MealPlanDays
  for (const { key } of MEAL_PLAN_DAYS) {
    const val = rawDays?.[key]
    if (!val || typeof val === 'string') {
      // Old format: single string or null → treat as dinner for backward compat
      result[key] = { breakfast: null, lunch: null, dinner: typeof val === 'string' ? val : null }
    } else {
      result[key] = {
        breakfast: val.breakfast ?? null,
        lunch: val.lunch ?? null,
        dinner: val.dinner ?? null
      }
    }
  }
  return result
}

function createEmptyDays(): MealPlanDays {
  const result = {} as MealPlanDays
  for (const { key } of MEAL_PLAN_DAYS) {
    result[key] = emptyDayMeals()
  }
  return result
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
  const days = computed<MealPlanDays>(() =>
    mealPlan.value?.days ? normalizeDays(mealPlan.value.days) : createEmptyDays()
  )

  const weekLabel = computed(() => {
    const start = selectedWeekStart.value
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return `${dayFormatter.format(start)} – ${dayFormatter.format(end)}`
  })

  const filledSlots = computed(() => {
    let count = 0
    for (const { key } of MEAL_PLAN_DAYS) {
      const d = days.value[key]
      if (d.breakfast) count++
      if (d.lunch) count++
      if (d.dinner) count++
    }
    return count
  })

  const totalSlots = MEAL_PLAN_DAYS.length * MEAL_TYPES.length // 21

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
    const next = new Date(selectedWeekStart.value)
    next.setDate(next.getDate() + offsetInWeeks * 7)
    selectedWeekStart.value = getStartOfWeek(next)
  }

  function goToCurrentWeek() {
    selectedWeekStart.value = getStartOfWeek(new Date())
  }

  async function setMealForDay(day: MealPlanDayKey, mealType: MealType, recipeId: string | null) {
    if (!coupleId.value || !user.value) return

    try {
      const selectedKey = weekKey.value
      const currentDays = normalizeDays(mealPlan.value?.days)
      const updatedDays: MealPlanDays = {
        ...currentDays,
        [day]: {
          ...currentDays[day],
          [mealType]: recipeId
        }
      }

      const planDocRef = doc(
        db,
        'mealPlans',
        mealPlan.value?.id || getPlanDocumentId(coupleId.value, selectedKey)
      )

      if (mealPlan.value) {
        await updateDoc(planDocRef, { days: updatedDays, updatedAt: serverTimestamp() })
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
    filledSlots,
    totalSlots,
    shiftWeek,
    goToCurrentWeek,
    setMealForDay
  }
}
