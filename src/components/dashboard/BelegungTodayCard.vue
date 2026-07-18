<script setup lang="ts">
import { computed } from 'vue'
import type { Booking, Couple, Resource } from '@/types'
import { bookingsOnDay, conflictsFor, rangeLabel, personName, todayKey } from '@/utils/belegung'
import InitialChip from '@/components/ui/InitialChip.vue'

const props = defineProps<{
  bookings: readonly Booking[]
  resourceById: Record<string, Resource>
  couple: Couple | null
}>()

const key = todayKey()

const today = computed(() => bookingsOnDay(props.bookings, key))

function resource(b: Booking): Resource | null {
  return props.resourceById[b.resourceId] ?? null
}

function hasConflict(b: Booking): boolean {
  return conflictsFor(b, props.bookings, key).length > 0
}
</script>

<template>
  <div class="beleg-card">
    <div v-if="today.length === 0" class="beleg-empty">Heute nichts belegt.</div>

    <div v-else class="beleg-list">
      <div v-for="b in today" :key="b.id" class="beleg-li">
        <span class="beleg-lead">{{ resource(b)?.emoji ?? '📦' }}</span>
        <div class="beleg-grow">
          <div class="beleg-txt">
            {{ resource(b)?.name ?? 'Ressource' }} · <span class="mono">{{ rangeLabel(b) }}</span>
          </div>
          <div class="beleg-meta">
            <template v-if="b.note">{{ b.note }} · </template>{{ personName(couple, b.owner) }}
          </div>
        </div>
        <span v-if="hasConflict(b)" class="beleg-badge">⚠️ Konflikt</span>
        <InitialChip v-else :uid="b.owner" :couple="couple" :size="26" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.beleg-card {
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card);
  padding: 6px 16px;
  box-shadow: var(--shadow-card);
}

.beleg-empty {
  padding: 14px 0;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-meta);
}

.beleg-li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
}

.beleg-li + .beleg-li {
  border-top: 1px solid var(--border-softer);
}

.beleg-lead {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: var(--surface-deep);
  display: grid;
  place-items: center;
  font-size: 22px;
  flex: none;
}

.beleg-grow {
  flex: 1;
  min-width: 0;
}

.beleg-txt {
  font-size: 15px;
  font-weight: 800;
  color: var(--text);
}

.beleg-meta {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.beleg-badge {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: 999px;
  padding: 5px 11px;
  font-size: 12.5px;
  font-weight: 800;
  color: var(--danger);
  background: var(--danger-tint);
  white-space: nowrap;
}
</style>
