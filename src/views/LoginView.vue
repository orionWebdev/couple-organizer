<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonPage,
  IonContent,
  IonInput,
  IonButton
} from '@ionic/vue'
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
  <ion-page>
    <ion-content class="ion-padding">
      <div class="min-h-full flex items-center justify-center">
        <div class="w-full max-w-sm">
          <!-- Logo / Title -->
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-green-500">Paarplaner</h1>
            <p class="text-slate-400 mt-2">Gemeinsam organisiert</p>
          </div>

          <!-- Form -->
          <div class="space-y-4">
            <h2 class="text-xl font-semibold text-center">
              {{ isRegister ? 'Konto erstellen' : 'Willkommen zurück' }}
            </h2>

            <ion-input
              v-if="isRegister"
              v-model="displayName"
              type="text"
              label="Name"
              label-placement="floating"
              fill="outline"
              placeholder="Dein Name"
              required
            />

            <ion-input
              v-model="email"
              type="email"
              label="E-Mail"
              label-placement="floating"
              fill="outline"
              placeholder="du@beispiel.de"
              required
            />

            <ion-input
              v-model="password"
              type="password"
              label="Passwort"
              label-placement="floating"
              fill="outline"
              placeholder="Mindestens 6 Zeichen"
              required
              :minlength="6"
            />

            <p v-if="error" class="text-red-400 text-sm">{{ error }}</p>

            <ion-button
              expand="block"
              @click="handleSubmit"
              :disabled="submitting"
            >
              {{ submitting ? 'Bitte warten...' : (isRegister ? 'Registrieren' : 'Anmelden') }}
            </ion-button>

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
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>
