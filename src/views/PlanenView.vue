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

const { user } = useAuth()
const { couple } = useCouple()

type Segment = 'aufgaben' | 'rezepte' | 'wochenplan'
const active = ref<Segment>('aufgaben')

const SEGMENTS: { id: Segment; label: string; emoji: string }[] = [
  { id: 'aufgaben',   label: 'Aufgaben',   emoji: '✓' },
  { id: 'rezepte',    label: 'Rezepte',    emoji: '🍝' },
  { id: 'wochenplan', label: 'Wochenplan', emoji: '📅' }
]
</script>

<template>
  <ion-page>
    <!-- Segment bar -->
    <div class="seg-bar">
      <button
        v-for="seg in SEGMENTS"
        :key="seg.id"
        class="seg-btn"
        :class="{ 'seg-active': active === seg.id }"
        @click="active = seg.id"
      >
        <span class="seg-emoji" aria-hidden="true">{{ seg.emoji }}</span>
        {{ seg.label }}
      </button>
    </div>

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
                <h1 class="section-title">Wochenplan</h1>
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
/* ── Segment bar ───────────────────────────────────────────────────────── */
.seg-bar {
  display: flex;
  background: rgba(15, 23, 42, 0.96);
  border-bottom: 1px solid rgba(51, 65, 85, 0.7);
  padding: 0.5rem 1rem 0;
  gap: 0.25rem;
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.seg-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.55rem 0.25rem;
  border: 0;
  background: transparent;
  color: #64748b;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0;
  border-bottom: 2px solid transparent;
  transition: color 0.2s ease, border-color 0.2s ease;
  white-space: nowrap;
  margin-bottom: -1px; /* sit on top of border-bottom */
}

.seg-active {
  color: #22c55e;
  border-bottom-color: #22c55e;
}

.seg-emoji {
  font-size: 0.95rem;
  line-height: 1;
}

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
