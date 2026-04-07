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
  <ion-page>
    <ion-content class="ion-padding">
      <div class="min-h-full flex items-center justify-center">
        <div class="w-full max-w-sm">
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-green-500">Paarplaner</h1>
            <p class="text-slate-400 mt-2">Paar einrichten</p>
          </div>

          <div class="space-y-6">
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
              <ion-button expand="block" @click="goToDashboard">
                Zur Übersicht
              </ion-button>
            </div>

            <!-- Default: create or join -->
            <template v-else>
              <div>
                <h3 class="font-semibold text-lg mb-3">Paar erstellen</h3>
                <ion-button expand="block" @click="handleCreate" :disabled="loading">
                  {{ loading ? 'Erstelle...' : 'Neues Paar erstellen' }}
                </ion-button>
              </div>

              <div class="relative">
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-slate-700"></div>
                </div>
                <div class="relative flex justify-center text-sm">
                  <span class="bg-slate-900 px-4 text-slate-400">oder</span>
                </div>
              </div>

              <div>
                <h3 class="font-semibold text-lg mb-3">Mit Einladungscode beitreten</h3>
                <div class="flex gap-2">
                  <ion-input
                    v-model="inviteInput"
                    type="text"
                    placeholder="Code eingeben"
                    :maxlength="6"
                    fill="outline"
                    class="flex-1 uppercase tracking-widest font-mono text-center"
                  />
                  <ion-button
                    @click="handleJoin"
                    :disabled="loading || inviteInput.length < 6"
                  >
                    Beitreten
                  </ion-button>
                </div>
              </div>
            </template>

            <p v-if="error" class="text-red-400 text-sm text-center">{{ error }}</p>

            <ion-button
              expand="block"
              fill="clear"
              color="medium"
              @click="logout"
            >
              Abmelden
            </ion-button>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>
