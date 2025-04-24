<template>
    <div class="modal-overlay">
      <div class="modal-content">
        <h2>{{ form.name }}</h2>
        
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
            <button type="button" @click="$emit('close')">Cancelar</button>
            <button v-if="!readonly" type="button" @click="handleSave">Salvar Rascunho</button>
            <button v-if="!readonly" type="submit">Enviar</button>
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
    emit('save', formValues.value);
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
    padding: 1.5rem;
    width: 95%;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 2rem;
  }
  </style>