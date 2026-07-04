<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useRouter } from 'vue-router'

const { login, register } = useAuth()
const router = useRouter()

const mode = ref<'login' | 'register'>('login')
const email = ref('')
const password = ref('')
const displayName = ref('')
const loading = ref(false)
const localError = ref('')

async function submit() {
  localError.value = ''
  loading.value = true
  try {
    if (mode.value === 'login') {
      await login(email.value, password.value)
    } else {
      await register(email.value, password.value, displayName.value)
    }
    router.push('/')
  } catch (e: any) {
    localError.value = e.message || 'Ein Fehler ist aufgetreten.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-inner">
      <div class="login-header">
        <h1 class="app-name">Paarplaner</h1>
        <p class="app-tagline">Gemeinsam organisiert</p>
      </div>

      <form class="login-form" @submit.prevent="submit">
        <input
          v-if="mode === 'register'"
          v-model="displayName"
          class="app-field"
          type="text"
          placeholder="Dein Name"
          autocomplete="name"
          required
        />

        <input
          v-model="email"
          class="app-field"
          type="email"
          placeholder="E-Mail"
          autocomplete="email"
          required
        />

        <input
          v-model="password"
          class="app-field"
          type="password"
          :placeholder="mode === 'register' ? 'Passwort wählen' : 'Passwort'"
          autocomplete="current-password"
          required
        />

        <p v-if="localError" class="error-msg">{{ localError }}</p>

        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? 'Laden…' : mode === 'login' ? 'Anmelden' : 'Registrieren' }}
        </button>
      </form>

      <button class="toggle-btn" @click="mode = mode === 'login' ? 'register' : 'login'">
        {{ mode === 'login' ? 'Noch kein Konto? Registrieren' : 'Bereits ein Konto? Anmelden' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px var(--screen-pad);
  background:
    radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--accent) 7%, transparent) 0%, transparent 40%),
    var(--bg);
}

.login-inner {
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.login-header {
  text-align: center;
}

.app-name {
  font-family: var(--font-headline);
  font-size: 38px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 6px;
}

.app-tagline {
  font-size: 14px;
  color: var(--text-faint);
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.error-msg {
  font-size: 13px;
  color: var(--danger);
  margin: 0;
}

.toggle-btn {
  background: none;
  border: none;
  color: var(--accent);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  text-align: center;
  padding: 8px;
}
</style>
