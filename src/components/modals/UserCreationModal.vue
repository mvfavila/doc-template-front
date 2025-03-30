<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h2>Adicionar Novo Cliente</h2>
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>Nome Completo</label>
          <input v-model="form.name" type="text" required />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input v-model="form.email" type="email" required />
        </div>
        <div class="form-actions">
          <button type="button" @click="$emit('close')" class="cancel-btn">
            Cancelar
          </button>
          <button type="submit" class="submit-btn">Criar Cliente</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

const form = ref({
  name: "",
  email: "",
});

const emit = defineEmits(["close", "user-created"]);

const handleSubmit = () => {
  emit("user-created", form.value);
  emit("close");
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  width: 100%;
  max-width: 500px;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
}

.form-group input {
  width: 100%;
  padding: 0.5rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

.cancel-btn {
  background-color: #ccc;
  color: #333;
}

.submit-btn {
  background-color: #42b983;
  color: white;
}
</style>
