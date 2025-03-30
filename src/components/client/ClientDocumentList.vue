<template>
  <div class="document-list">
    <div v-for="document in documents" :key="document.id" class="document-item">
      <div class="document-info">
        <h3>{{ document.name }}</h3>
        <p>{{ document.description }}</p>
        <p v-if="showStatus">Status: {{ translateStatus(document.status) }}</p>
      </div>
      <button
        v-if="document.status === 'pending'"
        @click="$emit('submit', document.id)"
        class="submit-button"
      >
        Enviar
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  documents: {
    type: Array,
    required: true,
  },
  showStatus: {
    type: Boolean,
    default: false,
  },
});

const translateStatus = (status) => {
  const statusMap = {
    pending: "Pendente",
    submitted: "Enviado",
    approved: "Aprovado",
    rejected: "Rejeitado",
  };
  return statusMap[status] || status;
};
</script>

<style scoped>
.document-list {
  display: grid;
  gap: 1rem;
}

.document-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.submit-button {
  background-color: #42b983;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}
</style>
