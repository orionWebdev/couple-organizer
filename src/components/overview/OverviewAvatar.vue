<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  name: string
  size?: 'sm' | 'md' | 'lg'
  tone?: 'green' | 'blue' | 'amber' | 'rose'
}>(), {
  size: 'md',
  tone: 'green'
})

const initials = computed(() => {
  const parts = props.name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('')
})

const sizeClass = computed(() => {
  return {
    sm: 'h-9 w-9 text-xs',
    md: 'h-11 w-11 text-sm',
    lg: 'h-14 w-14 text-base'
  }[props.size]
})

const toneClass = computed(() => {
  return {
    green: 'bg-emerald-500/18 text-emerald-200 ring-emerald-400/30',
    blue: 'bg-sky-500/18 text-sky-200 ring-sky-400/30',
    amber: 'bg-amber-500/18 text-amber-200 ring-amber-400/30',
    rose: 'bg-rose-500/18 text-rose-200 ring-rose-400/30'
  }[props.tone]
})
</script>

<template>
  <div
    class="inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-1 ring-inset"
    :class="[sizeClass, toneClass]"
    :aria-label="name"
  >
    {{ initials }}
  </div>
</template>
