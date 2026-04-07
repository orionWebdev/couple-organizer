import { createRouter, createWebHistory } from '@ionic/vue-router'
import { useAuth } from '@/composables/useAuth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue')
    },
    {
      path: '/couple-setup',
      name: 'couple-setup',
      component: () => import('@/views/CoupleSetupView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/',
      component: () => import('@/views/TabsView.vue'),
      meta: { requiresAuth: true, requiresCouple: true },
      children: [
        {
          path: '',
          redirect: '/overview'
        },
        {
          path: 'overview',
          name: 'overview',
          component: () => import('@/views/OverviewView.vue')
        },
        {
          path: 'plan',
          name: 'plan',
          component: () => import('@/views/PlanenView.vue')
        },
        {
          path: 'shopping',
          name: 'shopping',
          component: () => import('@/views/ShoppingView.vue')
        },
        {
          path: 'finance',
          name: 'finance',
          component: () => import('@/views/FinanceView.vue')
        }
      ]
    }
  ]
})

router.beforeEach(async (to) => {
  const { user, loading, authReady } = useAuth()

  if (loading.value) {
    await authReady
  }

  const isAuthenticated = !!user.value
  const hasCouple = !!user.value?.coupleId

  // Meta is merged from parent routes in Vue Router 4
  if (to.meta.requiresAuth && !isAuthenticated) {
    return { name: 'login' }
  }

  if (to.meta.requiresCouple && !hasCouple) {
    return { name: 'couple-setup' }
  }

  if (to.name === 'login' && isAuthenticated) {
    return hasCouple ? { name: 'overview' } : { name: 'couple-setup' }
  }

  if (to.name === 'couple-setup' && hasCouple) {
    return { name: 'overview' }
  }
})

export default router
