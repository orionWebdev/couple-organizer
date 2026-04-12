<script setup lang="ts">
import { computed } from 'vue'

interface Segment {
  id: string
  label: string
  emoji?: string
}

const props = defineProps<{
  segments: Segment[]
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [id: string]
}>()

const activeIndex = computed(() =>
  props.segments.findIndex(s => s.id === props.modelValue)
)

const indicatorStyle = computed(() => ({
  width: `${100 / props.segments.length}%`,
  transform: `translateX(${activeIndex.value * 100}%)`
}))
</script>

<template>
  <div class="seg-shell">
    <button
      v-for="seg in segments"
      :key="seg.id"
      class="seg-btn"
      :class="{ 'seg-active': modelValue === seg.id }"
      @click="emit('update:modelValue', seg.id)"
    >
      <span v-if="seg.emoji" class="seg-emoji" aria-hidden="true">{{ seg.emoji }}</span>
      {{ seg.label }}
    </button>
    <!-- sliding green indicator -->
    <div class="seg-indicator" :style="indicatorStyle" />
  </div>
</template>

<style scoped>
.seg-shell {
  position: relative;
  display: flex;
  background: rgba(15, 23, 42, 0.96);
  border-bottom: 1px solid rgba(51, 65, 85, 0.7);
  padding-top: 0.5rem;
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.seg-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.55rem 0.5rem 0.65rem;
  border: 0;
  background: transparent;
  color: #64748b;
  font-size: 1.07rem;
  font-weight: 600;
  transition: color 0.22s ease;
  white-space: nowrap;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.seg-active {
  color: var(--app-primary-tint);
}

.seg-emoji {
  font-size: 1.2rem;
  line-height: 1;
}

/* ── Sliding indicator ─────────────────────────────────────────── */
.seg-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2.5px;
  background: var(--app-primary);
  border-radius: 2px 2px 0 0;
  box-shadow: 0 0 10px rgba(var(--app-primary-rgb), 0.6);
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}
</style>
