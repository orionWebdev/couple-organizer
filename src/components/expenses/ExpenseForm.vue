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
  <form @submit.prevent="handleSubmit" class="expense-form">
    <h3 class="expense-form-title">Ausgabe hinzufügen</h3>

    <input
      v-model="title"
      type="text"
      placeholder="Wofür war das?"
      required
      class="app-field"
    />

    <div class="flex gap-2">
      <div class="app-field-wrap flex-1">
        <span class="app-field-prefix">€</span>
        <input
          v-model="amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0,00"
          required
          class="app-field app-field--with-prefix"
        />
      </div>

      <select
        v-model="paidBy"
        v-if="couple"
        class="app-field app-select"
        style="width: auto; min-width: 6.5rem;"
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
      class="expense-submit-btn"
    >
      Ausgabe hinzufügen
    </button>
  </form>
</template>

<style scoped>
.expense-form {
  background: rgba(23, 32, 51, 0.92);
  border: 1px solid rgba(71, 85, 105, 0.72);
  border-radius: 1.25rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.expense-form-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--app-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0;
}

.expense-submit-btn {
  width: 100%;
  padding: 0.75rem 1.5rem;
  background: var(--app-primary);
  color: #fff;
  font-family: var(--ion-font-family);
  font-weight: 700;
  font-size: 0.9375rem;
  border: 0;
  border-radius: 0.875rem;
  cursor: pointer;
  transition: background 0.14s, transform 0.1s;
  -webkit-tap-highlight-color: transparent;
}

.expense-submit-btn:active {
  background: var(--app-primary-strong);
  transform: scale(0.98);
}
</style>
