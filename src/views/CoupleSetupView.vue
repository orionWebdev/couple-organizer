<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'

const router = useRouter()
const { logout } = useAuth()
const { couple, loading, error, createCouple, joinCouple } = useCouple()

const inviteInput = ref('')
const created = ref(false)

async function handleCreate() {
  await createCouple()
  created.value = true
}

async function handleJoin() {
  await joinCouple(inviteInput.value)
  if (!error.value) {
    router.push('/')
  }
}

function goToDashboard() {
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-indigo-600">Couple Organizer</h1>
        <p class="text-gray-500 mt-2">Set up your couple</p>
      </div>

      <div class="bg-white rounded-2xl shadow-lg p-6 space-y-6">
        <!-- After creating: show invite code -->
        <div v-if="created && couple" class="text-center space-y-4">
          <h2 class="text-xl font-semibold text-green-600">Couple Created!</h2>
          <p class="text-gray-600">Share this invite code with your partner:</p>
          <div class="bg-gray-100 rounded-xl py-4 px-6">
            <span class="text-3xl font-mono font-bold tracking-widest text-indigo-600">
              {{ couple.inviteCode }}
            </span>
          </div>
          <p class="text-sm text-gray-500">Your partner enters this code to join</p>
          <button
            @click="goToDashboard"
            class="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>

        <!-- Default: create or join -->
        <template v-else>
          <!-- Create -->
          <div>
            <h3 class="font-semibold text-lg mb-3">Create a Couple</h3>
            <button
              @click="handleCreate"
              :disabled="loading"
              class="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {{ loading ? 'Creating...' : 'Create New Couple' }}
            </button>
          </div>

          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-200"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="bg-white px-4 text-gray-500">or</span>
            </div>
          </div>

          <!-- Join -->
          <div>
            <h3 class="font-semibold text-lg mb-3">Join with Invite Code</h3>
            <div class="flex gap-2">
              <input
                v-model="inviteInput"
                type="text"
                placeholder="Enter code"
                maxlength="6"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg uppercase tracking-widest font-mono text-center focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
              <button
                @click="handleJoin"
                :disabled="loading || inviteInput.length < 6"
                class="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                Join
              </button>
            </div>
          </div>
        </template>

        <!-- Error -->
        <p v-if="error" class="text-red-500 text-sm text-center">{{ error }}</p>

        <!-- Logout -->
        <button
          @click="logout"
          class="w-full py-2 text-gray-500 text-sm hover:text-gray-700 transition-colors"
        >
          Log out
        </button>
      </div>
    </div>
  </div>
</template>
