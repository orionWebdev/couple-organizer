<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { login, register, error } = useAuth()

const isRegister = ref(false)
const email = ref('')
const password = ref('')
const displayName = ref('')
const submitting = ref(false)

async function handleSubmit() {
  submitting.value = true
  try {
    if (isRegister.value) {
      await register(email.value, password.value, displayName.value)
    } else {
      await login(email.value, password.value)
    }
    router.push('/')
  } catch {
    // error is set by useAuth
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <!-- Logo / Title -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-green-500">Paarplaner</h1>
        <p class="text-slate-400 mt-2">Gemeinsam organisiert</p>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="bg-slate-800 rounded-2xl border border-slate-700 p-6 space-y-4">
        <h2 class="text-xl font-semibold text-center text-slate-100">
          {{ isRegister ? 'Konto erstellen' : 'Willkommen zurück' }}
        </h2>

        <!-- Display Name (register only) -->
        <div v-if="isRegister">
          <label class="block text-sm font-medium text-slate-300 mb-1">Name</label>
          <input
            v-model="displayName"
            type="text"
            required
            placeholder="Dein Name"
            class="w-full px-3 py-2.5 border border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-300 mb-1">E-Mail</label>
          <input
            v-model="email"
            type="email"
            required
            placeholder="du@beispiel.de"
            class="w-full px-3 py-2.5 border border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-300 mb-1">Passwort</label>
          <input
            v-model="password"
            type="password"
            required
            minlength="6"
            placeholder="Mindestens 6 Zeichen"
            class="w-full px-3 py-2.5 border border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
          />
        </div>

        <!-- Error message -->
        <p v-if="error" class="text-red-400 text-sm">{{ error }}</p>

        <button
          type="submit"
          :disabled="submitting"
          class="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {{ submitting ? 'Bitte warten...' : (isRegister ? 'Registrieren' : 'Anmelden') }}
        </button>

        <p class="text-center text-sm text-slate-400">
          {{ isRegister ? 'Bereits ein Konto?' : 'Noch kein Konto?' }}
          <button
            type="button"
            @click="isRegister = !isRegister"
            class="text-green-400 font-medium hover:underline ml-1"
          >
            {{ isRegister ? 'Anmelden' : 'Registrieren' }}
          </button>
        </p>
      </form>
    </div>
  </div>
</template>
