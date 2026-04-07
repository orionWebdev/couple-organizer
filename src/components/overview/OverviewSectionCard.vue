<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  actionLabel?: string
  dark?: boolean
}>(), {
  title: '',
  actionLabel: '',
  dark: false
})

const emit = defineEmits<{
  action: []
}>()
</script>

<template>
  <section class="section-card" :class="{ 'section-card-dark': dark }">
    <div v-if="title || actionLabel" class="flex items-center justify-between gap-3 border-b border-slate-800/80 px-5 py-5">
      <h2 class="text-[1.4rem] font-semibold tracking-tight" :class="dark ? 'text-white' : 'text-slate-100'">
        {{ title }}
      </h2>
      <button
        v-if="actionLabel"
        type="button"
        class="section-card-action-button"
        @click="emit('action')"
      >
        {{ actionLabel }}
      </button>
    </div>

    <div class="px-5 py-4">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.section-card {
  overflow: hidden;
  border: 1px solid rgba(71, 85, 105, 0.5);
  border-radius: 1.9rem;
  background:
    linear-gradient(180deg, rgba(30, 41, 59, 0.97), rgba(15, 23, 42, 0.97));
  box-shadow: 0 18px 40px rgba(2, 6, 23, 0.24);
}

.section-card-dark {
  background:
    linear-gradient(180deg, rgba(16, 24, 44, 0.98), rgba(9, 14, 28, 0.98));
}

.section-card-action-button {
  border: 1px solid rgba(34, 197, 94, 0.28);
  border-radius: 9999px;
  padding: 0.5rem 1rem;
  background: rgba(34, 197, 94, 0.14);
  color: rgb(134 239 172);
  font-size: 0.875rem;
  font-weight: 600;
  transition: transform 150ms ease, background-color 150ms ease, border-color 150ms ease;
}

.section-card-action-button:hover {
  transform: translateY(-1px);
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.42);
}
</style>
