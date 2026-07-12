<script setup lang="ts">
import { computed } from 'vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import {
  WEEKDAYS_LONG, bookedAtLabel, dayMonth, fromDateKey, nextLabel,
  personColor, personName, personTint, rangeLabel
} from '@/utils/belegung'
import type { Booking, Couple, Resource } from '@/types'

const props = defineProps<{
  booking: Booking | null
  resource: Resource | undefined
  couple: Couple | null
}>()

const emit = defineEmits<{
  close: []
  delete: []
}>()

const color = computed(() => (props.booking ? personColor(props.couple, props.booking.owner) : ''))
const tint = computed(() => (props.booking ? personTint(props.couple, props.booking.owner) : ''))
const ownerName = computed(() => (props.booking ? personName(props.couple, props.booking.owner) : ''))
const initial = computed(() => ownerName.value.charAt(0).toUpperCase())

const whenLabel = computed(() => {
  const b = props.booking
  if (!b) return ''
  const day = b.repeat === 'weekly'
    ? `${WEEKDAYS_LONG[b.weekday]}s`
    : `${WEEKDAYS_LONG[b.weekday]}, ${dayMonth(fromDateKey(b.date))}`
  const repeat = b.repeat === 'weekly' ? ' · ↻ wöchentlich' : ''
  return `${day} · ${rangeLabel(b)}${repeat}`
})

// „Wer hat wann eingetragen" — bei wöchentlichen Serien zusätzlich ab wann.
const bookedLabel = computed(() => {
  const b = props.booking
  if (!b) return ''
  const who = personName(props.couple, b.createdBy)
  const when = bookedAtLabel(b.createdAt)
  return when ? `Eingetragen von ${who} · ${when}` : `Eingetragen von ${who}`
})
</script>

<template>
  <BottomSheet :isOpen="!!booking" @close="emit('close')">
    <template v-if="booking">
      <div class="detail-head">
        <span class="res-icon" :style="{ background: tint }">{{ resource?.emoji ?? '•' }}</span>
        <div class="head-text">
          <span class="res-name">{{ resource?.name ?? 'Ressource' }}</span>
          <span class="when">{{ whenLabel }}</span>
        </div>
      </div>

      <div class="owner-box" :style="{ background: tint }">
        <span class="avatar" :style="{ background: color }">{{ initial }}</span>
        <div class="owner-text">
          <span class="owner-name">
            {{ ownerName }}<template v-if="booking.note"> · {{ booking.note }}</template>
          </span>
          <span class="booked-at">{{ bookedLabel }}</span>
          <span v-if="booking.repeat === 'weekly'" class="booked-at">
            Nächster Termin: {{ nextLabel(booking, new Date()) }}
          </span>
        </div>
      </div>

      <button type="button" class="delete-btn" @click="emit('delete')">
        {{ booking.repeat === 'weekly' ? 'Wöchentliche Belegung löschen' : 'Belegung löschen' }}
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.detail-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-right: 40px;
}

.res-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-size: 20px;
}

.head-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.res-name {
  font-family: var(--font-headline);
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
}

.when {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-secondary);
}

.owner-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  margin-bottom: 14px;
}

.avatar {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #fff;
  font-family: var(--font-headline);
  font-size: 14px;
  font-weight: 700;
}

.owner-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.owner-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}

.booked-at {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-meta);
}

.delete-btn {
  width: 100%;
  padding: 13px;
  border: 1px solid var(--danger-border);
  border-radius: 14px;
  background: var(--surface);
  color: var(--danger);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
</style>
