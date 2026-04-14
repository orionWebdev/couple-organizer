import { ref } from 'vue'
import { useRouter } from 'vue-router'

export type PlanSegment = 'aufgaben' | 'rezepte' | 'wochenplan'
export type PendingAction = 'task' | 'shopping' | 'expense' | 'recipe'

const pendingAction = ref<PendingAction | null>(null)
const requestedPlanSegment = ref<PlanSegment | null>(null)

export function useActionHub() {
  const router = useRouter()

  async function triggerAddTask() {
    requestedPlanSegment.value = 'aufgaben'
    pendingAction.value = 'task'
    if (router.currentRoute.value.path !== '/plan') {
      await router.push('/plan')
    }
  }

  async function triggerAddRecipe() {
    requestedPlanSegment.value = 'rezepte'
    pendingAction.value = 'recipe'
    if (router.currentRoute.value.path !== '/plan') {
      await router.push('/plan')
    }
  }

  async function triggerAddShopping() {
    pendingAction.value = 'shopping'
    if (router.currentRoute.value.path !== '/shopping') {
      await router.push('/shopping')
    }
  }

  async function triggerAddExpense() {
    pendingAction.value = 'expense'
    if (router.currentRoute.value.path !== '/finance') {
      await router.push('/finance')
    }
  }

  function consumePending(action: PendingAction): boolean {
    if (pendingAction.value !== action) return false
    pendingAction.value = null
    return true
  }

  function consumePlanSegment(): PlanSegment | null {
    const value = requestedPlanSegment.value
    requestedPlanSegment.value = null
    return value
  }

  return {
    pendingAction,
    requestedPlanSegment,
    consumePending,
    consumePlanSegment,
    triggerAddTask,
    triggerAddShopping,
    triggerAddExpense,
    triggerAddRecipe
  }
}
