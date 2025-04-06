<template>
  <div class="modal-overlay">
    <div class="modal-content">
      <span class="close" @click="$emit('close')">&times;</span>
      <h2>Atribuir Template: {{ template.name }}</h2>

      <div class="customer-selection">
        <h3>Selecionar Clientes</h3>
        <div class="customer-list">
          <div
            v-for="customer in customers"
            :key="customer.id"
            class="customer-item"
          >
            <input
              type="checkbox"
              :id="'customer-' + customer.id"
              v-model="selectedCustomers"
              :value="customer.id"
            />
            <label :for="'customer-' + customer.id">{{ customer.name }}</label>
          </div>
        </div>
      </div>

      <button
        @click="assignToCustomers"
        :disabled="selectedCustomers.length === 0"
      >
        Atribuir a {{ selectedCustomers.length }} cliente(s)
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp
} from 'firebase/firestore'

const props = defineProps({
  template: {
    type: Object,
    required: true
  },
  customers: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['close', 'assigned'])

const db = getFirestore()
const selectedCustomers = ref([])

const assignToCustomers = async () => {
  try {
    const batch = []

    selectedCustomers.value.forEach(customerId => {
      batch.push(addDoc(collection(db, 'forms'), {
        templateId: props.template.id,
        customerId,
        status: 'pending',
        createdAt: serverTimestamp(),
        officeId: props.template.officeId
      }))
    })

    await Promise.all(batch)
    emit('assigned')
    emit('close')
  } catch (error) {
    console.error('Error assigning template:', error)
  }
}
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
  width: 100%;
  max-width: 500px;
  position: relative;
}

.customer-selection {
  margin: 1.5rem 0;
}

.customer-list {
  max-height: 300px;
  overflow-y: auto;
  margin: 1rem 0;
}

.customer-item {
  padding: 0.5rem;
  border-bottom: 1px solid #eee;
}

.customer-item label {
  margin-left: 0.5rem;
}

button {
  padding: 0.5rem 1rem;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  width: 100%;
}
</style>
