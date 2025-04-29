<template>
  <div class="modal-overlay" v-if="form">
    <div class="modal-content">
      <div class="modal-header">
        <h2>{{ form.name }}</h2>
        <button class="close-button" @click="$emit('close')">×</button>
      </div>
      
      <div v-if="isLoading" class="loading-state">
        Carregando formulário...
      </div>
      
      <form v-else @submit.prevent="handleSubmit">
        <div v-if="Object.keys(templatePlaceholders).length === 0" class="empty-state">
          Nenhum campo encontrado no template
        </div>
        
        <FormField
          v-for="(placeholder, key) in templatePlaceholders"
          :key="key"
          :field-key="key"
          :placeholder="placeholder"
          :model-value="formValues[key]"
          :readonly="readonly"
          @update:modelValue="updateFormValue(key, $event)"
          @validation="updateValidation(key, $event)"
        />
        
        <div class="form-actions">
          <button type="button" class="cancel-button" @click="$emit('close')">Cancelar</button>
          <button 
            v-if="!readonly" 
            type="button" 
            class="save-button"
            :class="{ 'save-submit-button': isSubmitValid }"
            @click="handleSave"
          >
            Salvar
          </button>
          <button 
            v-if="!readonly" 
            type="submit" 
            class="submit-button"
            :disabled="!isSubmitValid"
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
  
<script setup>
  import { ref, computed, watch, onMounted } from "vue";
  import { doc, getDoc } from "@firebase/firestore";
  import { db } from "@/firebase";
  import FormField from "@/components/FormField.vue";
  
  const props = defineProps({
    form: Object,
    templateId: String,
    readonly: Boolean
  });
  
  const emit = defineEmits(['close', 'submit', 'save']);
  
  const templatePlaceholders = ref({});
  const formValues = ref({});
  const fieldValidations = ref({});
  const isLoading = ref(true);

  // Computed
  const isSaveValid = computed(() => {
    return Object.entries(fieldValidations.value).every(([key, isValid]) => {
      const placeholder = templatePlaceholders.value[key];
      const value = formValues.value[key].toString().trim();

      if (!placeholder.required && !inputHasValue(key)) {
        // Consider empty non-required fields as valid
        return true;
      }
      
      if (placeholder.required && !inputHasValue(key)) {
        // Consider empty non-required fields as valid for saving (not for submit)
        return true;
      }

      // Type-specific validation
      if (placeholder.type === 'number' && isNaN(Number(value))) {
        return false;
      }

      // Type-specific validation
      if (placeholder.type === 'email' && !/^\S+@\S+\.\S+$/.test(value)) {
        return false;
      }

      if (placeholder.type === 'cpf' && !/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value)) {
        return false;
      }

      if (placeholder.type === 'cnpj' && !/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(value)) {
        return false;
      }

      return isValid;
    });
  });

  const isSubmitValid = computed(() => {
    return Object.entries(fieldValidations.value).every(([key, isValid]) => {
      const placeholder = templatePlaceholders.value[key];
      if (placeholder?.required && !inputHasValue(key)) {
        return false;
      }
      return isValid;
    });
  });

  // Methods
  const inputHasValue = (key) => {
    return formValues.value[key] && formValues.value[key].toString().trim() !== '';
  };

  const loadTemplate = async (templateId) => {
    try {
      isLoading.value = true;
      const templateRef = doc(db, "templates", templateId);
      const templateSnap = await getDoc(templateRef);
      
      if (templateSnap.exists()) {
        const templateData = templateSnap.data();
        templatePlaceholders.value = templateData.placeholders || {};
        
        // Initialize form values
        if (props.form?.formData) {
          formValues.value = { ...props.form.formData };
        } else {
          // Initialize empty values for all fields
          Object.keys(templatePlaceholders.value).forEach(key => {
            formValues.value[key] = '';
          });
        }
        
        // Initialize validation state
        Object.keys(templatePlaceholders.value).forEach(key => {
          fieldValidations.value[key] = !templatePlaceholders.value[key]?.required;
        });
      } else {
        templatePlaceholders.value = {};
      }
    } catch (error) {
      console.error('Error loading template:', error);
    } finally {
      isLoading.value = false;
    }
  };
  
  onMounted(async () => {
    if (props.templateId) {
      await loadTemplate(props.templateId);
    }
  });

  // Watch for templateId changes
  watch(() => props.templateId, async (newTemplateId) => {
    if (newTemplateId) {
      await loadTemplate(newTemplateId);
    }
  });
  
  const updateValidation = (fieldKey, isValid) => {
    fieldValidations.value[fieldKey] = isValid;
  };
  
  const handleSubmit = () => {
    if (isSubmitValid.value) {
      emit('submit', formValues.value);
    } else {
      // Show validation errors
      Object.keys(fieldValidations.value).forEach(key => {
        const placeholder = templatePlaceholders.value[key];
        if (placeholder?.required && (!fieldValidations.value[key] || !inputHasValue(key))) {
          document.getElementById(key)?.dispatchEvent(new Event('blur'));
        }
      });
    }
  };
  
  const handleSave = () => {
    // Trigger validation for all fields
    Object.keys(templatePlaceholders.value).forEach(key => {
      document.getElementById(key)?.dispatchEvent(new Event('blur'));
    });

    // Wait for the next tick to ensure validations have updated
    setTimeout(() => {
      if (isSaveValid.value) {
        emit('save', formValues.value);
      }
    }, 0);
  };

  const updateFormValue = (key, value) => {
    formValues.value[key] = value;
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
    padding: 1.5rem;
    border-radius: 8px;
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-content form {
    width: 100%;
    box-sizing: border-box;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .close-button {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.5rem;
    line-height: 1;
  }

  .form-field {
    margin-bottom: 1.5rem;
    width: 100%;
    box-sizing: border-box;
  }

  .form-field input,
  .form-field textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
    transition: border-color 0.2s;
    box-sizing: border-box;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 2rem;
  }

  .cancel-button {
    padding: 0.5rem 1rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: white;
    cursor: pointer;
  }

  .save-button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    background: #3498db;
    color: white;
    cursor: pointer;
  }

  .save-submit-button {
    background: #42b983;
  }

  .loading-state {
    padding: 2rem;
    text-align: center;
    color: #666;
  }

  .empty-state {
    padding: 1rem;
    text-align: center;
    color: #666;
    margin: 1rem 0;
  }

  .submit-button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    background: #42b983;
    color: white;
    cursor: pointer;
  }

  .submit-button:disabled {
    background: #cccccc;
    cursor: not-allowed;
  }
</style>