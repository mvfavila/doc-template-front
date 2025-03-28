<template>
  <AppHeader />
  <router-view />
</template>

<script setup>
import AppHeader from "@/components/AppHeader.vue";
import { auth } from "@/firebase";
</script>

<style>
/* Global styles */
body {
  margin: 0;
  font-family: Arial, sans-serif;
  line-height: 1.6;
  color: #333;
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
</style>
