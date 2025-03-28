<template>
  <div class="document-list">
    <div v-for="document in documents" :key="document.id" class="document-item">
      <div class="document-info">
        <h3>{{ document.name }}</h3>
        <p>Criado em: {{ formatDate(document.createdAt) }}</p>
        <p v-if="document.assignedTo">
          Atribuído a: {{ document.assignedToName }}
        </p>
      </div>
      <button @click="$emit('assign', document)" class="assign-btn">
        Atribuir
      </button>
    </div>
  </div>
</template>

<script setup>
import { format } from "date-fns";

defineProps({
  documents: {
    type: Array,
    required: true,
    default: () => [],
  },
});

defineEmits(["assign"]);

const formatDate = (timestamp) => {
  return format(new Date(timestamp), "dd/MM/yyyy HH:mm");
};
</script>

<style scoped>
.document-list {
  margin-top: 1rem;
}

.document-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  margin-bottom: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.assign-btn {
  background-color: #2c3e50;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}
</style>
