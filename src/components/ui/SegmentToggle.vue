<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: string
  options: Array<{ label: string; value: string }>
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

const activeIndex = computed(() =>
  Math.max(0, props.options.findIndex(o => o.value === props.modelValue))
)
</script>

<template>
  <div class="seg-wrap" :style="{ '--segment-count': options.length }">
    <span class="seg-pill" :style="{ transform: `translateX(${activeIndex * 100}%)` }" />
    <button
      v-for="opt in options"
      :key="opt.value"
      class="seg-btn"
      :class="{ 'seg-btn--active': modelValue === opt.value }"
      @click="$emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped>
.seg-wrap {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 11px;
  padding: 3px;
}

/* Sliding Pill: always in the DOM, only its transform changes */
.seg-pill {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 3px;
  width: calc((100% - 6px) / var(--segment-count));
  background: var(--accent);
  border-radius: 8px;
  transition: transform 380ms var(--ease-overshoot);
  pointer-events: none;
}

.seg-btn {
  position: relative;
  z-index: 1;
  flex: 1;
  padding: 6px 14px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-faint);
  font-family: 'Mali', system-ui, sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: color 220ms var(--ease-standard);
  white-space: nowrap;
}

.seg-btn--active {
  color: var(--on-accent);
}
</style>
