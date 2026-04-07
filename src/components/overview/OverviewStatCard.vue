<script setup lang="ts">
import { computed } from 'vue'
import { IonIcon } from '@ionic/vue'

const props = withDefaults(defineProps<{
  icon: string | object
  label: string
  value: string | number
  accent?: 'green' | 'blue' | 'amber' | 'rose'
}>(), {
  accent: 'green'
})

const accentClass = computed(() => {
  return {
    green: 'bg-emerald-500/16 text-emerald-300',
    blue: 'bg-sky-500/16 text-sky-300',
    amber: 'bg-amber-500/16 text-amber-300',
    rose: 'bg-rose-500/16 text-rose-300'
  }[props.accent]
})
</script>

<template>
  <article class="dashboard-card dashboard-card-compact">
    <div class="mb-6 inline-flex h-11 w-11 items-center justify-center rounded-2xl" :class="accentClass">
      <ion-icon :icon="icon" class="text-xl" />
    </div>
    <p class="text-sm text-slate-400">{{ label }}</p>
    <p class="mt-2 text-4xl font-semibold tracking-tight text-slate-50">{{ value }}</p>
  </article>
</template>

<style scoped>
.dashboard-card {
  border: 1px solid rgba(71, 85, 105, 0.5);
  border-radius: 1.75rem;
  background:
    linear-gradient(180deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.96));
  box-shadow: 0 18px 36px rgba(2, 6, 23, 0.2);
}

.dashboard-card-compact {
  padding: 1.25rem;
}
</style>
