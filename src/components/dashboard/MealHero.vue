<script setup lang="ts">
import { computed } from 'vue'
import type { Couple } from '@/types'
import type { WeekDay } from '@/composables/useMealPlan'
import { primaryTagMeta, resolveRecipeCategories } from '@/utils/recipeTags'

const props = defineProps<{
  day: WeekDay | null
  couple: Couple | null
}>()

const recipeCategories = computed(() => resolveRecipeCategories(props.couple))

const emit = defineEmits<{
  (e: 'setCook', assignee: string): void
  (e: 'open'): void
}>()

const recipe = computed(() => props.day?.recipe ?? null)
const icon = computed(() => primaryTagMeta(recipe.value?.tags ?? [], recipeCategories.value))
const cook = computed(() => props.day?.entry?.cookAssignee ?? null)

// "🕒 25 Min · 4 Zutaten" — beide Teile sind optional, ein Rezept ohne Zeit oder
// ohne Zutaten soll keine leere Meta-Zeile hinterlassen.
const meta = computed(() => {
  const r = recipe.value
  if (!r) return ''
  const parts: string[] = []
  if (r.minutes) parts.push(`🕒 ${r.minutes} Min`)
  if (r.ingredients.length) parts.push(`${r.ingredients.length} Zutaten`)
  return parts.join(' · ')
})

function chipStyle(active: boolean, color: string) {
  return {
    background: active ? color : 'var(--surface)',
    color: active ? '#fff' : 'var(--text-secondary)',
    borderColor: active ? color : 'var(--border-soft)',
  }
}

function personColor(uid: string): string {
  return props.couple?.memberIds.indexOf(uid) === 0 ? 'var(--chris)' : 'var(--sarah)'
}
</script>

<template>
  <button v-if="!recipe" class="hero hero--empty" type="button" @click="emit('open')">
    Heute noch nichts geplant 🍽️
  </button>

  <div v-else class="hero">
    <div class="hero-top" @click="emit('open')">
      <span class="hero-icon" :style="{ background: icon.color }">{{ icon.emoji }}</span>
      <div class="hero-text">
        <span class="hero-kicker">Heute Abend</span>
        <span class="hero-title">{{ recipe.title }}</span>
        <span v-if="meta" class="hero-meta">{{ meta }}</span>
      </div>
    </div>

    <div class="cook-row">
      <span class="cook-label">Wer kocht?</span>
      <button
        v-for="uid in couple?.memberIds ?? []"
        :key="uid"
        type="button"
        class="cook-pill"
        :style="chipStyle(cook === uid, personColor(uid))"
        @click="emit('setCook', uid)"
      >{{ couple?.memberNames[uid] ?? '?' }}</button>
      <button
        type="button"
        class="cook-pill"
        :style="chipStyle(cook === 'both', 'var(--food)')"
        @click="emit('setCook', 'both')"
      >Beide</button>
    </div>
  </div>
</template>

<style scoped>
.hero {
  background: linear-gradient(180deg, var(--food-tint), var(--surface));
  border: 1px solid color-mix(in srgb, var(--food) 22%, transparent);
  border-radius: var(--radius-card-lg);
  padding: 17px;
  box-shadow: var(--shadow-card);
}

.hero--empty {
  display: block;
  width: 100%;
  padding: 18px;
  background: var(--surface);
  border: 1.5px dashed var(--border);
  color: var(--text-meta);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 700;
  text-align: center;
  cursor: pointer;
}

.hero-top {
  display: flex;
  align-items: center;
  gap: 13px;
  cursor: pointer;
}

.hero-icon {
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: 30%;
  display: grid;
  place-items: center;
  font-size: 24px;
  box-shadow: 0 5px 12px rgba(60, 45, 30, 0.15);
}

.hero-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.hero-kicker {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--food);
}

.hero-title {
  font-family: var(--font-headline);
  font-size: 21px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--text);
}

.hero-meta {
  margin-top: 1px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-meta);
}

.cook-row {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 14px;
}

.cook-label {
  flex: 1;
  font-size: 13.5px;
  font-weight: 800;
  color: var(--text);
}

.cook-pill {
  padding: 8px 14px;
  border-radius: 999px;
  border: 1.5px solid var(--border-soft);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--dur-fast) var(--ease-standard),
              color var(--dur-fast) var(--ease-standard),
              border-color var(--dur-fast) var(--ease-standard);
}
</style>
