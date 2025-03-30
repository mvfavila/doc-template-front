<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h2>Atribuir Documento</h2>
      <p><strong>Documento:</strong> {{ document.name }}</p>

      <div class="form-group">
        <label>Selecione o Cliente</label>
        <select v-model="selectedClientId">
          <option v-for="client in clients" :key="client.id" :value="client.id">
            {{ client.name }} ({{ client.email }})
          </option>
        </select>
      </div>

      <div class="form-actions">
        <button type="button" @click="$emit('close')" class="cancel-btn">
          Cancelar
        </button>
        <button
          type="button"
          @click="handleAssign"
          class="submit-btn"
          :disabled="!selectedClientId"
        >
          Atribuir
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

const props = defineProps({
  document: {
    type: Object,
    required: true,
  },
  clients: {
    type: Array,
    required: true,
    default: () => [],
  },
});

const emit = defineEmits(["close", "assigned"]);

const selectedClientId = ref(null);

const handleAssign = () => {
  emit("assigned", {
    documentId: props.document.id,
    clientId: selectedClientId.value,
  });
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

.form-group select {
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
  background-color: #2c3e50;
  color: white;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
