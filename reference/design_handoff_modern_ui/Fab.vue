<!-- Skizze — passt sie an eure Komponentenstruktur/Stores an. Nur ein Muster. -->
<script setup>
/*
  Globaler, kontextabhängiger Plus-Button. EIN Exemplar im App-Shell
  (z. B. in App.vue innerhalb des Tab-Layouts), NICHT pro Screen.
  Ersetzt alle bisherigen Inline-"Hinzufügen"-Buttons: deren Aktion
  wird hier je aktivem Tab ausgelöst (Bottom-Sheet öffnen o. Ä.).
*/
import { computed } from "vue";
import { useRoute } from "vue-router";
// import { useSheets } from "@/stores/sheets"; // euer bestehendes Sheet-System

const route = useRoute();
// const sheets = useSheets();

// Aktiver Tab → welches Add-Sheet. An eure Routen-Namen anpassen.
const ADD_BY_TAB = {
  haushalt: { sheet: "add-chore",    label: "Aufgabe hinzufügen" },
  finanzen: { sheet: "add-expense",  label: "Ausgabe hinzufügen" },
  planung:  { sheet: "add-booking",  label: "Belegung/Idee hinzufügen" },
  essen:    { sheet: "add-meal",     label: "Gericht/Artikel hinzufügen" },
  start:    { sheet: "quick-add",    label: "Schnell hinzufügen" },
};

const action = computed(() => ADD_BY_TAB[route.meta?.tab] ?? ADD_BY_TAB.start);

function onAdd() {
  // sheets.open(action.value.sheet);
}
</script>

<template>
  <button class="fab" type="button" :aria-label="action.label" @click="onAdd">＋</button>
</template>

<!-- fab.css liefert das Styling (.fab). Farbe kommt automatisch aus --accent
     des aktiven Bereichs (area-*-Klasse liegt bei euch am Tab-Root). -->
