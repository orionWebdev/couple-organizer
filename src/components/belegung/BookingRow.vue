<script setup lang="ts">
import { computed } from 'vue'
import { personColor, rangeLabel } from '@/utils/belegung'
import type { Booking, Couple, Resource } from '@/types'

const props = defineProps<{
  booking: Booking
  resource: Resource | undefined
  couple: Couple | null
  conflict: boolean
}>()

defineEmits<{ click: [] }>()

const color = computed(() => personColor(props.couple, props.booking.owner))
const initial = computed(() =>
  (props.couple?.memberNames[props.booking.owner] ?? '?').charAt(0).toUpperCase()
)

const subtitle = computed(() => {
  const name = props.resource?.name ?? 'Ressource'
  return props.booking.note ? `${name} · ${props.booking.note}` : name
})
</script>

<template>
  <button
    type="button"
    class="booking-row"
    :style="{
      borderColor: conflict ? 'var(--danger)' : 'var(--border-softer)',
      borderLeftColor: conflict ? 'var(--danger)' : color,
    }"
    @click="$emit('click')"
  >
    <span class="res-icon">{{ resource?.emoji ?? '•' }}</span>

    <span class="row-text">
      <span class="row-top">
        <span class="mono time">{{ rangeLabel(booking) }}</span>
        <span v-if="booking.repeat === 'weekly'" class="repeat" title="wöchentlich">↻</span>
        <span v-if="conflict" class="conflict" title="Überschneidung">⚠</span>
      </span>
      <span class="row-sub">{{ subtitle }}</span>
    </span>

    <span class="avatar" :style="{ background: color }">{{ initial }}</span>
  </button>
</template>

<style scoped>
.booking-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: left;
  padding: 10px 13px;
  border-radius: var(--radius-tile);
  border: 1px solid var(--border-softer);
  border-left-width: 3px;
  background: var(--surface);
  cursor: pointer;
}

.res-icon {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--surface-deep);
  font-size: 17px;
}

.row-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.row-top {
  display: flex;
  align-items: center;
  gap: 6px;
}

.time {
  font-size: 13.5px;
  color: var(--text);
}

.repeat {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-meta);
}

.conflict {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--danger);
}

.row-sub {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.avatar {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #fff;
  font-family: var(--font-headline);
  font-size: 11px;
  font-weight: 700;
}
</style>
