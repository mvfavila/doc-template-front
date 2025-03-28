<template>
  <header class="app-header">
    <router-link to="/" class="logo"> Escritório Advogados </router-link>
    <nav>
      <template v-if="!isLoading">
        <router-link v-if="!isAuthenticated" to="/signin" class="login-button">
          Login
        </router-link>
        <router-link v-else to="/dashboard" class="dashboard-button">
          Meu Painel
        </router-link>
      </template>
    </nav>
  </header>
</template>

<script setup>
import { useAuth } from "@/composables/useAuth";

const { isAuthenticated, isLoading } = useAuth();
</script>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: #2c3e50;
  color: white;
}

.logo {
  color: white;
  text-decoration: none;
  font-weight: bold;
  font-size: 1.2rem;
}

.login-button,
.dashboard-button {
  padding: 0.5rem 1rem;
  background-color: #42b983;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.login-button:hover,
.dashboard-button:hover {
  background-color: #3aa876;
}
</style>
