<template>
  <header>
    <nav>
      <router-link to="/dashboard" class="nav-button" v-if="isAuthenticated">
        Meu Painel
      </router-link>
      <router-link to="/signin" class="nav-button" v-if="!isAuthenticated">
        Login
      </router-link>
      <button
        v-if="isAuthenticated"
        @click="handleSignOut"
        class="nav-button sign-out-button"
      >
        Sair
      </button>
    </nav>
  </header>
</template>

<script setup>
import { useAuth } from "@/composables/useAuth";

const { isAuthenticated, handleSignOut } = useAuth();
</script>

<style scoped>
/* Your existing styles remain the same */
header {
  background: #2c3e50;
  padding: 1rem;
}

nav {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.nav-button {
  color: white;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.nav-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.sign-out-button {
  background: none;
  border: 1px solid white;
  cursor: pointer;
}

.sign-out-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
}
</style>
