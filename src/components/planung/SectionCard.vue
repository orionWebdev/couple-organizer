<script setup lang="ts">
defineProps<{
  icon?: string
  title: string
  count?: string | number
}>()
</script>

<template>
  <section class="section-card">
    <div class="section-head">
      <span v-if="icon" class="section-icon">{{ icon }}</span>
      <span class="section-title">{{ title }}</span>
      <span v-if="count != null" class="section-count">{{ count }}</span>
      <slot name="action" />
    </div>
    <slot />
  </section>
</template>

<style scoped>
.section-card {
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card);
  padding: 15px;
  box-shadow: var(--shadow-card);
}

.section-head {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 12px;
}

.section-icon {
  width: 28px;
  height: 28px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  font-size: 14px;
  background: var(--accent-tint);
  flex-shrink: 0;
}

.section-title {
  flex: 1;
  min-width: 0;
  font-family: var(--font-headline);
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
}

.section-count {
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 800;
  color: var(--accent);
  background: var(--accent-tint);
  white-space: nowrap;
}
</style>
