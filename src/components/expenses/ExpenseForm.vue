<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import type { Couple } from '@/types'

defineProps<{
  couple: Couple | null
}>()

const emit = defineEmits<{
  add: [title: string, amountInCents: number, paidBy: string]
}>()

const { user } = useAuth()

const title = ref('')
const amount = ref('')
const paidBy = ref(user.value?.uid || '')

function handleSubmit() {
  const t = title.value.trim()
  const a = parseFloat(amount.value)
  if (!t || isNaN(a) || a <= 0 || !paidBy.value) return

  // Convert euros to cents
  const cents = Math.round(a * 100)
  emit('add', t, cents, paidBy.value)

  title.value = ''
  amount.value = ''
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-3">
    <h3 class="font-semibold text-sm text-slate-400 uppercase tracking-wide">Ausgabe hinzufügen</h3>

    <input
      v-model="title"
      type="text"
      placeholder="Wofür war das?"
      required
      class="w-full px-3 py-2.5 border border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
    />

    <div class="flex gap-2">
      <div class="relative flex-1">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
        <input
          v-model="amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0,00"
          required
          class="w-full pl-8 pr-3 py-2.5 border border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
        />
      </div>

      <select
        v-model="paidBy"
        v-if="couple"
        class="border border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-slate-700 text-slate-100 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
      >
        <option
          v-for="(name, uid) in couple.memberNames"
          :key="uid"
          :value="uid"
        >
          {{ name }}
        </option>
      </select>
    </div>

    <button
      type="submit"
      class="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
    >
      Ausgabe hinzufügen
    </button>
  </form>
</template>
