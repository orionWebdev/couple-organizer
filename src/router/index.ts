import { createRouter, createWebHistory } from 'vue-router'
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
          redirect: '/dashboard'
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue')
        },
        {
          path: 'finanzen',
          name: 'finanzen',
          component: () => import('@/views/FinanzenView.vue')
        },
        {
          path: 'haushalt',
          name: 'haushalt',
          component: () => import('@/views/HaushaltView.vue')
        },
        {
          path: 'einkaufen',
          name: 'einkaufen',
          component: () => import('@/views/EinkaufenView.vue')
        },
        {
          path: 'bucket-list',
          name: 'bucket-list',
          component: () => import('@/views/BucketListView.vue')
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/SettingsView.vue')
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

  if (to.meta.requiresAuth && !isAuthenticated) {
    return { name: 'login' }
  }

  if (to.meta.requiresCouple && !hasCouple) {
    return { name: 'couple-setup' }
  }

  if (to.name === 'login' && isAuthenticated) {
    return hasCouple ? { name: 'dashboard' } : { name: 'couple-setup' }
  }

  if (to.name === 'couple-setup' && hasCouple) {
    return { name: 'dashboard' }
  }
})

export default router
