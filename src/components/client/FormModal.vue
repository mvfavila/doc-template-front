<template>
  <div class="modal-overlay" v-if="form" @keydown.esc="handleEscKey">
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
          :model-value="getFieldValue(key)"
          :readonly="isFieldReadonly(key)"
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
  import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
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
      const input = formValues.value[key];
      
      if (input.approved) {
        // Skip validation for previously approved fields
        return true;
      }

      if (!placeholder.required && !inputHasValue(key)) {
        // Consider empty non-required fields as valid
        return true;
      }
      
      if (placeholder.required && !inputHasValue(key)) {
        // Consider empty non-required fields as valid for saving (not for submit)
        return true;
      }

      const textInput = input?.toString().trim();

      // Type-specific validation
      if (placeholder.type === 'number' && isNaN(Number(textInput))) {
        return false;
      }

      // Type-specific validation
      if (placeholder.type === 'email' && !/^\S+@\S+\.\S+$/.test(textInput)) {
        return false;
      }

      if (placeholder.type === 'cpf' && !/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(textInput)) {
        return false;
      }

      if (placeholder.type === 'cnpj' && !/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(textInput)) {
        return false;
      }

        return isValid;
    });
  });

  const isSubmitValid = computed(() => {
    return Object.entries(fieldValidations.value).every(([key, isValid]) => {
      const input = formValues.value[key];
      const placeholder = templatePlaceholders.value[key];
      
      // Skip validation for approved fields
      if (input?.approved) return true;
      
      // Required fields must have a value and be valid
      if (placeholder?.required) {
        const hasValue = input?.value?.toString().trim() !== '';
        return hasValue && isValid;
      }
      
      // Non-required fields are valid if either empty or valid when filled
      return !input?.value || isValid;
    });
  });

  // Methods
  const getFieldValue = (key) => {
    const fieldData = formValues.value[key];
    return fieldData || '';
  };

  const isFieldReadonly = (key) => {
    // If in readonly mode or field is approved
    return props.readonly || (formValues.value[key]?.approved === true);
  };

  const inputHasValue = (key) => {
    return formValues.value[key] && formValues.value[key]?.value?.toString().trim() !== '';
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
          formValues.value = {};
          Object.keys(templatePlaceholders.value).forEach(key => {
            const existingValue = props.form.formData[key];
            if (existingValue && typeof existingValue === 'object') {
              formValues.value[key] = { ...existingValue };
            } else {
              formValues.value[key] = {
                value: existingValue || '',
                approved: false,
                comment: ''
              };
            }
          });
        } else {
          Object.keys(templatePlaceholders.value).forEach(key => {
            formValues.value[key] = {
              value: '',
              approved: false,
              comment: ''
            };
          });
        }
        
        // Initialize validation state and trigger validation
        await nextTick(); // Wait for the next tick to ensure FormFields are rendered
        Object.keys(templatePlaceholders.value).forEach(key => {
          const placeholder = templatePlaceholders.value[key];
          if (placeholder?.required) {
            // Trigger validation for required fields
            document.getElementById(key)?.dispatchEvent(new Event('blur'));
          } else {
            // Non-required fields are valid by default
            fieldValidations.value[key] = true;
          }
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

    window.addEventListener('keydown', handleEscKey);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleEscKey);
  });

  // Watch for templateId changes
  watch(() => props.templateId, async (newTemplateId) => {
    if (newTemplateId) {
      await loadTemplate(newTemplateId);
    }
  });

  const handleEscKey = (event) => {
    if (event.key === 'Escape') {
      emit('close');
    }
  };
  
  const updateValidation = (fieldKey, isValid) => {
    fieldValidations.value[fieldKey] = isValid;
  };
  
  const handleSubmit = () => {
    if (isSubmitValid.value) {
      // Ensure all fields have the proper structure before submitting
      const formattedData = {};
      Object.keys(formValues.value).forEach(key => {
        if (typeof formValues.value[key] === 'object') {
          formattedData[key] = formValues.value[key];
        } else {
          formattedData[key] = {
            value: formValues.value[key],
            approved: false,
            comment: ''
          };
        }
      });
      emit('submit', formattedData);
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
        // Ensure all fields have the proper structure before saving
        const formattedData = {};
        Object.keys(formValues.value).forEach(key => {
          if (typeof formValues.value[key] === 'object') {
            formattedData[key] = formValues.value[key];
          } else {
            formattedData[key] = {
              value: formValues.value[key],
              approved: false,
              comment: ''
            };
          }
        });
        emit('save', formattedData);
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