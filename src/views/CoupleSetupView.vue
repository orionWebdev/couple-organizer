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
        <h1 class="text-3xl font-bold text-green-500">Paarplaner</h1>
        <p class="text-slate-400 mt-2">Paar einrichten</p>
      </div>

      <div class="bg-slate-800 rounded-2xl border border-slate-700 p-6 space-y-6">
        <!-- After creating: show invite code -->
        <div v-if="created && couple" class="text-center space-y-4">
          <h2 class="text-xl font-semibold text-green-400">Paar erstellt!</h2>
          <p class="text-slate-300">Teile diesen Einladungscode mit deinem Partner:</p>
          <div class="bg-slate-700 rounded-xl py-4 px-6">
            <span class="text-3xl font-mono font-bold tracking-widest text-green-400">
              {{ couple.inviteCode }}
            </span>
          </div>
          <p class="text-sm text-slate-400">Dein Partner gibt diesen Code ein, um beizutreten</p>
          <button
            @click="goToDashboard"
            class="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
          >
            Zur Übersicht
          </button>
        </div>

        <!-- Default: create or join -->
        <template v-else>
          <!-- Create -->
          <div>
            <h3 class="font-semibold text-lg mb-3 text-slate-100">Paar erstellen</h3>
            <button
              @click="handleCreate"
              :disabled="loading"
              class="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {{ loading ? 'Erstelle...' : 'Neues Paar erstellen' }}
            </button>
          </div>

          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-slate-700"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="bg-slate-800 px-4 text-slate-400">oder</span>
            </div>
          </div>

          <!-- Join -->
          <div>
            <h3 class="font-semibold text-lg mb-3 text-slate-100">Mit Einladungscode beitreten</h3>
            <div class="flex gap-2">
              <input
                v-model="inviteInput"
                type="text"
                placeholder="Code eingeben"
                maxlength="6"
                class="flex-1 px-3 py-2.5 border border-slate-600 rounded-xl uppercase tracking-widest font-mono text-center focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
              <button
                @click="handleJoin"
                :disabled="loading || inviteInput.length < 6"
                class="px-5 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                Beitreten
              </button>
            </div>
          </div>
        </template>

        <!-- Error -->
        <p v-if="error" class="text-red-400 text-sm text-center">{{ error }}</p>

        <!-- Logout -->
        <button
          @click="logout"
          class="w-full py-2 text-slate-500 text-sm hover:text-slate-300 transition-colors"
        >
          Abmelden
        </button>
      </div>
    </div>
  </div>
</template>
