<script setup lang="ts">
import { computed } from 'vue'
import { IonPage, IonContent } from '@ionic/vue'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import { useShopping } from '@/composables/useShopping'
import AppHeader from '@/components/layout/AppHeader.vue'
import ShoppingList from '@/components/shopping/ShoppingList.vue'

const { user } = useAuth()
const { couple } = useCouple()

const coupleIdRef = computed<string | null>(() => user.value?.coupleId ?? null)
const { lists, activeItems, loading } = useShopping(coupleIdRef)

const totalItems = computed(() => activeItems.value.length)
const checkedCount = computed(() => activeItems.value.filter((i) => i.checked).length)
const listCount = computed(() => lists.value.length)
</script>

<template>
  <ion-page>
    <AppHeader />
    <ion-content>
      <div class="mx-auto max-w-lg px-4 pt-3 pb-24">

        <!-- ── Page header ─────────────────────────────────────── -->
        <div class="page-header">
          <h1 class="page-title">Einkauf</h1>
          <div v-if="!loading && totalItems > 0" class="page-stats">
            <div class="stat-pill">
              <span class="stat-value">{{ checkedCount }}/{{ totalItems }}</span>
              <span class="stat-label">erledigt</span>
            </div>
            <div v-if="listCount > 1" class="stat-pill">
              <span class="stat-value">{{ listCount }}</span>
              <span class="stat-label">Listen</span>
            </div>
          </div>
        </div>

        <ShoppingList
          v-if="user?.coupleId"
          :couple-id="user.coupleId"
          :couple="couple"
        />
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.page-title {
  font-size: 2.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--app-text);
  margin: 0;
}

.page-stats {
  display: flex;
  gap: 0.5rem;
}

.stat-pill {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  padding: 0.3rem 0.75rem;
  background: rgba(30, 41, 59, 0.92);
  border: 1px solid rgba(71, 85, 105, 0.56);
  border-radius: 9999px;
}

.stat-value {
  font-size: 1.0625rem;
  font-weight: 700;
  color: var(--app-primary);
}

.stat-label {
  font-size: 0.97rem;
  color: var(--app-text-muted);
}
</style>
