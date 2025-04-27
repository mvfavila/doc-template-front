<template>
  <div class="modal-overlay" v-if="form">
    <div class="modal-content">
      <div class="modal-header">
        <h2>{{ form.name }}</h2>
        <button class="close-button" @click="$emit('close')">×</button>
      </div>
      
      <form @submit.prevent="handleSubmit">
        <FormField
          v-for="(placeholder, key) in templatePlaceholders"
          :key="key"
          :field-key="key"
          v-model="formValues[key]"
          :placeholder="placeholder"
          :readonly="readonly"
          @validation="updateValidation(key, $event)"
        />
        
        <div class="form-actions">
          <button type="button" class="cancel-button" @click="$emit('close')">Cancelar</button>
          <button 
            v-if="!readonly" 
            type="button" 
            class="save-button"
            :class="{ 'save-submit-button': isFormValid }"
            @click="handleSave"
          >
            {{ isFormValid ? 'Salvar e Enviar' : 'Salvar' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
  
<script setup>
  import { ref, computed, onMounted } from "vue";
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
  
  const isFormValid = computed(() => 
    Object.values(fieldValidations.value).every(valid => valid)
  );
  
  onMounted(async () => {
    // Load template placeholders
    const templateRef = doc(db, "templates", props.templateId);
    const templateSnap = await getDoc(templateRef);
    
    if (templateSnap.exists()) {
      templatePlaceholders.value = templateSnap.data().placeholders || {};
    }
  
    // Initialize form values
    if (props.form.formData) {
      formValues.value = { ...props.form.formData };
    } else {
      // Initialize empty values for all fields
      Object.keys(templatePlaceholders.value).forEach(key => {
        formValues.value[key] = '';
      });
    }
  
    // Initialize validation state
    Object.keys(templatePlaceholders.value).forEach(key => {
      fieldValidations.value[key] = !templatePlaceholders.value[key].required;
    });
  });
  
  const updateValidation = (fieldKey, isValid) => {
    fieldValidations.value[fieldKey] = isValid;
  };
  
  const handleSubmit = () => {
    if (isFormValid.value) {
      emit('submit', formValues.value);
    }
  };
  
  const handleSave = () => {
    if (isFormValid.value) {
      emit('submit', formValues.value);
    } else {
      emit('save', formValues.value);
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
    padding: 1.5rem;
    border-radius: 8px;
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
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
</style>