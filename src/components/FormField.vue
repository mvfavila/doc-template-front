<template>
  <div class="form-field">
    <label :for="fieldKey">{{ placeholder.alias || fieldKey }}</label>
    
    <!-- Readonly Display -->
    <div v-if="readonly" class="readonly-value">
      <div class="field-value">{{ displayValue }}</div>
    </div>

    <!-- Editable Input -->
    <template v-else>
      <!-- Text/Number Input -->
      <input
        v-if="!isSpecialType"
        :id="fieldKey"
        v-model="fieldData.value"
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
        v-model="fieldData.value"
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
        v-model="fieldData.value"
        type="email"
        :required="placeholder.required"
        @input="handleInput"
        @blur="handleBlur"
      />

      <!-- Phone Input -->
      <input
        v-else-if="placeholder.type === 'phone'"
        :id="fieldKey"
        v-model="fieldData.value"
        type="tel"
        :required="placeholder.required"
        v-mask="['(##) ####-####', '(##) #####-####']"
        @input="handleInput"
        @blur="handleBlur"
      />

      <!-- CPF Input -->
      <input
        v-else-if="placeholder.type === 'cpf'"
        :id="fieldKey"
        v-model="fieldData.value"
        type="cpf"
        :required="placeholder.required"
        v-mask="['###.###.###-##']"
        @input="handleInput"
        @blur="handleBlur"
      />

      <!-- CNPJ Input -->
      <input
        v-else-if="placeholder.type === 'cnpj'"
        :id="fieldKey"
        v-model="fieldData.value"
        type="cnpj"
        :required="placeholder.required"
        v-mask="['##.###.###/####-##']"
        @input="handleInput"
        @blur="handleBlur"
      />

      <div v-if="fieldData.comment" class="field-comment">
        <strong>Comentário:</strong> {{ fieldData.comment }}
      </div>

      <div v-if="error" class="error-message">{{ error }}</div>
    </template>
  </div>
</template>
  
<script setup lang="ts">
  import { ref, computed, watch } from 'vue';
  import { mask as vMask } from 'vue-the-mask';

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
      type: Object,
      required: true,
      default: () => ({
        value: '',
        approved: false,
        comment: ''
      })
    },
    readonly: Boolean
  });
  
  const emit = defineEmits(['update:modelValue', 'validation']);

  const fieldData = ref({
    value: props.modelValue.value || '',
    approved: props.modelValue.approved || false,
    comment: props.modelValue.comment || ''
  });
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
    return fieldData.value.value || '-';
  });

  const validateField = () => {
    const value = fieldData.value.value?.toString().trim();
    
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

    if (props.placeholder.type === 'cpf') {
      const digits = value.replace(/\D/g, '');
      if (!/^(\d{11})$/.test(digits)) {
        error.value = 'Por favor insira um CNPJ válido (00.000.000/0000-00)';
        emit('validation', false);
        return;
      }
    }

    if (props.placeholder.type === 'cnpj') {
      const digits = value.replace(/\D/g, '');
      if (!/^(\d{14})$/.test(digits)) {
        error.value = 'Por favor insira um CNPJ válido (00.000.000/0000-00)';
        emit('validation', false);
        return;
      }
    }

    if (props.placeholder.type === 'phone') {
      const digits = value.replace(/\D/g, '');
      // Validates exactly 10 digits (landline) or 11 digits (mobile)
      if (!/^(\d{10}|\d{11})$/.test(digits)) {
        error.value = 'Por favor insira um telefone válido (00) 0000-0000 ou (00) 00000-0000';
        emit('validation', false);
        return;
      }
    }

    if (props.placeholder.type === 'email') {
      const emailRegex = /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
      if (!emailRegex.test(value)) {
        error.value = 'Por favor insira um email válido (exemplo@dominio.com)';
        emit('validation', false);
        return;
      }
    }

    error.value = '';
    emit('validation', true);
  };
  
  // Watchers
  watch(() => props.modelValue, (newVal) => {
    fieldData.value = {
      value: newVal.value || '',
      approved: newVal.approved || false,
      comment: newVal.comment || ''
    };
    // Validate immediately when model changes
    validateField();
  }, { deep: true, immediate: true });
  
  // Methods
  const handleBlur = () => {
    validateField();
  };

  const handleInput = () => {
    // Always emit the full structure
    emit('update:modelValue', {
      ...fieldData.value,
      value: fieldData.value.value
    });
    
    if (props.placeholder.required) {
      validateField();
    }
  };
</script>
  
<style scoped>
  .field-value {
    margin-bottom: 0.5rem;
  }

  .field-comment {
    padding: 0.5rem;
    background: #fff8e1;
    border-left: 3px solid #ffc107;
    font-size: 0.9rem;
    color: #5d4037;
  }

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