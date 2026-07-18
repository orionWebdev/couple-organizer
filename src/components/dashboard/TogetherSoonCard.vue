<script setup lang="ts">
import { computed } from 'vue'
import type { BucketListItem, Couple, Trip } from '@/types'
import { categoryDef, ideaAuthor, resolveIdeaCategories } from '@/utils/ideen'
import { countdownLabel, dateBadge, daysUntil } from '@/utils/dateLabels'

const props = defineProps<{
  couple: Couple | null
  trips: readonly Trip[]
  ideas: readonly BucketListItem[]
}>()

const emit = defineEmits<{ (e: 'open'): void }>()

const categories = computed(() => resolveIdeaCategories(props.couple))

// Bevorstehende datierte Einträge (heute oder später), frühester zuerst.
const upcoming = computed(() => {
  const list: { key: string; emoji: string; title: string }[] = []
  for (const t of props.trips) {
    if (t.startDate && (daysUntil(t.startDate) ?? -1) >= 0) list.push({ key: t.startDate, emoji: t.emoji || '✈️', title: t.title })
  }
  for (const i of props.ideas) {
    if (i.date && !i.done && (daysUntil(i.date) ?? -1) >= 0) {
      list.push({ key: i.date, emoji: categoryDef(i.category, categories.value).emoji, title: i.name })
    }
  }
  return list.sort((a, b) => a.key.localeCompare(b.key))
})

// Mit Datum: der nächste bevorstehende Termin samt Countdown. Ohne Datum:
// Fallback auf die zuletzt angelegte Reise bzw. neueste offene Idee.
const anchor = computed<{ emoji: string; title: string; meta: string } | null>(() => {
  const next = upcoming.value[0]
  if (next) {
    return { emoji: next.emoji, title: next.title, meta: `${countdownLabel(next.key)} · ${dateBadge(next.key)}` }
  }

  const trip = props.trips[0]
  if (trip) {
    return { emoji: trip.emoji || '✈️', title: trip.title, meta: `Reise · ${trip.when}` }
  }

  const idea = props.ideas.find((i) => !i.done) ?? props.ideas[0]
  if (idea) {
    const def = categoryDef(idea.category, categories.value)
    const author = props.couple?.memberNames[ideaAuthor(idea)] ?? null
    return {
      emoji: def.emoji,
      title: idea.name,
      meta: author ? `${def.label} · Idee von ${author}` : def.label,
    }
  }

  return null
})
</script>

<template>
  <button v-if="anchor" class="soon" type="button" @click="emit('open')">
    <span class="soon-lead">{{ anchor.emoji }}</span>
    <div class="soon-grow">
      <div class="soon-title">{{ anchor.title }}</div>
      <div class="soon-meta">{{ anchor.meta }}</div>
    </div>
    <span class="soon-chevron">›</span>
  </button>
</template>

<style scoped>
.soon {
  display: flex;
  align-items: center;
  gap: 13px;
  width: 100%;
  text-align: left;
  background: color-mix(in srgb, var(--bucket) 10%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--bucket) 22%, transparent);
  border-radius: var(--radius-card);
  padding: 15px;
  cursor: pointer;
  box-shadow: var(--shadow-card);
}

.soon-lead {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--bucket) 16%, var(--surface));
  display: grid;
  place-items: center;
  font-size: 22px;
  flex: none;
}

.soon-grow {
  flex: 1;
  min-width: 0;
}

.soon-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.soon-meta {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.soon-chevron {
  font-size: 24px;
  color: var(--text-faint);
  flex: none;
}
</style>
