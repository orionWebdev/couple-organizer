<script setup lang="ts">
// Alltag › Küche. Bettet die bestehende Küchen-View (Wochenplan · Einkaufsliste
// · Rezepte) ein — deren gesamte Logik (Einkaufsmodus, Listendetail,
// KI-Vorschläge, Rezept-Wiki, FAB, Back-Dismiss) bleibt unverändert erhalten.
// AlltagView trägt die Kopfzeile; der eigene Segmentumschalter der View wird
// über `embedded` zur sekundären Ebene.
import EinkaufenView from '@/views/EinkaufenView.vue'

const emit = defineEmits<{ subview: [active: boolean] }>()
</script>

<template>
  <EinkaufenView embedded @subview="emit('subview', $event)" />
</template>
