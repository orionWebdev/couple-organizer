<script setup lang="ts">
const props = defineProps<{
  icons: readonly string[]
  modelValue: string
  columns?: number
}>()

defineEmits<{ 'update:modelValue': [icon: string] }>()
</script>

<template>
  <div class="icon-grid" :style="{ gridTemplateColumns: `repeat(${props.columns ?? 8}, 1fr)` }">
    <button
      v-for="icon in icons"
      :key="icon"
      type="button"
      class="icon-cell"
      :class="{ 'icon-cell--active': modelValue === icon }"
      @click="$emit('update:modelValue', icon)"
    >{{ icon }}</button>
  </div>
</template>

<style scoped>
.icon-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 6px;
}

.icon-cell {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: var(--surface-deep);
  border: 1.5px solid var(--border-softer);
  border-radius: 10px;
  cursor: pointer;
}

.icon-cell--active {
  border-color: var(--accent);
  background: var(--accent-tint);
}
</style>
