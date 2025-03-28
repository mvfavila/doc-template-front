<template>
  <div class="client-list">
    <table v-if="clients.length > 0">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Email</th>
          <th>Documentos</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="client in clients" :key="client.id">
          <td>{{ client.name }}</td>
          <td>{{ client.email }}</td>
          <td>
            <button
              @click="$emit('view-documents', client.id)"
              class="action-btn"
            >
              Ver Documentos
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else>Nenhum cliente cadastrado</p>
  </div>
</template>

<script setup>
defineProps({
  clients: {
    type: Array,
    required: true,
    default: () => [],
  },
});

defineEmits(["view-documents"]);
</script>

<style scoped>
.client-list {
  margin-top: 1rem;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.action-btn {
  background-color: #42b983;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}
</style>
