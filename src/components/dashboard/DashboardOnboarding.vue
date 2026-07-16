<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  hasMeal: boolean
  hasBelegung: boolean
  hasBudget: boolean
}>()

const emit = defineEmits<{
  (e: 'meal' | 'belegung' | 'budget'): void
}>()

const steps = computed(() => [
  { key: 'meal' as const, emoji: '🍽️', label: 'Essen für heute planen', done: props.hasMeal },
  { key: 'belegung' as const, emoji: '🗓️', label: 'Ressource & Belegung anlegen', done: props.hasBelegung },
  { key: 'budget' as const, emoji: '💶', label: 'Monatsbudget setzen', done: props.hasBudget },
])

const doneCount = computed(() => steps.value.filter((s) => s.done).length)
</script>

<template>
  <div class="onboarding">
    <div class="welcome">
      <div class="welcome-emoji">👋</div>
      <div class="welcome-title">Willkommen bei TwoDo</div>
      <div class="welcome-text">Drei kleine Schritte, dann füllt sich euer Zuhause.</div>
    </div>

    <div class="section-label steps-label">Einrichten · {{ doneCount }} / 3</div>

    <div class="steps">
      <button
        v-for="step in steps"
        :key="step.key"
        class="step"
        type="button"
        @click="emit(step.key)"
      >
        <span class="step-icon" :class="{ 'step-icon--done': step.done }">
          {{ step.done ? '✓' : step.emoji }}
        </span>
        <span class="step-label">{{ step.label }}</span>
        <span class="step-arrow">›</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.onboarding {
  padding-top: 4px;
}

.welcome {
  background: linear-gradient(180deg, var(--dashboard-tint), var(--surface));
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card-lg);
  padding: 22px 20px;
  box-shadow: var(--shadow-card);
}

.welcome-emoji {
  font-size: 40px;
}

.welcome-title {
  margin-top: 4px;
  font-family: var(--font-headline);
  font-size: 21px;
  font-weight: 700;
  color: var(--text);
}

.welcome-text {
  margin-top: 4px;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--text-secondary);
}

.steps-label {
  margin: 22px 0 10px;
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 13px 15px;
  text-align: left;
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  cursor: pointer;
}

.step-icon {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 2px solid var(--border);
  display: grid;
  place-items: center;
  font-size: 17px;
  flex-shrink: 0;
}

.step-icon--done {
  border-color: var(--success);
  background: var(--success);
  color: #fff;
  font-weight: 800;
}

.step-label {
  flex: 1;
  font-family: var(--font-body);
  font-size: 14.5px;
  font-weight: 800;
  color: var(--text);
}

.step-arrow {
  font-size: 18px;
  font-weight: 800;
  color: var(--accent);
}
</style>
