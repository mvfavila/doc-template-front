<template>
    <div class="office-admin-dashboard">
      <h1>Painel do Administrador de Escritório</h1>
  
      <section class="admin-sections">
        <!-- Customer Management -->
        <div class="card">
          <h2>Gerenciar Clientes</h2>
          <button @click="showCustomerModal = true" class="action-button">
            Adicionar Novo Cliente
          </button>
          
          <div class="search-box">
            <input v-model="customerSearch" placeholder="Buscar clientes...">
          </div>
  
          <table class="customer-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="customer in filteredCustomers" :key="customer.id">
                <td>{{ customer.name }}</td>
                <td>{{ customer.email }}</td>
                <td>{{ customer.isActive ? 'Ativo' : 'Inativo' }}</td>
                <td>
                  <button @click="toggleCustomerStatus(customer.id, !customer.isActive)" 
                          :class="{ 'warning': customer.isActive }">
                    {{ customer.isActive ? 'Desativar' : 'Ativar' }}
                  </button>
                  <button @click="initiatePasswordReset(customer.id)" class="reset-button">
                    Resetar Senha
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
  
        <!-- Document Templates -->
        <div class="card">
          <h2>Modelos de Documentos</h2>
          <div class="template-upload">
            <input type="file" ref="templateFile" accept=".docx" @change="handleFileUpload">
            <input v-model="newTemplateName" placeholder="Nome do template">
            <button @click="uploadTemplate" :disabled="!templateFile || !newTemplateName">
              Enviar Template
            </button>
          </div>
  
          <div class="templates-list">
            <div v-for="template in templates" :key="template.id" class="template-item">
              <h3>{{ template.name }}</h3>
              <button @click="assignTemplate(template)">Atribuir a Clientes</button>
            </div>
          </div>
        </div>
  
        <!-- Form Management -->
        <div class="card">
          <h2>Formulários Submetidos</h2>
          <div class="form-filters">
            <select v-model="formFilter">
              <option value="all">Todos</option>
              <option value="pending">Pendentes</option>
              <option value="approved">Aprovados</option>
              <option value="rejected">Rejeitados</option>
            </select>
          </div>
  
          <div class="forms-list">
            <div v-for="form in filteredForms" :key="form.id" class="form-item">
              <div class="form-header">
                <h3>{{ getTemplateName(form.templateId) }}</h3>
                <span class="status-badge" :class="form.status">
                  {{ form.status }}
                </span>
              </div>
              <p>Cliente: {{ getCustomerName(form.customerId) }}</p>
              <button @click="reviewForm(form)">Revisar</button>
            </div>
          </div>
        </div>
      </section>
  
      <!-- Modals -->
      <customer-modal 
        v-if="showCustomerModal"
        @close="showCustomerModal = false"
        @customer-created="refreshCustomers"
      />
  
      <template-assignment-modal
        v-if="selectedTemplate"
        :template="selectedTemplate"
        :customers="customers"
        @close="selectedTemplate = null"
        @assigned="refreshForms"
      />
  
      <form-review-modal
        v-if="selectedForm"
        :form="selectedForm"
        @close="selectedForm = null"
        @approved="refreshForms"
      />
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    getDocs, 
    addDoc,
    updateDoc,
    doc,
    serverTimestamp
  } from 'firebase/firestore'
  import { getAuth, sendPasswordResetEmail } from 'firebase/auth'
  import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
  import { getFunctions, httpsCallable } from 'firebase/functions'
  
  // Components
  import CustomerModal from '@/components/admin/CustomerModal.vue'
  import TemplateAssignmentModal from '@/components/admin/TemplateAssignmentModal.vue'
  import FormReviewModal from '@/components/admin/FormReviewModal.vue'
  
  const db = getFirestore()
  const auth = getAuth()
  const storage = getStorage()
  const functions = getFunctions()
  
  // Data
  const customers = ref([])
  const templates = ref([])
  const forms = ref([])
  const customerSearch = ref('')
  const newTemplateName = ref('')
  const templateFile = ref(null)
  const formFilter = ref('all')
  const showCustomerModal = ref(false)
  const selectedTemplate = ref(null)
  const selectedForm = ref(null)
  
  // Computed
  const filteredCustomers = computed(() => {
    return customers.value.filter(customer => 
      customer.name.toLowerCase().includes(customerSearch.value.toLowerCase()) ||
      customer.email.toLowerCase().includes(customerSearch.value.toLowerCase())
    )
  })
  
  const filteredForms = computed(() => {
    if (formFilter.value === 'all') return forms.value
    return forms.value.filter(form => form.status === formFilter.value)
  })
  
  // Methods
  const fetchCustomers = async () => {
    const q = query(collection(db, 'users'), where('role', '==', 'customer'))
    const snapshot = await getDocs(q)
    customers.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  }
  
  const fetchTemplates = async () => {
    const q = query(collection(db, 'templates'))
    const snapshot = await getDocs(q)
    templates.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  }
  
  const fetchForms = async () => {
    const q = query(collection(db, 'forms'))
    const snapshot = await getDocs(q)
    forms.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  }
  
  const toggleCustomerStatus = async (customerId, isActive) => {
    await updateDoc(doc(db, 'users', customerId), { isActive })
    await fetchCustomers()
  }
  
  const initiatePasswordReset = async (customerId) => {
    const customer = customers.value.find(c => c.id === customerId)
    if (customer?.email) {
      await sendPasswordResetEmail(auth, customer.email)
      alert(`Email de redefinição enviado para ${customer.email}`)
    }
  }
  
  const handleFileUpload = (e) => {
    templateFile.value = e.target.files[0]
  }
  
  const uploadTemplate = async () => {
    if (!templateFile.value || !newTemplateName.value) return
  
    try {
      // 1. Upload file to storage
      const fileRef = storageRef(storage, `templates/${Date.now()}_${templateFile.value.name}`)
      await uploadBytes(fileRef, templateFile.value)
      const fileUrl = await getDownloadURL(fileRef)
  
      // 2. Create template document
      await addDoc(collection(db, 'templates'), {
        name: newTemplateName.value,
        fileUrl,
        createdAt: serverTimestamp(),
        officeId: auth.currentUser.uid // Link to office
      })
  
      // 3. Refresh list
      await fetchTemplates()
      newTemplateName.value = ''
      templateFile.value = null
    } catch (error) {
      console.error('Error uploading template:', error)
    }
  }
  
  const assignTemplate = (template) => {
    selectedTemplate.value = template
  }
  
  const reviewForm = (form) => {
    selectedForm.value = form
  }
  
  const getTemplateName = (templateId) => {
    const template = templates.value.find(t => t.id === templateId)
    return template?.name || 'Template Desconhecido'
  }
  
  const getCustomerName = (customerId) => {
    const customer = customers.value.find(c => c.id === customerId)
    return customer?.name || 'Cliente Desconhecido'
  }
  
  const refreshCustomers = async () => {
    await fetchCustomers()
  }
  
  const refreshForms = async () => {
    await fetchForms()
  }
  
  // Lifecycle
  onMounted(async () => {
    await fetchCustomers()
    // await fetchTemplates()
    // await fetchForms()
  })
  </script>
  
  <style scoped>
  .office-admin-dashboard {
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
  }
  
  h1 {
    color: #2c3e50;
    margin-bottom: 2rem;
  }
  
  .admin-sections {
    display: grid;
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  
  .card {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    padding: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .action-button {
    background-color: #42b983;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    margin-bottom: 1rem;
  }
  
  .search-box {
    margin-bottom: 1rem;
  }
  
  .search-box input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  
  .customer-table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .customer-table th, .customer-table td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid #ddd;
  }
  
  .customer-table th {
    background-color: #f5f5f5;
  }
  
  button {
    padding: 0.3rem 0.6rem;
    margin-right: 0.5rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  button.warning {
    background-color: #e74c3c;
    color: white;
  }
  
  button.reset-button {
    background-color: #3498db;
    color: white;
  }
  
  .template-upload {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .template-upload input[type="file"] {
    flex: 1;
  }
  
  .templates-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
  }
  
  .template-item {
    border: 1px solid #eee;
    padding: 1rem;
    border-radius: 4px;
  }
  
  .form-filters select {
    padding: 0.5rem;
    margin-bottom: 1rem;
  }
  
  .forms-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
  }
  
  .form-item {
    border: 1px solid #eee;
    padding: 1rem;
    border-radius: 4px;
  }
  
  .form-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  
  .status-badge {
    padding: 0.3rem 0.6rem;
    border-radius: 4px;
    font-size: 0.8rem;
    text-transform: capitalize;
  }
  
  .status-badge.pending {
    background-color: #f39c12;
    color: white;
  }
  
  .status-badge.approved {
    background-color: #2ecc71;
    color: white;
  }
  
  .status-badge.rejected {
    background-color: #e74c3c;
    color: white;
  }
  
  @media (max-width: 768px) {
    .admin-sections {
      grid-template-columns: 1fr;
    }
    
    .template-upload {
      flex-direction: column;
    }
  }
  </style>