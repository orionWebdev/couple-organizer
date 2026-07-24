<script setup lang="ts">
// Alltag › Geld. Bettet die bestehende Finanzen-View ein — Saldo, Events,
// Ausgaben, Event-Detail, Begleichen und die Monatsanalyse bleiben mitsamt
// ihrer Logik (isPaid-Achsen, Settlement) unverändert. AlltagView trägt die
// Kopfzeile; der eigene Segmentumschalter wird über `embedded` sekundär.
import FinanzenView from '@/views/FinanzenView.vue'

const emit = defineEmits<{ subview: [active: boolean] }>()
</script>

<template>
  <FinanzenView embedded @subview="emit('subview', $event)" />
</template>
