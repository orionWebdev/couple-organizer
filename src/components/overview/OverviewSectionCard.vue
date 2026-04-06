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
        class="rounded-full px-4 py-2 text-sm font-medium transition"
        :class="dark ? 'bg-slate-700/80 text-slate-100 hover:bg-slate-700' : 'bg-emerald-500/12 text-emerald-300 hover:bg-emerald-500/18'"
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
</style>
