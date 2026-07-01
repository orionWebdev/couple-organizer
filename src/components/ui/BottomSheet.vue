<script setup lang="ts">
defineProps<{
  isOpen: boolean
  title?: string
}>()

defineEmits<{
  close: []
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet-backdrop">
      <div v-if="isOpen" class="backdrop" @click="$emit('close')" />
    </Transition>
    <Transition name="sheet">
      <div v-if="isOpen" class="sheet" role="dialog" @click.stop>
        <div class="sheet-handle" />
        <div v-if="title" class="sheet-title">{{ title }}</div>
        <slot />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.56);
  z-index: 1000;
}

.sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1001;
  background: var(--surface);
  border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  border: 1px solid var(--border-soft);
  border-bottom: none;
  padding: 12px var(--screen-pad) 0;
  padding-bottom: calc(24px + var(--safe-bottom));
  max-height: 92dvh;
  overflow-y: auto;
}

.sheet-handle {
  width: 36px;
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  margin: 0 auto 20px;
}

.sheet-title {
  font-family: var(--font-headline);
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 20px;
}

.sheet-enter-active,
.sheet-leave-active {
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}

.sheet-enter-from,
.sheet-leave-to {
  transform: translateY(100%);
}

.sheet-backdrop-enter-active,
.sheet-backdrop-leave-active {
  transition: opacity 0.28s ease;
}

.sheet-backdrop-enter-from,
.sheet-backdrop-leave-to {
  opacity: 0;
}
</style>
