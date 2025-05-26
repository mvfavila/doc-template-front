<template>
  <div class="document-list">
    <div v-if="documents.length === 0" class="empty-state">
      Nenhum documento encontrado
    </div>

    <div v-for="document in documents" :key="document.id" class="document-item">
      <div class="document-info">
        <h3>{{ document.templateName || 'Documento sem nome' }}</h3>
        <div class="document-meta">
          <span class="status-badge" :class="document.status">
            {{ statusMapper ? statusMapper(document.status) : document.status }}
          </span>
          <span>Criado em: {{ formatDate(document.createdAt) }}</span>
          <span v-if="document.customerId">
            Cliente: {{ getCustomerName(document.customerId) }}
          </span>
        </div>
      </div>

      <div class="document-actions">
        <button 
          v-if="!readonly" 
          @click="handleAction(document)"
          class="action-btn primary"
        >
          {{ document.status === 'submitted' ? 'Revisar' : 'Editar' }}
        </button>
        <button 
          v-if="document.assignedTo && !readonly"
          @click="$emit('assign', document)"
          class="action-btn secondary"
        >
          Reatribuir
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { format } from "date-fns";
import { computed } from 'vue';

const props = defineProps({
  documents: {
    type: Array,
    required: true,
    default: () => [],
  },
  readonly: {
    type: Boolean,
    default: false,
  },
  statusMapper: {
    type: Function,
    default: null,
  },
  customers: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['edit', 'review', 'assign']);

const formatDate = (timestamp) => {
  if (!timestamp) return 'Data não disponível';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return format(date, "dd/MM/yyyy 'às' HH:mm");
};

const getCustomerName = (customerId) => {
  const customer = props.customers.find(c => c.id === customerId);
  return customer?.name || `Cliente #${customerId.slice(0, 5)}`;
};

const handleAction = (document) => {
  if (document.status === 'submitted') {
    emit('review', document);
  } else {
    emit('edit', document);
  }
};
</script>

<style scoped>
.document-list {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.document-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: transform 0.2s;
}

.document-item:hover {
  transform: translateY(-2px);
}

.document-info {
  flex: 1;
}

.document-info h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  color: #2c3e50;
}

.document-meta {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  font-size: 0.9rem;
  color: #666;
}

.document-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  font-weight: 500;
  white-space: nowrap;
}

.action-btn.primary {
  background-color: #2c3e50;
  color: white;
}

.action-btn.secondary {
  background-color: #f0f0f0;
  color: #2c3e50;
  border: 1px solid #ddd;
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-badge.pending {
  background-color: #fff3cd;
  color: #856404;
}

.status-badge.submitted {
  background-color: #cce5ff;
  color: #004085;
}

.status-badge.approved {
  background-color: #d4edda;
  color: #155724;
}

.status-badge.completed {
  background-color: #e2e3e5;
  color: #383d41;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #666;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

@media (max-width: 768px) {
  .document-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .document-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>