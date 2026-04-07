<script setup lang="ts">
import { ref, watch } from 'vue'
import { IonInput } from '@ionic/vue'
import AppSheetModal from '@/components/ui/AppSheetModal.vue'
import type { RecipeCategory, RecipeCategoryColor } from '@/types'

const props = defineProps<{
  isOpen: boolean
  category: Readonly<RecipeCategory> | null
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: { name: string; color: RecipeCategoryColor; icon: string }]
}>()

const COLORS: Array<{ key: RecipeCategoryColor; gradient: string; label: string }> = [
  { key: 'blue',   gradient: 'linear-gradient(135deg,#1e3a8a,#2563eb)', label: 'Blau'   },
  { key: 'green',  gradient: 'linear-gradient(135deg,#14532d,#15803d)', label: 'Grün'   },
  { key: 'yellow', gradient: 'linear-gradient(135deg,#713f12,#b45309)', label: 'Gelb'   },
  { key: 'red',    gradient: 'linear-gradient(135deg,#7f1d1d,#dc2626)', label: 'Rot'    },
  { key: 'purple', gradient: 'linear-gradient(135deg,#4c1d95,#7c3aed)', label: 'Lila'   },
  { key: 'orange', gradient: 'linear-gradient(135deg,#7c2d12,#c2410c)', label: 'Orange' },
  { key: 'pink',   gradient: 'linear-gradient(135deg,#831843,#be185d)', label: 'Pink'   },
  { key: 'teal',   gradient: 'linear-gradient(135deg,#134e4a,#0f766e)', label: 'Türkis' },
]

const name = ref('')
const icon = ref('')
const selectedColor = ref<RecipeCategoryColor>('green')
const formError = ref<string | null>(null)

watch(() => props.isOpen, (open) => {
  if (!open) return
  formError.value = null
  if (props.category) {
    name.value = props.category.name
    icon.value = props.category.icon ?? ''
    selectedColor.value = props.category.color
  } else {
    name.value = ''
    icon.value = ''
    selectedColor.value = 'green'
  }
})

function handleSubmit() {
  const cleanName = name.value.trim()
  if (!cleanName) { formError.value = 'Bitte einen Namen eingeben.'; return }
  emit('submit', { name: cleanName, color: selectedColor.value, icon: icon.value.trim() })
}
</script>

<template>
  <AppSheetModal
    :is-open="isOpen"
    :title="category ? 'Kategorie bearbeiten' : 'Neue Kategorie'"
    :breakpoints="[0, 0.72, 0.92]"
    :initial-breakpoint="0.72"
    close-label="Abbrechen"
    @close="emit('close')"
  >
    <div class="cat-form">
      <!-- Name + Icon row -->
      <div class="form-row">
        <div class="form-field icon-field">
          <label class="field-label">Emoji</label>
          <ion-input
            v-model="icon"
            placeholder="🍕"
            fill="outline"
            :clear-input="true"
          />
        </div>
        <div class="form-field flex-1">
          <label class="field-label">Name</label>
          <ion-input
            v-model="name"
            placeholder="z.B. Pasta"
            fill="outline"
            :clear-input="true"
          />
        </div>
      </div>

      <!-- Color picker -->
      <div class="form-field">
        <label class="field-label">Farbe</label>
        <div class="color-grid">
          <button
            v-for="c in COLORS"
            :key="c.key"
            class="color-swatch"
            :class="{ 'color-swatch--active': selectedColor === c.key }"
            :style="{ background: c.gradient }"
            :title="c.label"
            @click="selectedColor = c.key"
          >
            <svg
              v-if="selectedColor === c.key"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Preview -->
      <div class="cat-preview" :style="{ background: COLORS.find(c => c.key === selectedColor)?.gradient }">
        <span v-if="icon" class="cat-preview-icon">{{ icon }}</span>
        <span class="cat-preview-name">{{ name || 'Kategoriename' }}</span>
      </div>

      <p v-if="formError" class="form-error">{{ formError }}</p>

      <button class="submit-btn" @click="handleSubmit">
        {{ category ? 'Speichern' : 'Kategorie erstellen' }}
      </button>
    </div>
  </AppSheetModal>
</template>

<style scoped>
.cat-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding-bottom: 2rem;
}

.form-row {
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.flex-1 { flex: 1; }
.icon-field { width: 5rem; flex-shrink: 0; }

.field-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--app-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

/* Color grid */
.color-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 0.5rem;
}

.color-swatch {
  aspect-ratio: 1;
  border-radius: 0.625rem;
  border: 2px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.12s, border-color 0.12s;
}

.color-swatch--active {
  border-color: rgba(255, 255, 255, 0.6);
  transform: scale(1.1);
}

.color-swatch:active { transform: scale(0.92); }

/* Preview */
.cat-preview {
  border-radius: 1rem;
  padding: 1rem 1.125rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background 0.3s;
}

.cat-preview-icon {
  font-size: 1.25rem;
  line-height: 1;
}

.cat-preview-name {
  font-size: 1rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
}

/* Error */
.form-error {
  font-size: 0.8125rem;
  color: #f87171;
  margin: 0;
  padding: 0.5rem 0.75rem;
  background: rgba(239, 68, 68, 0.08);
  border-radius: 0.625rem;
}

/* Submit */
.submit-btn {
  width: 100%;
  padding: 0.9375rem;
  background: var(--app-primary);
  color: #fff;
  font-family: var(--ion-font-family);
  font-weight: 700;
  font-size: 1rem;
  border: 0;
  border-radius: 1rem;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.14s, transform 0.1s;
}

.submit-btn:active { transform: scale(0.98); background: var(--app-primary-strong); }
</style>
