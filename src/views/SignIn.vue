<template>
  <div class="signin-container">
    <h1>Login - Escritório de Advocacia</h1>
    <form @submit.prevent="handleSignIn">
      <div class="form-group">
        <label>E-mail</label>
        <input
          v-model="email"
          type="email"
          required
          :disabled="isLoading || isRateLimited"
        />
      </div>

      <div class="form-group">
        <label>Senha</label>
        <input
          v-model="password"
          type="password"
          required
          :disabled="isLoading || isRateLimited"
        />
      </div>

      <button
        type="submit"
        :disabled="isLoading || isRateLimited"
        class="submit-btn"
      >
        <span v-if="isLoading">Carregando...</span>
        <span v-else>Entrar</span>
      </button>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      <div v-if="authError" class="error-message">
        Authentication error: {{ authError.message }}
      </div>

      <div v-if="isRateLimited" class="rate-limit-message">
        Muitas tentativas. Tente novamente em {{ cooldownTime }} segundos.
      </div>

      <router-link to="/forgot-password">Esqueci minha senha</router-link>
    </form>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { getAuth, signInWithEmailAndPassword } from "@firebase/auth";
import { useRouter } from "vue-router";
import { useAuth } from '@/composables/useAuth';

const { authError } = useAuth();

// Rate limiting variables
const RATE_LIMIT_THRESHOLD = 5; // Max attempts
const RATE_LIMIT_COOLDOWN = 30; // Seconds to cooldown

const email = ref("");
const password = ref("");
const error = ref("");
const isLoading = ref(false);
const isRateLimited = ref(false);
const cooldownTime = ref(RATE_LIMIT_COOLDOWN);
const attemptCount = ref(0);
const lastAttemptTime = ref(null);

const router = useRouter();
const auth = getAuth();

// Rate limiting cooldown timer
let cooldownInterval;

const startCooldown = () => {
  isRateLimited.value = true;
  cooldownInterval = setInterval(() => {
    cooldownTime.value--;
    if (cooldownTime.value <= 0) {
      clearInterval(cooldownInterval);
      isRateLimited.value = false;
      cooldownTime.value = RATE_LIMIT_COOLDOWN;
      attemptCount.value = 0;
    }
  }, 1000);
};

const handleSignIn = async () => {
  // Rate limiting check
  const now = Date.now();
  if (lastAttemptTime.value && now - lastAttemptTime.value < 10000) {
    attemptCount.value++;
  } else {
    attemptCount.value = 1;
  }
  lastAttemptTime.value = now;

  if (attemptCount.value >= RATE_LIMIT_THRESHOLD) {
    startCooldown();
    error.value = "Muitas tentativas em curto período. Por favor aguarde.";
    return;
  }

  isLoading.value = true;
  error.value = "";

  try {
    await signInWithEmailAndPassword(auth, email.value, password.value);
    router.push("/dashboard");
  } catch (err) {
    switch (err.code) {
      case "auth/user-not-found":
        error.value = "Usuário não encontrado";
        break;
      case "auth/wrong-password":
        error.value = "Senha incorreta";
        break;
      case "auth/too-many-requests":
        error.value =
          "Acesso temporariamente bloqueado devido a muitas tentativas";
        startCooldown();
        break;
      default:
        error.value = "Erro ao fazer login. Tente novamente.";
    }
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.signin-container {
  max-width: 400px;
  margin: 2rem auto;
  padding: 2rem;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.form-group {
  margin-bottom: 1rem;
}

input {
  width: 100%;
  padding: 0.5rem;
  margin-top: 0.3rem;
}

.submit-btn {
  width: 100%;
  padding: 0.7rem;
  background-color: #2c3e50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.submit-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.error-message {
  color: red;
  margin: 1rem 0;
}

.rate-limit-message {
  color: orange;
  margin: 1rem 0;
}
</style>
