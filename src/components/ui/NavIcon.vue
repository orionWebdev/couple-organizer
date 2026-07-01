<script setup lang="ts">
defineProps<{
  name: 'finanzen' | 'haushalt' | 'einkaufen'
  size?: number
}>()
</script>

<template>
  <svg
    :width="size ?? 22"
    :height="size ?? 22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <template v-if="name === 'finanzen'">
      <path d="M3 7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1h1a1 1 0 0 1 1 1v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
      <circle cx="16.5" cy="13" r="1" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'haushalt'">
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
      <path d="M10 20v-5h4v5" />
    </template>
    <template v-else>
      <path d="M7 9V7a5 5 0 0 1 10 0v2" />
      <rect x="4" y="9" width="16" height="12" rx="2" />
    </template>
  </svg>
</template>
