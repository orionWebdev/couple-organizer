import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useCouple, coupleReady } from '@/composables/useCouple'

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
          path: 'planung',
          name: 'planung',
          component: () => import('@/views/PlanungView.vue')
        },
        {
          // Der Monatskalender der Belegung — eigene Route (Dashboard und
          // Planung-Tab öffnen ihn beide), aber kein eigener Nav-Slot: die
          // Bubble bleibt auf "Planung".
          path: 'belegung',
          name: 'belegung',
          component: () => import('@/views/KalenderView.vue')
        },
        {
          path: 'einkaufen',
          name: 'einkaufen',
          component: () => import('@/views/EinkaufenView.vue')
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/SettingsView.vue')
        },
        {
          // Ausgaben-, Ideen-, Rezept-Kategorien und die geteilten Ressourcen —
          // eine Unterseite je Liste, damit die Settings-Seite nicht zur
          // endlosen Liste wird. Wie /settings ohne eigenen Nav-Slot.
          path: 'settings/kategorien/:type',
          name: 'kategorien',
          component: () => import('@/views/KategorienView.vue')
        },
        {
          path: 'premium',
          name: 'premium',
          component: () => import('@/views/PremiumView.vue')
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

  // Premium-pflichtige Routen. Der Couple-Snapshot muss da sein, bevor wir
  // urteilen — sonst würde ein zahlender Nutzer beim Direktaufruf/Reload kurz
  // auf die Upgrade-Seite geworfen.
  if (to.meta.requiresPremium) {
    await coupleReady
    if (!useCouple().isPremium.value) {
      return { name: 'premium' }
    }
  }

  if (to.name === 'login' && isAuthenticated) {
    return hasCouple ? { name: 'dashboard' } : { name: 'couple-setup' }
  }

  if (to.name === 'couple-setup' && hasCouple) {
    return { name: 'dashboard' }
  }
})

export default router
