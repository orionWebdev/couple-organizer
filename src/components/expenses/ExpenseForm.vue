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

  // Convert dollars to cents
  const cents = Math.round(a * 100)
  emit('add', t, cents, paidBy.value)

  title.value = ''
  amount.value = ''
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="bg-white rounded-xl shadow-sm p-4 space-y-3">
    <h3 class="font-semibold text-sm text-gray-500 uppercase tracking-wide">Add Expense</h3>

    <input
      v-model="title"
      type="text"
      placeholder="What was it for?"
      required
      class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
    />

    <div class="flex gap-2">
      <div class="relative flex-1">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
        <input
          v-model="amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          required
          class="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        />
      </div>

      <select
        v-model="paidBy"
        v-if="couple"
        class="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
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
      class="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
    >
      Add Expense
    </button>
  </form>
</template>
