<script setup lang="ts">
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [v: string] }>()

const keys = ['1','2','3','4','5','6','7','8','9','.','0','⌫']

function press(key: string) {
  let val = props.modelValue

  if (key === '⌫') {
    emit('update:modelValue', val.slice(0, -1) || '')
    return
  }

  if (key === '.') {
    if (val.includes('.')) return
    emit('update:modelValue', val + '.')
    return
  }

  // max 2 decimal places
  const dotIdx = val.indexOf('.')
  if (dotIdx !== -1 && val.length - dotIdx > 2) return

  // prevent leading zeros
  if (val === '0' && key !== '.') {
    emit('update:modelValue', key)
    return
  }

  emit('update:modelValue', val + key)
}
</script>

<template>
  <div class="keypad">
    <button
      v-for="key in keys"
      :key="key"
      class="key"
      :class="{ 'key--delete': key === '⌫' }"
      @click="press(key)"
    >
      {{ key }}
    </button>
  </div>
</template>

<style scoped>
.keypad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.key {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 56px;
  background: var(--surface-deep);
  border: 1px solid var(--border-softer);
  border-radius: 12px;
  color: var(--text);
  font-family: var(--font-headline);
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.1s ease;
}

.key:active {
  background: var(--border);
}

.key--delete {
  color: var(--text-meta);
  font-family: var(--font-body);
  font-size: 20px;
}
</style>
