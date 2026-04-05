<script setup lang="ts">
import { useAuth } from '@/composables/useAuth'

const { loading } = useAuth()
</script>

<template>
  <!-- Global loading state while auth initializes -->
  <div v-if="loading" class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-r-transparent"></div>
      <p class="mt-2 text-gray-500 text-sm">Loading...</p>
    </div>
  </div>

  <router-view v-else />
</template>
