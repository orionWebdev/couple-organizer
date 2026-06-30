<script setup lang="ts">
import { ref } from 'vue'
import { useCouple } from '@/composables/useCouple'
import { useAuth } from '@/composables/useAuth'
import { useRouter } from 'vue-router'
import InviteCodeBox from '@/components/couple/InviteCodeBox.vue'

const { createCouple, joinCouple, loading, error } = useCouple()
const { logout } = useAuth()
const router = useRouter()

const mode = ref<'choose' | 'create' | 'join' | 'created'>('choose')
const inviteCode = ref('')
const createdCode = ref('')
const localError = ref('')

async function handleCreate() {
  localError.value = ''
  const code = await createCouple()
  if (code) {
    createdCode.value = code
    mode.value = 'created'
  } else {
    localError.value = error.value || ''
  }
}

async function handleJoin() {
  localError.value = ''
  if (!inviteCode.value.trim()) return
  await joinCouple(inviteCode.value.trim())
  if (!error.value) router.push('/')
  else localError.value = error.value || ''
}

async function handleLogout() {
  await logout()
  router.push('/login')
}
</script>

<template>
  <div class="setup-page">
    <div class="setup-inner">
      <div class="setup-header">
        <h1 class="setup-title">Paarplaner</h1>
        <p class="setup-sub">Verbinde dich mit deiner Person</p>
      </div>

      <!-- Choose mode -->
      <div v-if="mode === 'choose'" class="setup-actions">
        <button class="btn-primary" @click="mode = 'create'">
          Neues Paar erstellen
        </button>
        <button class="btn-secondary" @click="mode = 'join'">
          Mit Code beitreten
        </button>
      </div>

      <!-- Create couple -->
      <div v-else-if="mode === 'create'" class="setup-card">
        <p class="setup-info">
          Erstelle ein neues Paar und teile den Einladungscode mit deiner Person.
        </p>
        <p v-if="localError" class="error-msg">{{ localError }}</p>
        <button class="btn-primary" :disabled="loading" @click="handleCreate">
          {{ loading ? 'Erstellen…' : 'Paar erstellen' }}
        </button>
        <button class="back-btn" @click="mode = 'choose'">Zurück</button>
      </div>

      <!-- Couple created – show invite code -->
      <div v-else-if="mode === 'created'" class="setup-card">
        <p class="setup-info">
          Dein Paar ist erstellt! Teile diesen Code mit deiner Person,
          damit sie beitreten kann.
        </p>
        <InviteCodeBox :code="createdCode" />
        <button class="btn-primary" @click="router.push('/')">Weiter zur App</button>
      </div>

      <!-- Join couple -->
      <div v-else-if="mode === 'join'" class="setup-card">
        <p class="setup-info">Gib den Einladungscode deiner Person ein:</p>
        <input
          v-model="inviteCode"
          class="app-field invite-input"
          type="text"
          placeholder="XXXXXX"
          maxlength="6"
          autocomplete="off"
          spellcheck="false"
          @input="inviteCode = inviteCode.toUpperCase()"
        />
        <p v-if="localError" class="error-msg">{{ localError }}</p>
        <button class="btn-primary" :disabled="loading || !inviteCode.trim()" @click="handleJoin">
          {{ loading ? 'Verbinden…' : 'Beitreten' }}
        </button>
        <button class="back-btn" @click="mode = 'choose'">Zurück</button>
      </div>

      <button class="logout-btn" @click="handleLogout">Abmelden</button>
    </div>
  </div>
</template>

<style scoped>
.setup-page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px var(--screen-pad);
  background: var(--bg);
}

.setup-inner {
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.setup-header {
  text-align: center;
}

.setup-title {
  font-size: 26px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 6px;
}

.setup-sub {
  font-size: 14px;
  color: var(--text-faint);
  margin: 0;
}

.setup-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn-secondary {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 14px 20px;
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 14px;
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s ease;
}

.btn-secondary:active {
  background: var(--surface-deep);
}

.setup-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setup-info {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

.invite-input {
  font-family: 'Geist Mono', monospace;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-align: center;
  text-transform: uppercase;
}

.error-msg {
  font-size: 13px;
  color: var(--danger);
  margin: 0;
}

.back-btn {
  background: none;
  border: none;
  color: var(--text-faint);
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  font-size: 14px;
  cursor: pointer;
  padding: 8px;
  text-align: center;
}

.logout-btn {
  background: none;
  border: none;
  color: var(--text-faint);
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  font-size: 13px;
  cursor: pointer;
  padding: 8px;
  text-align: center;
  margin-top: 8px;
}
</style>
