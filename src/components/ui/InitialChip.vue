<script setup lang="ts">
import { computed } from 'vue'
import type { Couple } from '@/types'

const props = defineProps<{
  uid: string
  couple: Couple | null
  size?: number
}>()

const size = computed(() => props.size ?? 28)

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

const tint = computed(() => {
  if (!props.couple) return 'transparent'
  const idx = props.couple.memberIds.indexOf(props.uid)
  return idx === 0 ? 'var(--chris-tint)' : 'var(--sarah-tint)'
})
</script>

<template>
  <span
    class="chip"
    :style="{
      width: size + 'px',
      height: size + 'px',
      fontSize: Math.round(size * 0.46) + 'px',
      color: color,
      background: tint,
      border: `1px solid ${color}`,
    }"
  >{{ initial }}</span>
</template>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  font-family: 'Mali', system-ui, sans-serif;
  font-weight: 600;
  flex-shrink: 0;
  user-select: none;
}
</style>
