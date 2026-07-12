<script setup lang="ts">
import { computed } from 'vue'
import type { Booking, Couple, Resource } from '@/types'
import {
  WEEKDAYS_SHORT, mondayOf, weekDates, weekdayIndex, expandWeek, personColor,
} from '@/utils/belegung'
import { dateKey } from '@/utils/mealplan'
import SectionCard from './SectionCard.vue'
import InitialChip from '@/components/ui/InitialChip.vue'

const props = defineProps<{
  bookings: readonly Booking[]
  resourceById: Record<string, Resource>
  couple: Couple | null
}>()

const emit = defineEmits<{ (e: 'open'): void }>()

const week = computed(() => weekDates(mondayOf(new Date())))
const byDay = computed(() => expandWeek(props.bookings, week.value))
const total = computed(() => byDay.value.reduce((n, list) => n + list.length, 0))

const todayIndex = computed(() => weekdayIndex(new Date()))
const next = computed(() => byDay.value[todayIndex.value]?.[0] ?? null)
</script>

<template>
  <SectionCard icon="🗓️" title="Belegung" :count="`${total} diese Woche`">
    <template #action>
      <button class="cal-btn" type="button" @click="emit('open')">Kalender ›</button>
    </template>

    <div class="strip">
      <button
        v-for="(date, day) in week"
        :key="dateKey(date)"
        type="button"
        class="strip-day"
        :class="{ 'strip-day--today': day === todayIndex }"
        @click="emit('open')"
      >
        <span class="strip-label">{{ WEEKDAYS_SHORT[day] }}</span>
        <span class="strip-date">{{ date.getDate() }}</span>
        <span class="strip-dots">
          <span
            v-for="booking in byDay[day].slice(0, 3)"
            :key="booking.id"
            class="dot"
            :style="{ background: personColor(couple, booking.owner) }"
          />
          <span v-if="byDay[day].length > 3" class="strip-more">+{{ byDay[day].length - 3 }}</span>
        </span>
      </button>
    </div>

    <div v-if="next" class="foot">
      <span class="foot-kicker">Als Nächstes</span>
      <span class="foot-spacer" />
      <span class="foot-emoji">{{ resourceById[next.resourceId]?.emoji ?? '📦' }}</span>
      <span class="foot-time mono">{{ next.allDay ? 'ganztägig' : next.start }}</span>
      <span v-if="next.repeat === 'weekly'" class="foot-repeat">↻</span>
      <InitialChip :uid="next.owner" :couple="couple" :size="22" />
    </div>
  </SectionCard>
</template>

<style scoped>
.cal-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  font-family: var(--font-body);
  font-size: 11.5px;
  font-weight: 800;
  cursor: pointer;
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
  padding: 6px 0;
  border: none;
  border-radius: 9px;
  background: transparent;
  cursor: pointer;
}

.strip-day--today {
  background: var(--accent-tint);
}

.strip-label {
  font-size: 9px;
  font-weight: 800;
  color: var(--text-faint);
}

.strip-date {
  font-family: var(--font-headline);
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.strip-day--today .strip-label,
.strip-day--today .strip-date {
  color: var(--accent);
}

.strip-dots {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  height: 20px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.strip-more {
  font-size: 7.5px;
  font-weight: 800;
  color: var(--text-faint);
}

.foot {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 11px;
  padding-top: 11px;
  border-top: 1px solid var(--border-softer);
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
