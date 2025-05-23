<template>
  <div class="document-list">
    <div v-if="documents.length === 0" class="empty-state">
      Nenhum documento encontrado
    </div>
    
    <div 
      v-for="document in documents" 
      :key="document.id" 
      class="document-item"
      @click="handleDocumentClick(document)"
    >
      <div class="document-info">
        <h3>{{ document.name }}</h3>
        
        <div class="document-meta">
          <span v-if="document.createdAt" class="date-info">
            Criado em: {{ formatDate(document.createdAt) }}
          </span>
          <span v-if="shouldShowUpdatedAt(document)" class="date-info">
            • Atualizado em: {{ formatDate(document.updatedAt) }}
          </span>
        </div>
        
        <p v-if="showStatus">Status: {{ translateStatus(document.status) }}</p>
      </div>
      
      <div class="document-actions">
        <button
          v-if="!readonly && document.status === 'pending'"
          @click.stop="handleContinueClick(document)"
          class="action-button continue-button"
        >
          Continuar
        </button>
        <button
          v-if="!readonly && document.status === 'pending'"
          @click.stop="handleEditClick(document)"
          class="action-button edit-button"
        >
          Editar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { format } from 'date-fns';
  import { ptBR } from 'date-fns/locale';

  const props = defineProps({
    documents: {
      type: Array,
      required: true,
    },
    showStatus: {
      type: Boolean,
      default: false,
    },
    readonly: {
      type: Boolean,
      default: false,
    }
  });

  const emit = defineEmits(['submit', 'edit', 'continue']);

  const translateStatus = (status) => {
    const statusMap = {
      pending: "Pendente",
      submitted: "Enviado",
      approved: "Aprovado",
      completed: "Concluído",
    };
    return statusMap[status] || status;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const shouldShowUpdatedAt = (document) => {
    return document.updatedAt && 
          document.updatedAt.seconds !== document.createdAt.seconds;
  };

  const handleDocumentClick = (document) => {
    if (!props.readonly && document.status === 'pending') {
      emit('edit', document.id);
    }
  };

  const handleContinueClick = (document) => {
    emit('continue', document.id);
  };

  const handleEditClick = (document) => {
    emit('edit', document.id);
  };
</script>

<style scoped>
  .document-actions {
    display: flex;
    gap: 0.5rem;
  }

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
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .document-item:hover {
    background-color: #f5f5f5;
  }

  .document-info {
    flex-grow: 1;
  }

  .document-meta {
    font-size: 0.85rem;
    color: #666;
    margin: 0.5rem 0;
  }

  .date-info {
    display: inline-block;
    margin-right: 0.5rem;
  }

  .submit-button {
    background-color: #42b983;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
  }

  .empty-state {
    padding: 1rem;
    text-align: center;
    color: #666;
  }

  .action-button {
    background-color: #42b983;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    white-space: nowrap;
  }

  .continue-button {
    background-color: #42b983;
    color: white;
  }

  .edit-button {
    background-color: #3498db;
    color: white;
  }
</style>
