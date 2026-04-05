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
        <h1 class="text-3xl font-bold text-indigo-600">Couple Organizer</h1>
        <p class="text-gray-500 mt-2">Organize your life together</p>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <h2 class="text-xl font-semibold text-center">
          {{ isRegister ? 'Create Account' : 'Welcome Back' }}
        </h2>

        <!-- Display Name (register only) -->
        <div v-if="isRegister">
          <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            v-model="displayName"
            type="text"
            required
            placeholder="Your name"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            v-model="email"
            type="email"
            required
            placeholder="you@example.com"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            v-model="password"
            type="password"
            required
            minlength="6"
            placeholder="At least 6 characters"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>

        <!-- Error message -->
        <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>

        <button
          type="submit"
          :disabled="submitting"
          class="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {{ submitting ? 'Please wait...' : (isRegister ? 'Sign Up' : 'Log In') }}
        </button>

        <p class="text-center text-sm text-gray-500">
          {{ isRegister ? 'Already have an account?' : "Don't have an account?" }}
          <button
            type="button"
            @click="isRegister = !isRegister"
            class="text-indigo-600 font-medium hover:underline ml-1"
          >
            {{ isRegister ? 'Log In' : 'Sign Up' }}
          </button>
        </p>
      </form>
    </div>
  </div>
</template>
