<script setup lang="ts">
import { computed } from 'vue'
import type { Couple } from '@/types'
import type { WeekDay } from '@/composables/useMealPlan'
import { primaryTagMeta, resolveRecipeCategories } from '@/utils/recipeTags'
import { partnerId } from '@/utils/belegung'

const props = defineProps<{
  day: WeekDay | null
  couple: Couple | null
  currentUserId: string
}>()

const emit = defineEmits<{
  (e: 'setCook', assignee: string): void
  (e: 'open'): void
}>()

const recipeCategories = computed(() => resolveRecipeCategories(props.couple))

const recipe = computed(() => props.day?.recipe ?? null)
const icon = computed(() => primaryTagMeta(recipe.value?.tags ?? [], recipeCategories.value))
const cook = computed(() => props.day?.entry?.cookAssignee ?? null)

const partner = computed(() => partnerId(props.couple, props.currentUserId))
const partnerName = computed(() =>
  partner.value ? props.couple?.memberNames[partner.value] ?? 'Partner' : 'Partner'
)

function cookName(uid: string | 'both'): string {
  if (uid === 'both') return 'Beide'
  return props.couple?.memberNames[uid] ?? '?'
}

// "🕒 25 Min · noch niemand eingeteilt" — Zeit optional, dahinter der
// Koch-Status.
const meta = computed(() => {
  const r = recipe.value
  if (!r) return ''
  const parts: string[] = []
  if (r.minutes) parts.push(`🕒 ${r.minutes} Min`)
  parts.push(cook.value ? `${cookName(cook.value)} kocht` : 'noch niemand eingeteilt')
  return parts.join(' · ')
})
</script>

<template>
  <button v-if="!recipe" class="hero hero--empty" type="button" @click="emit('open')">
    <span class="empty-emoji">🍽️</span>
    <span class="empty-text">Heute noch nichts geplant</span>
    <span class="empty-cta">Essen planen ›</span>
  </button>

  <div v-else class="hero">
    <div class="hero-top" @click="emit('open')">
      <span class="hero-kicker">Heute Abend</span>
      <span class="hero-emoji">{{ icon.emoji }}</span>
    </div>
    <div class="hero-title" @click="emit('open')">{{ recipe.title }}</div>
    <div class="hero-meta">{{ meta }}</div>

    <div class="cook-row">
      <button
        type="button"
        class="cook-btn cook-btn--primary"
        :class="{ 'cook-btn--active': cook === currentUserId }"
        @click="emit('setCook', currentUserId)"
      >Ich koche 🍳</button>
      <button
        v-if="partner"
        type="button"
        class="cook-btn cook-btn--ghost"
        :class="{ 'cook-btn--active': cook === partner }"
        @click="emit('setCook', partner)"
      >{{ partnerName }} fragen</button>
    </div>
  </div>
</template>

<style scoped>
.hero {
  background: var(--food);
  border-radius: var(--radius-card);
  padding: 17px;
  color: #fff;
  box-shadow: 0 12px 26px color-mix(in srgb, var(--food) 42%, transparent);
}

.hero--empty {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 18px;
  background: var(--food);
  border: none;
  border-radius: var(--radius-card);
  color: #fff;
  font-family: var(--font-body);
  cursor: pointer;
  box-shadow: 0 12px 26px color-mix(in srgb, var(--food) 42%, transparent);
  text-align: left;
}

.empty-emoji {
  font-size: 26px;
}

.empty-text {
  flex: 1;
  font-family: var(--font-headline);
  font-size: 17px;
  font-weight: 700;
}

.empty-cta {
  font-size: 13px;
  font-weight: 800;
  opacity: 0.9;
}

.hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}

.hero-kicker {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.82);
}

.hero-emoji {
  font-size: 34px;
  line-height: 1;
}

.hero-title {
  margin: 7px 0 2px;
  font-family: var(--font-headline);
  font-size: 23px;
  font-weight: 700;
  letter-spacing: -0.4px;
  line-height: 1.1;
  cursor: pointer;
}

.hero-meta {
  font-size: 13.5px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
}

.cook-row {
  display: flex;
  gap: 9px;
  margin-top: 13px;
}

.cook-btn {
  flex: 1;
  min-height: 46px;
  border: none;
  border-radius: 15px;
  padding: 0 14px;
  font-family: var(--font-body);
  font-size: 14.5px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.12s var(--ease-overshoot), filter 0.2s var(--ease-standard);
}

.cook-btn:active {
  transform: scale(0.96);
}

.cook-btn--primary {
  background: #fff;
  color: var(--food);
}

.cook-btn--ghost {
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
}

/* Aktiver Koch: die gewählte Seite bleibt betont, die andere tritt zurück. */
.cook-row:has(.cook-btn--active) .cook-btn:not(.cook-btn--active) {
  opacity: 0.55;
}
</style>
