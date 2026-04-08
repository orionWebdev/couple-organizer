<script setup lang="ts">
defineProps<{
  modelValue: string
  options: Array<{
    label: string
    value: string
  }>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="segment-shell" :style="{ '--segment-count': String(options.length || 1) }">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="segment-option"
      :class="{ 'segment-option-active': modelValue === option.value }"
      @click="emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.segment-shell {
  display: grid;
  grid-template-columns: repeat(var(--segment-count, 2), minmax(0, 1fr));
  gap: 0.4rem;
  padding: 0.35rem;
  border: 1px solid rgba(71, 85, 105, 0.52);
  border-radius: 1.35rem;
  background: rgba(30, 41, 59, 0.7);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
}

.segment-option {
  min-height: 3rem;
  border: 0;
  border-radius: 1rem;
  background: transparent;
  color: rgb(148 163 184);
  font-size: 1.25rem;
  font-weight: 600;
  transition: background 150ms ease, color 150ms ease, transform 150ms ease;
}

.segment-option-active {
  background: linear-gradient(180deg, rgba(51, 65, 85, 0.98), rgba(30, 41, 59, 0.98));
  color: rgb(248 250 252);
  box-shadow: 0 10px 24px rgba(2, 6, 23, 0.18);
}
</style>
