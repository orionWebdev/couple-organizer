<script setup lang="ts">
import { computed } from 'vue'
import type { Couple } from '@/types'

const props = defineProps<{
  uid: string
  couple: Couple | null
  size?: number
}>()

const size = computed(() => props.size ?? 28)

const icon = computed(() => props.couple?.memberIcons?.[props.uid] ?? null)

const initial = computed(() => {
  if (!props.couple) return '?'
  const name = props.couple.memberNames[props.uid]
  return name ? name.charAt(0).toUpperCase() : '?'
})

const color = computed(() => {
  if (!props.couple) return 'var(--text-faint)'
  const idx = props.couple.memberIds.indexOf(props.uid)
  return idx === 0 ? 'var(--chris)' : 'var(--sarah)'
})
</script>

<template>
  <span
    class="chip"
    :class="{ 'chip--icon': icon }"
    :style="{
      width: size + 'px',
      height: size + 'px',
      fontSize: icon ? Math.round(size * 0.55) + 'px' : Math.round(size * 0.42) + 'px',
      background: icon ? 'var(--surface-deep)' : color,
    }"
  >{{ icon ?? initial }}</span>
</template>

<style scoped>
/* Nido: runder Avatar-Chip in Personenfarbe, weißer Rand, weicher Schatten */
.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #fff;
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(60, 45, 30, 0.12);
  font-family: var(--font-body);
  font-weight: 700;
  flex-shrink: 0;
  user-select: none;
}
</style>
