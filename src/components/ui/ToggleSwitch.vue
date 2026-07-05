<script setup lang="ts">
defineProps<{
  modelValue: boolean
}>()

defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <button
    type="button"
    class="switch-track"
    :class="{ 'switch-track--on': modelValue }"
    role="switch"
    :aria-checked="modelValue"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <span class="switch-knob" />
  </button>
</template>

<style scoped>
.switch-track {
  flex-shrink: 0;
  width: 44px;
  height: 26px;
  padding: 3px;
  border: none;
  border-radius: 20px;
  background: #e4dccb;
  cursor: pointer;
  transition: background 0.2s ease;
}

.switch-track--on {
  background: var(--accent);
}

.switch-knob {
  display: block;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease;
}

.switch-track--on .switch-knob {
  transform: translateX(18px);
}
</style>
