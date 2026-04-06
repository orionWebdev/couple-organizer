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
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true, requiresCouple: true }
    }
  ]
})

router.beforeEach(async (to) => {
  const { user, loading, authReady } = useAuth()

  // Wait for initial auth check
  if (loading.value) {
    await authReady
  }

  const isAuthenticated = !!user.value
  const hasCouple = !!user.value?.coupleId

  // Redirect unauthenticated users to login
  if (to.meta.requiresAuth && !isAuthenticated) {
    return { name: 'login' }
  }

  // Redirect to couple setup if authenticated but no couple
  if (to.meta.requiresCouple && !hasCouple) {
    return { name: 'couple-setup' }
  }

  // Redirect authenticated users away from login
  if (to.name === 'login' && isAuthenticated) {
    return hasCouple ? { name: 'dashboard' } : { name: 'couple-setup' }
  }

  // Redirect to dashboard if already in a couple but on setup page
  if (to.name === 'couple-setup' && hasCouple) {
    return { name: 'dashboard' }
  }
})

export default router
