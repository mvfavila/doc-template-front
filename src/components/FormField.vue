<template>
  <div class="form-field">
    <label :for="fieldKey">{{ placeholder.alias || fieldKey }}</label>
    
    <!-- Readonly Display -->
    <div v-if="readonly" class="readonly-value">
      {{ displayValue }}
    </div>

    <!-- Editable Input -->
    <template v-else>
      <!-- Text/Number Input -->
      <input
        v-if="!isSpecialType"
        :id="fieldKey"
        v-model="inputValue"
        :type="inputType"
        :maxlength="maxLength"
        :required="placeholder.required"
        @input="handleInput"
        @blur="handleBlur"
      />

      <!-- Textarea for long text -->
      <textarea
        v-else-if="placeholder.type === 'long_text'"
        :id="fieldKey"
        v-model="inputValue"
        :required="placeholder.required"
        :maxlength="maxLength"
        rows="4"
        @input="handleInput"
        @blur="handleBlur"
      ></textarea>

      <!-- Email Input -->
      <input
        v-else-if="placeholder.type === 'email'"
        :id="fieldKey"
        v-model="inputValue"
        type="email"
        :required="placeholder.required"
        @input="handleInput"
        @blur="handleBlur"
      />

      <!-- Phone Input -->
      <input
        v-else-if="placeholder.type === 'phone'"
        :id="fieldKey"
        v-model="inputValue"
        type="tel"
        :required="placeholder.required"
        @input="handleInput"
        @blur="handleBlur"
      />

      <!-- CPF Input -->
      <input
        v-else-if="placeholder.type === 'cpf'"
        :id="fieldKey"
        v-model="inputValue"
        type="cpf"
        :required="placeholder.required"
        @input="handleInput"
        @blur="handleBlur"
      />

      <!-- CNPJ Input -->
      <input
        v-else-if="placeholder.type === 'cnpj'"
        :id="fieldKey"
        v-model="inputValue"
        type="cnpj"
        :required="placeholder.required"
        @input="handleInput"
        @blur="handleBlur"
      />

      <div v-if="error" class="error-message">{{ error }}</div>
    </template>
  </div>
</template>
  
<script setup lang="ts">
  import { ref, computed, watch } from 'vue';
  
  const props = defineProps({
    fieldKey: {
      type: String,
      required: true
    },
    placeholder: {
      type: Object,
      required: true,
      default: () => ({
        type: 'text',
        required: false,
        alias: ''
      })
    },
    modelValue: {
      type: [String, Number],
      default: ''
    },
    readonly: Boolean
  });
  
  const emit = defineEmits(['update:modelValue', 'validation']);
  
  const inputValue = ref(props.modelValue);
  const error = ref('');

  // Computed properties
  const isSpecialType = computed(() => 
    ['email', 'phone', 'cpf', 'cnpj', 'long_text'].includes(props.placeholder.type)
  );

  const inputType = computed(() => {
    switch(props.placeholder.type) {
      case 'email': return 'email';
      case 'phone': return 'tel';
      case 'name': return 'text';
      case 'cpf': return 'cpf';
      case 'cnpj': return 'cnpj';
      default: return 'text';
    }
  });

  const maxLength = computed(() => {
    switch(props.placeholder.type) {
      case 'short_text': return 100;
      case 'long_text': return 1000;
      default: return null;
    }
  });

  const displayValue = computed(() => {
    if (!inputValue.value) return '-';
    return inputValue.value;
  });
  
  // Watchers
  watch(() => props.modelValue, (newVal) => {
    inputValue.value = newVal;
  });
  
  // Methods
  const handleBlur = () => {
    validateField();
  };

  const handleInput = () => {
    emit('update:modelValue', inputValue.value);
    // Only validate immediately for required fields
    if (props.placeholder.required) {
      validateField();
    }
  };

  const validateField = () => {
    const value = inputValue.value?.toString().trim();
    
    // Skip validation if field is empty and not required
    if (!props.placeholder.required && !value) {
      error.value = '';
      emit('validation', true); // Consider empty non-required fields as valid
      return;
    }
    
    if (props.placeholder.required && !value) {
      error.value = 'Este campo é obrigatório';
      emit('validation', false);
      return;
    }

    // Type-specific validation
    if (props.placeholder.type === 'number' && isNaN(Number(value))) {
      error.value = 'Por favor insira um número válido';
      emit('validation', false);
      return;
    }

    // Type-specific validation
    if (props.placeholder.type === 'email' && !/^\S+@\S+\.\S+$/.test(value)) {
      error.value = 'Por favor insira um email válido';
      emit('validation', false);
      return;
    }

    if (props.placeholder.type === 'cpf' && !/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value)) {
      error.value = 'Por favor insira um CPF válido (000.000.000-00)';
      emit('validation', false);
      return;
    }

    if (props.placeholder.type === 'cnpj' && !/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(value)) {
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
    margin-bottom: 1.5rem;
    width: 100%;
    box-sizing: border-box;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #333;
    width: 100%;
  }

  input, textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
    transition: border-color 0.2s;
    box-sizing: border-box;
    max-width: 100%;
  }

  input:focus, textarea:focus {
    outline: none;
    border-color: #42b983;
  }

  textarea {
    min-height: 100px;
    resize: vertical;
  }

  .error-message {
    color: #e74c3c;
    font-size: 0.85rem;
    margin-top: 0.25rem;
  }

  .readonly-value {
    padding: 0.75rem;
    background: #f5f5f5;
    border-radius: 4px;
    border: 1px solid #eee;
  }
</style>