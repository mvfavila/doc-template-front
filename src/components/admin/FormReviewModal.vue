<template>
  <div class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Revisar {{ templateName }}</h2>
        <button class="close-button" @click="$emit('close')">×</button>
      </div>
      
      <form @submit.prevent="submitForm">
        <div v-for="(placeholder, key) in templatePlaceholders" :key="key" class="compact-field">
          <div class="field-summary">
            <div class="field-title">
              <h3>{{ placeholder.alias || key }}</h3>
              <span class="value-preview">{{ formData[key]?.value || '(vazio)' }}</span>
            </div>
            <label class="approve-toggle">
              <input 
                type="checkbox" 
                v-model="formData[key].approved"
                @change="handleApprovalChange(key)"
              >
              <span class="toggle-label">{{ formData[key].approved ? 'Aprovado' : 'Aprovar' }}</span>
            </label>
          </div>

          <div class="field-details" :class="{ 'show-comment': !formData[key].approved }">
            <textarea
              v-model="formData[key].comment"
              :disabled="formData[key].approved"
              placeholder="Adicionar comentário..."
              @input="handleCommentChange(key)"
            ></textarea>
          </div>
        </div>

        <div v-if="isSaving" class="save-status saving">
          Salvando revisão...
        </div>
        <div v-if="saveSuccess" class="save-status success">
          Revisão salva com sucesso!
        </div>
        
        <div class="form-actions">
          <button type="button" @click="$emit('close')" class="cancel-button">Cancelar</button>
          <button 
            type="button" 
            @click="saveReview" 
            class="save-button"
            :disabled="isSaving"
          >
            {{ isSaving ? 'Salvando...' : 'Salvar Revisão' }}
          </button>
          <button 
            type="button" 
            @click="requestCorrections" 
            :disabled="!allFieldsReviewed || isSaving"
            class="request-corrections-button"
          >
            Requisitar Correções
          </button>
          <button 
            type="button" 
            @click="generateDocuments" 
            :disabled="!allFieldsApproved || isSaving"
            class="generate-documents-button"
          >
            Gerar Documentos
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import FormField from '@/components/FormField.vue';
import type { PlaceholderConfig, Placeholders } from '@/shared/placeholder';
import {
    collection,
    addDoc
} from 'firebase/firestore'

const props = defineProps({
  form: {
    type: Object as () => FormDocument,
    required: true
  }
});

const emit = defineEmits(['close', 'saved']);

// Load template placeholders
const templatePlaceholders = ref<Placeholders>({});
const templateName = ref('');

// Form values and validation
const formValues = ref<Record<string, string>>({});
const fieldReviews = ref<Record<string, { approved: boolean, comment: string }>>({});
const fieldValidations = ref<Record<string, boolean>>({});

const formData = ref<Record<string, {
  value: string;
  approved: boolean;
  comment: string;
}>>({});

// Save states
const isSaving = ref(false);
const saveSuccess = ref(false);
let saveSuccessTimeout: number;

// Keyboard event handler
const handleEscKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    emit('close');
  }
};

// Computed properties
const allFieldsReviewed = computed(() => {
  const fields = Object.keys(templatePlaceholders.value);
  
  // Check if all fields are either approved or have a comment
  const allReviewed = fields.every(key => {
    return formData.value[key]?.approved || !!formData.value[key]?.comment;
  });

  // Check if at least one field has a comment
  const hasAtLeastOneComment = fields.some(key => {
    return !!formData.value[key]?.comment;
  });

  return allReviewed && hasAtLeastOneComment;
});

const allFieldsApproved = computed(() => {
  return Object.keys(templatePlaceholders.value).every(key => {
    return formData.value[key]?.approved && !formData.value[key]?.comment;
  });
});

// Lifecycle
onMounted(async () => {
  window.addEventListener('keydown', handleEscKey);

  const templateRef = doc(db, 'templates', props.form.templateId);
  const templateSnap = await getDoc(templateRef);
  
  if (templateSnap.exists()) {
    templatePlaceholders.value = templateSnap.data().placeholders || {};
    templateName.value = templateSnap.data().name || 'Template sem nome';
  }

  // Initialize form data structure
  Object.keys(templatePlaceholders.value).forEach(key => {
    const existingValue = props.form.formData?.[key];
    
    if (existingValue && typeof existingValue === 'object') {
      formData.value[key] = {
        value: existingValue.value || '',
        approved: existingValue.approved || false,
        comment: existingValue.comment || ''
      };
    } else {
      formData.value[key] = {
        value: existingValue || '',
        approved: false,
        comment: ''
      };
    }
  });
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscKey);
});

// Methods
const handleApprovalChange = (fieldKey: string) => {
  if (formData.value[fieldKey].approved) {
    formData.value[fieldKey].comment = '';
  }
};

const handleCommentChange = (fieldKey: string) => {
  if (formData.value[fieldKey].comment) {
    formData.value[fieldKey].approved = false;
  }
};

