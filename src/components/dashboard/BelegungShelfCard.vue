<script setup lang="ts">
import { computed } from 'vue'
import type { Booking, Couple, Resource } from '@/types'
import {
  WEEKDAYS_SHORT, mondayOf, weekDates, weekdayIndex, expandWeek,
  conflictsFor, personColor, todayKey,
} from '@/utils/belegung'
import { dateKey } from '@/utils/mealplan'
import { useMountFlag } from '@/composables/useMountAnim'
import InitialChip from '@/components/ui/InitialChip.vue'

const props = defineProps<{
  bookings: readonly Booking[]
  resourceById: Record<string, Resource>
  couple: Couple | null
}>()

const emit = defineEmits<{ (e: 'open'): void }>()

const run = useMountFlag(80)

// Genau eine Woche — das Fenster ist damit fix, egal wie viele Serien es gibt.
const week = computed(() => weekDates(mondayOf(new Date())))
const byDay = computed(() => expandWeek(props.bookings, week.value))
const total = computed(() => byDay.value.reduce((n, list) => n + list.length, 0))

const todayIndex = computed(() => weekdayIndex(new Date()))
const today = computed(() => byDay.value[todayIndex.value] ?? [])

const conflictToday = computed(() =>
  today.value.some((b) => conflictsFor(b, props.bookings, todayKey()).length > 0)
)

const next = computed(() => today.value[0] ?? null)
</script>

<template>
  <button class="shelf" type="button" @click="emit('open')">
    <div class="shelf-head">
      <span class="shelf-icon">🗓️</span>
      <span class="shelf-title">Belegung</span>
      <span v-if="conflictToday" class="shelf-warn">⚠ heute</span>
      <span class="shelf-link">{{ total }} diese Woche ›</span>
    </div>

    <div class="strip">
      <div
        v-for="(date, day) in week"
        :key="dateKey(date)"
        class="strip-day"
        :class="{ 'strip-day--today': day === todayIndex }"
      >
        <span class="strip-label">{{ WEEKDAYS_SHORT[day] }}</span>
        <span class="strip-dots">
          <span
            v-for="(booking, i) in byDay[day].slice(0, 3)"
            :key="booking.id"
            class="dot"
            :style="{
              background: personColor(couple, booking.owner),
              transform: run ? 'scale(1)' : 'scale(0)',
              transitionDelay: day * 25 + i * 40 + 'ms',
            }"
          />
          <span v-if="byDay[day].length > 3" class="strip-more">+{{ byDay[day].length - 3 }}</span>
        </span>
      </div>
    </div>

    <div v-if="next" class="shelf-foot">
      <span class="foot-kicker">Als Nächstes</span>
      <span class="foot-spacer" />
      <span class="foot-emoji">{{ resourceById[next.resourceId]?.emoji ?? '📦' }}</span>
      <span class="foot-time mono">{{ next.allDay ? 'ganztägig' : next.start }}</span>
      <span v-if="next.repeat === 'weekly'" class="foot-repeat">↻</span>
      <InitialChip :uid="next.owner" :couple="couple" :size="22" />
    </div>
    <div v-else class="shelf-foot shelf-foot--empty">Heute nichts belegt.</div>
  </button>
</template>

<style scoped>
.shelf {
  display: block;
  width: 100%;
  text-align: left;
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card);
  padding: 14px;
  box-shadow: var(--shadow-card);
  cursor: pointer;
}

.shelf-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.shelf-icon {
  width: 26px;
  height: 26px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  font-size: 13px;
  background: var(--planung-tint);
  flex-shrink: 0;
}

.shelf-title {
  flex: 1;
  font-family: var(--font-headline);
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}

.shelf-warn {
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  color: var(--danger);
  background: var(--danger-tint);
  white-space: nowrap;
}

.shelf-link {
  font-size: 11.5px;
  font-weight: 800;
  color: var(--planung);
  white-space: nowrap;
}

.strip {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.strip-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 5px 0;
  border-radius: 9px;
}

.strip-day--today {
  background: var(--planung-tint);
}

.strip-label {
  font-size: 9px;
  font-weight: 800;
  color: var(--text-faint);
}

.strip-day--today .strip-label {
  color: var(--planung);
}

.strip-dots {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  height: 22px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: transform var(--dur-base) var(--ease-overshoot);
}

.strip-more {
  font-size: 7.5px;
  font-weight: 800;
  color: var(--text-faint);
}

.shelf-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding-top: 11px;
  border-top: 1px solid var(--border-softer);
}

.shelf-foot--empty {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-meta);
}

.foot-kicker {
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: var(--text-meta);
}

.foot-spacer {
  flex: 1;
}

.foot-emoji {
  font-size: 15px;
}

.foot-time {
  font-size: 13px;
  color: var(--text);
}

.foot-repeat {
  font-size: 11px;
  font-weight: 800;
  color: var(--text-meta);
}
</style>
