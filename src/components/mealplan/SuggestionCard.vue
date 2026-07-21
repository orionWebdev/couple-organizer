<script setup lang="ts">
import type { RecipeSuggestion } from '@/services/ai'

// Ein KI-Vorschlag, den man ansehen kann, BEVOR man ihn übernimmt.
//
// Vorher plante ein Tap auf die Karte sofort ein — man musste sich also für ein
// Gericht entscheiden, ohne zu wissen, was drin ist. Zutaten, Schritte und
// Nährwerte kommen von Gemini ohnehin mit (RECIPE_RESPONSE_SCHEMA), sie wurden
// nur nie angezeigt. Jetzt: Tap = aufklappen, Button = übernehmen.
defineProps<{
  suggestion: RecipeSuggestion
  expanded: boolean
  /** Fehlt der Text, gibt es keinen Übernehmen-Button — so in der Wochen-
   *  Vorschau, wo am Ende die ganze Woche auf einmal übernommen wird. */
  actionLabel?: string
  disabled?: boolean
}>()

defineEmits<{ toggle: []; pick: [] }>()

function ingredientLabel(ing: { name: string; amount?: number; unit?: string }): string {
  if (ing.amount == null) return ing.name
  return `${ing.amount}${ing.unit ?? ''} ${ing.name}`
}
</script>

<template>
  <div class="sug" :class="{ 'sug--open': expanded, 'sug--off': disabled }">
    <button type="button" class="sug-head" :disabled="disabled" @click="$emit('toggle')">
      <span class="sug-head-main">
        <span class="sug-title">{{ suggestion.title }}</span>
        <span v-if="suggestion.minutes || suggestion.servings || suggestion.tags?.length" class="sug-meta">
          <span v-if="suggestion.minutes">⏱ {{ suggestion.minutes }} Min</span>
          <span v-if="suggestion.servings">· {{ suggestion.servings }} Portionen</span>
          <span v-if="suggestion.tags?.length">· {{ suggestion.tags.join(', ') }}</span>
        </span>
        <span v-if="suggestion.description" class="sug-desc">{{ suggestion.description }}</span>
      </span>
      <span class="sug-chev" :class="{ 'sug-chev--open': expanded }" aria-hidden="true">›</span>
    </button>

    <div v-if="expanded" class="sug-body">
      <div v-if="suggestion.nutrition" class="sug-nutri">
        <div class="sug-nutri-tile">
          <span class="sug-nutri-val">{{ suggestion.nutrition.kcal }}</span>
          <span class="sug-nutri-lab">kcal</span>
        </div>
        <div class="sug-nutri-tile">
          <span class="sug-nutri-val">{{ suggestion.nutrition.protein }}g</span>
          <span class="sug-nutri-lab">Protein</span>
        </div>
        <div class="sug-nutri-tile">
          <span class="sug-nutri-val">{{ suggestion.nutrition.carbs }}g</span>
          <span class="sug-nutri-lab">KH</span>
        </div>
        <div class="sug-nutri-tile">
          <span class="sug-nutri-val">{{ suggestion.nutrition.fat }}g</span>
          <span class="sug-nutri-lab">Fett</span>
        </div>
      </div>

      <div class="sug-col-lab">Zutaten</div>
      <div v-if="!suggestion.ingredients.length" class="sug-empty">Keine Angaben</div>
      <ul v-else class="sug-ing">
        <li v-for="(ing, i) in suggestion.ingredients" :key="i">{{ ingredientLabel(ing) }}</li>
      </ul>

      <div class="sug-col-lab">Zubereitung</div>
      <div v-if="!suggestion.steps.length" class="sug-empty">Keine Angaben</div>
      <ol v-else class="sug-steps">
        <li v-for="(step, i) in suggestion.steps" :key="i">{{ step }}</li>
      </ol>

      <button
        v-if="actionLabel"
        type="button"
        class="btn-primary sug-pick"
        :disabled="disabled"
        @click="$emit('pick')"
      >
        {{ actionLabel }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.sug {
  border: 1.5px solid var(--border-softer);
  background: var(--surface);
  border-radius: 12px;
  overflow: hidden;
  transition: border-color var(--dur-fast, 0.15s) ease;
}

.sug--open {
  border-color: var(--accent);
}

.sug--off {
  opacity: 0.5;
  pointer-events: none;
}

.sug-head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  padding: 11px 13px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font: inherit;
}

.sug-head:active {
  background: var(--accent-tint);
}

.sug-head-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sug-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}

.sug-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  font-size: 11.5px;
  color: var(--text-meta);
}

.sug-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 3px;
  line-height: 1.4;
}

.sug-chev {
  flex: none;
  margin-top: 2px;
  font-size: 22px;
  line-height: 1;
  color: var(--text-faint);
  transition: transform 0.18s ease;
}

.sug-chev--open {
  transform: rotate(90deg);
  color: var(--accent);
}

/* ── Aufgeklappt ── */
.sug-body {
  padding: 0 13px 13px;
}

.sug-nutri {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-bottom: 14px;
}

.sug-nutri-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 7px 2px;
  border-radius: 10px;
  background: var(--surface-deep);
}

.sug-nutri-val {
  font-family: var(--font-headline);
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}

.sug-nutri-lab {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-meta);
}

.sug-col-lab {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--text-meta);
  margin-bottom: 6px;
}

.sug-ing,
.sug-steps {
  margin: 0 0 14px;
  padding-left: 18px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.sug-ing li::marker {
  color: var(--accent);
}

.sug-steps li {
  padding-left: 2px;
}

.sug-steps li::marker {
  font-weight: 700;
  color: var(--accent);
}

.sug-empty {
  font-size: 12.5px;
  color: var(--text-faint);
  margin-bottom: 14px;
}

.sug-pick {
  margin-top: 2px;
}
</style>