const showSaveSuccess = () => {
  saveSuccess.value = true;
  clearTimeout(saveSuccessTimeout);
  saveSuccessTimeout = setTimeout(() => {
    saveSuccess.value = false;
  }, 3000);
};

const requestCorrections = async () => {
  try {
    isSaving.value = true;
    await updateDoc(doc(db, 'forms', props.form.id), {
      formData: formData.value,
      status: 'pending',
      updatedAt: serverTimestamp()
    });
    
    emit('saved');
    emit('close');
  } catch (error) {
    console.error('Error requesting corrections:', error);
  } finally {
    isSaving.value = false;
  }
};

const generateDocuments = async () => {
  try {
    isSaving.value = true;
    await updateDoc(doc(db, 'forms', props.form.id), {
      formData: formData.value,
      status: 'approved',
      updatedAt: serverTimestamp()
    });

    await addDoc(collection(db, 'document_jobs'), {
      formId: props.form.id,
      createdAt: serverTimestamp()
    });
    
    emit('saved');
    emit('close');
  } catch (error) {
    console.error('Error generating documents:', error);
  } finally {
    isSaving.value = false;
  }
};

const saveReview = async () => {
  try {
    isSaving.value = true;
    saveSuccess.value = false;
    
    await updateDoc(doc(db, 'forms', props.form.id), {
      formData: formData.value,
      updatedAt: serverTimestamp()
    });
    
    emit('saved');
    showSaveSuccess();
  } catch (error) {
    console.error('Error saving review:', error);
  } finally {
    isSaving.value = false;
  }
};

const submitForm = async () => {
  try {
    isSaving.value = true;
    await updateDoc(doc(db, 'forms', props.form.id), {
      formData: formData.value,
      status: 'completed',
      updatedAt: serverTimestamp()
    });
    
    emit('saved');
    emit('close');
  } catch (error) {
    console.error('Error saving form:', error);
  } finally {
    isSaving.value = false;
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
}

.save-status {
  padding: 0.75rem 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-weight: 500;
}

.save-status.saving {
  background-color: #f8f4e5;
  color: #8a6d3b;
  border: 1px solid #faebcc;
}

.save-status.success {
  background-color: #e8f5e9;
  color: #3c763d;
  border: 1px solid #d6e9c6;
}

.review-field {
  margin-bottom: 2rem;
  padding: 1rem;
  border: 1px solid #eee;
  border-radius: 4px;
}

.field-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.field-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.field-value {
  color: #666;
  font-style: italic;
}

.review-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.approve-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.comment-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.comment-section textarea {
  width: 100%;
  min-height: 80px;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
  box-sizing: border-box;
  max-width: 100%;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  flex-wrap: wrap;
}

button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  font-weight: 500;
  min-width: 120px;
  text-align: center;
}

.cancel-button {
  background-color: #f5f5f5;
  color: #333;
}

.save-button {
  background-color: #42b983;
  color: white;
}

.save-button:disabled {
  background-color: #a0d9bb;
  cursor: not-allowed;
}

.request-corrections-button {
  background-color: #f39c12;
  color: white;
}

.request-corrections-button:disabled {
  background-color: #f8d9b0;
  cursor: not-allowed;
}

.generate-documents-button {
  background-color: #3498db;
  color: white;
}

.generate-documents-button:disabled {
  background-color: #bbd9f0;
  cursor: not-allowed;
}

.compact-field {
  margin-bottom: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.compact-field:hover {
  border-color: #42b983;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.field-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #f9f9f9;
  border-radius: 6px 6px 0 0;
}

.field-title {
  flex: 1;
}

.field-title h3 {
  margin: 0;
  font-size: 0.95rem;
  color: #333;
}

.value-preview {
  display: block;
  font-size: 0.9rem;
  color: #2c3e50;
  font-weight: 500;
  margin-top: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.approve-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.5rem 0.75rem;
  background: white;
  border-radius: 4px;
  border: 1px solid #ddd;
  transition: all 0.2s;
}

.approve-toggle:hover {
  border-color: #42b983;
}

.toggle-label {
  font-size: 0.85rem;
  font-weight: 500;
}

.field-details {
  padding: 0 1rem;
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.field-details.show-comment {
  max-height: 120px;
  padding: 0.75rem 1rem;
  background: #fafafa;
  border-top: 1px solid #eee;
}

.field-details textarea {
  width: calc(100% - 1rem); /* Account for padding */
  min-height: 60px;
  padding: 0.5rem;
  margin-right: 0.5rem; /* Add right padding */
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.85rem;
  resize: vertical;
  background: white;
}

.field-details textarea:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.2);
}

.field-details.show-comment textarea {
  border-color: #f39c12;
  background-color: #fffaf5;
}

.modal-header {
  position: relative;
  padding-right: 2rem;
}

.close-button {
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  line-height: 1;
  color: #666;
  transition: color 0.2s;
}

.close-button:hover {
  color: #333;
}
</style>