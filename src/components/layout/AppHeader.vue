<script setup lang="ts">
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'

const { user, logout } = useAuth()
const { couple } = useCouple()
</script>

<template>
  <header class="bg-white shadow-sm sticky top-0 z-10">
    <div class="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-bold text-indigo-600">Couple Organizer</h1>
        <p v-if="couple" class="text-xs text-gray-500">
          {{ Object.values(couple.memberNames).join(' & ') }}
        </p>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-sm text-gray-600">{{ user?.displayName }}</span>
        <button
          @click="logout"
          class="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          title="Log out"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>
