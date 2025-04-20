<template>
    <div class="form-field">
      <label :for="fieldKey">{{ placeholder.alias }}</label>
      
      <!-- Text Input -->
      <input
        v-if="['short_text', 'long_text', 'name'].includes(placeholder.type)"
        :id="fieldKey"
        v-model="fieldValue"
        :type="placeholder.type === 'name' ? 'text' : 'text'"
        :maxlength="placeholder.type === 'short_text' ? 100 : 1000"
        :required="placeholder.required"
        @input="validateField"
      />
      
      <!-- Email Input -->
      <input
        v-else-if="placeholder.type === 'email'"
        :id="fieldKey"
        v-model="fieldValue"
        type="email"
        :required="placeholder.required"
        @input="validateField"
      />
      
      <!-- Phone Input -->
      <input
        v-else-if="placeholder.type === 'phone'"
        :id="fieldKey"
        v-model="fieldValue"
        type="tel"
        :required="placeholder.required"
        @input="validateField"
      />
      
      <!-- CPF/CNPJ Input -->
      <input
        v-else-if="['cpf', 'cnpj'].includes(placeholder.type)"
        :id="fieldKey"
        v-model="fieldValue"
        type="text"
        :required="placeholder.required"
        :pattern="placeholder.type === 'cpf' ? '\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}' : '\\d{2}\\.\\d{3}\\.\\d{3}/\\d{4}-\\d{2}'"
        @input="validateField"
      />
      
      <div v-if="error" class="error-message">{{ error }}</div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, watch } from 'vue';
  
  const props = defineProps({
    fieldKey: {
      type: String,
      required: true
    },
    placeholder: {
      type: Object as () => PlaceholderConfig,
      required: true
    },
    modelValue: {
      type: String,
      default: ''
    }
  });
  
  const emit = defineEmits(['update:modelValue', 'validation']);
  
  const fieldValue = ref(props.modelValue);
  const error = ref('');
  
  watch(() => props.modelValue, (newVal) => {
    fieldValue.value = newVal;
  });
  
  const validateField = () => {
    emit('update:modelValue', fieldValue.value);
    
    // Basic validation
    if (props.placeholder.required && !fieldValue.value) {
      error.value = 'Este campo é obrigatório';
      emit('validation', false);
      return;
    }
  
    // Type-specific validation
    if (props.placeholder.type === 'email' && !/^\S+@\S+\.\S+$/.test(fieldValue.value)) {
      error.value = 'Por favor insira um email válido';
      emit('validation', false);
      return;
    }
  
    if (props.placeholder.type === 'cpf' && !/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(fieldValue.value)) {
      error.value = 'Por favor insira um CPF válido (000.000.000-00)';
      emit('validation', false);
      return;
    }
  
    if (props.placeholder.type === 'cnpj' && !/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(fieldValue.value)) {
      error.value = 'Por favor insira um CNPJ válido (00.000.000/0000-00)';
      emit('validation', false);
      return;
    }
  
    error.value = '';
    emit('validation', true);
  };
  </script>
  
  <style scoped>
  .form-field {
    margin-bottom: 1rem;
  }
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }
  
  input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  
  .error-message {
    color: #e74c3c;
    font-size: 0.8rem;
    margin-top: 0.25rem;
  }
  </style>