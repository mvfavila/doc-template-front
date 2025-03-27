<template>
  <header class="app-header">
    <router-link to="/" class="logo"> Escritório Advogados </router-link>
    <nav>
      <router-link v-if="!isAuthenticated" to="/login" class="login-button">
        Login
      </router-link>
      <router-link v-else to="/dashboard" class="dashboard-button">
        Meu Painel
      </router-link>
    </nav>
  </header>
</template>

<script setup>
import { computed } from "vue";
import { useAuth } from "@/composables/useAuth";

const { isAuthenticated } = useAuth();
</script>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  padding: 1rem 2rem;
  background-color: #2c3e50;
  color: white;
}

.logo {
  color: white;
  text-decoration: none;
  font-weight: bold;
}

.login-button,
.dashboard-button {
  padding: 0.5rem 1rem;
  background-color: #42b983;
  color: white;
  text-decoration: none;
  border-radius: 4px;
}
</style>
