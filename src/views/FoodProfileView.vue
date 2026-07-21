<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCouple } from '@/composables/useCouple'
import { showToast } from '@/composables/useToast'
import type { FoodProfile } from '@/types'
import { resolveFoodProfile } from '@/utils/foodProfile'
import FoodProfileForm from '@/components/mealplan/FoodProfileForm.vue'

// Zweiter Zugang zum selben Formular wie im KitchenAiSheet — dort bearbeitet
// man es, wo es weh tut, hier findet man es, wenn man danach sucht.
const router = useRouter()
const { couple, updateFoodProfile } = useCouple()

const profile = computed(() => resolveFoodProfile(couple.value))
const saving = ref(false)

function goBack() {
  router.push('/settings')
}

async function save(next: FoodProfile) {
  saving.value = true
  const ok = await updateFoodProfile(next)
  saving.value = false
  showToast(ok ? 'Ess-Profil gespeichert' : 'Fehler beim Speichern')
  if (ok) goBack()
}
</script>

<template>
  <div class="fpv-page area-food">
    <div class="detail-header">
      <button class="back-caret" type="button" @click="goBack" aria-label="Zurück">‹</button>
      <span class="page-title">Ess-Profil</span>
    </div>

    <div class="fpv-scroll">
      <FoodProfileForm :profile="profile" :saving="saving" @save="save" />
    </div>
  </div>
</template>

<style scoped>
.fpv-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: calc(var(--safe-top) + 20px) var(--screen-pad) 8px;
}

.back-caret {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: transparent;
  border: none;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-faint);
  cursor: pointer;
}

.back-caret:active {
  color: var(--text);
}

.page-title {
  font-family: var(--font-headline);
  font-size: 19px;
  font-weight: 700;
  color: var(--text);
}

.fpv-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 12px var(--screen-pad) 32px;
}
</style>
