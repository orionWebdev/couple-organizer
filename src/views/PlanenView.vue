<script setup lang="ts">
import { ref } from 'vue'
import {
  IonPage,
  IonContent
} from '@ionic/vue'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import TasksSection from '@/components/todos/TasksSection.vue'
import RecipeManager from '@/components/recipes/RecipeManager.vue'
import MealPlanBoard from '@/components/meal-plan/MealPlanBoard.vue'
import SegmentShell from '@/components/ui/SegmentShell.vue'

const { user } = useAuth()
const { couple } = useCouple()

type Segment = 'aufgaben' | 'rezepte' | 'wochenplan'
const active = ref<Segment>('aufgaben')

const SEGMENTS: { id: Segment; label: string; emoji: string }[] = [
  { id: 'aufgaben',   label: 'Aufgaben',   emoji: '✓' },
  { id: 'rezepte',    label: 'Rezepte',    emoji: '🍝' },
  { id: 'wochenplan', label: 'Essensplan', emoji: '📅' }
]
</script>

<template>
  <ion-page>
    <!-- Segment bar -->
    <SegmentShell v-model="active" :segments="SEGMENTS" />

    <ion-content>
      <div class="mx-auto max-w-lg px-4 pt-3 pb-24">
        <Transition name="tab-fade" mode="out-in">
          <div :key="active">
            <!-- ─ Aufgaben ─────────────────────────────────────── -->
            <template v-if="active === 'aufgaben'">
              <TasksSection
                v-if="user?.coupleId"
                :couple-id="user.coupleId"
                :couple="couple"
              />
            </template>

            <!-- ─ Rezepte ──────────────────────────────────────── -->
            <template v-else-if="active === 'rezepte'">
              <div class="section-header-block">
                <h1 class="section-title">Rezepte</h1>
              </div>
              <RecipeManager
                v-if="user?.coupleId"
                :couple-id="user.coupleId"
              />
            </template>

            <!-- ─ Wochenplan ───────────────────────────────────── -->
            <template v-else-if="active === 'wochenplan'">
              <div class="section-header-block">
                <h1 class="section-title">Essensplan</h1>
              </div>
              <MealPlanBoard
                v-if="user?.coupleId"
                :couple-id="user.coupleId"
              />
            </template>
          </div>
        </Transition>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
/* ── Tab transition ────────────────────────────────────────────────────── */
.tab-fade-enter-active,
.tab-fade-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.tab-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.tab-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ── Section titles (Rezepte / Wochenplan) ─────────────────────────────── */
.section-header-block {
  padding-top: 0.5rem;
  padding-bottom: 0.25rem;
}

.section-title {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #f8fafc;
  margin: 0 0 1rem;
}
</style>
