<template>
  <div class="modal-overlay">
    <div class="modal-content">
      <h2>Preencher Formulário</h2>
      <p>Template: {{ templateName }}</p>
      
      <form @submit.prevent="submitForm">
        <FormField
          v-for="(placeholder, key) in templatePlaceholders"
          :key="key"
          :field-key="key"
          v-model="formValues[key]"
          :placeholder="placeholder"
          @validation="updateValidation(key, $event)"
        />
        
        <div class="form-actions">
          <button type="button" @click="$emit('close')">Cancelar</button>
          <button type="submit" :disabled="!isFormValid">Salvar</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import FormField from '@/components/FormField.vue';
import type { PlaceholderConfig, Placeholders } from '@/shared/placeholder';

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
const fieldValidations = ref<Record<string, boolean>>({});
const isFormValid = computed(() => Object.values(fieldValidations.value).every(valid => valid));

onMounted(async () => {
  // 1. Load template to get placeholders
  const templateRef = doc(db, 'templates', props.form.templateId);
  const templateSnap = await getDoc(templateRef);
  
  if (templateSnap.exists()) {
    templatePlaceholders.value = templateSnap.data().placeholders || {};
    templateName.value = templateSnap.data().name || 'Template sem nome';
  }

  // 2. Initialize form values
  Object.keys(templatePlaceholders.value).forEach(key => {
    // Initialize with existing value or empty string
    formValues.value[key] = props.form.formData?.[key] || '';
    // Initialize validation state (true if not required or has value)
    fieldValidations.value[key] = !templatePlaceholders.value[key].required || !!props.form.formData?.[key];
  });
});

const updateValidation = (fieldKey: string, isValid: boolean) => {
  fieldValidations.value[fieldKey] = isValid;
};

const submitForm = async () => {
  try {
    await updateDoc(doc(db, 'forms', props.form.id), {
      formData: formValues.value,
      status: 'completed',
      updatedAt: serverTimestamp()
    });
    
    emit('saved');
    emit('close');
  } catch (error) {
    console.error('Error saving form:', error);
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
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

button[type="submit"] {
  background-color: #42b983;
  color: white;
  border: none;
}

button[type="submit"]:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}
</style>