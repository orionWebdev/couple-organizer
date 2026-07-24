import { ref, readonly } from 'vue'

// Der zentrale KI-Hub — ein Singleton wie useToast/usePaywall/useFab. Der
// dauerhafte KI-Button (AiHubButton, global im TabsView) öffnet ihn, das einmal
// gemountete AiHubModal (ebenfalls im TabsView) reagiert darauf. Damit gibt es
// GENAU EINEN KI-Einstieg in der ganzen App — die früheren verstreuten
// AiButton/AiTriggerBadge-Auslöser sind eingesammelt.

const isOpen = ref(false)

export function openAiHub() {
  isOpen.value = true
}

export function closeAiHub() {
  isOpen.value = false
}

export function useAiHub() {
  return { isOpen: readonly(isOpen), openAiHub, closeAiHub }
}
