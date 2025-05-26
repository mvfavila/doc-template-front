<template>
  <div class="office-admin-landing">
    <h1>Painel Administrativo</h1>

    <div v-if="isLoading" class="loading-state">
      Carregando documentos...
    </div>

    <div v-else class="document-sections">
      <!-- Pending Documents Section -->
      <section class="document-section">
        <div class="section-header">
          <h2>Documentos Pendentes</h2>
          <div class="search-box">
            <input v-model="pendingSearch" placeholder="Buscar pendentes..."/>
          </div>
        </div>
        <document-list
          :documents="filteredPendingDocuments"
          :customers="customers"
          @edit="handleEditDocument"
        />
      </section>

      <!-- For Review Section -->
      <section class="document-section">
        <div class="section-header">
          <h2>Documentos para Revisão</h2>
          <div class="search-box">
            <input v-model="reviewSearch" placeholder="Buscar para revisão..."/>
          </div>
        </div>
        <document-list
          :documents="filteredReviewDocuments"
          :customers="customers"
          @review="handleReviewDocument"
        />
      </section>

      <!-- Completed Documents Section -->
      <section class="document-section">
        <div class="section-header">
          <h2>Documentos Concluídos</h2>
          <div class="advanced-search">
            <div class="filter-controls">
              <select v-model="completedFilter.customerId">
                <option value="">Todos os clientes</option>
                <option 
                  v-for="customer in customers" 
                  :key="customer.id" 
                  :value="customer.id"
                >
                  {{ customer.name }}
                </option>
              </select>
              <select v-model="completedFilter.templateId">
                <option value="">Todos os modelos</option>
                <option 
                  v-for="template in templates" 
                  :key="template.id" 
                  :value="template.id"
                >
                  {{ template.name }}
                </option>
              </select>
              <button @click="resetFilters">Limpar filtros</button>
            </div>
          </div>
        </div>
        <document-list
          :documents="filteredCompletedDocuments"
          :customers="customers"
          :readonly="true"
          :status-mapper="mapAdminStatus"
        />
      </section>
    </div>

    <!-- Document Modal -->
    <document-modal
      v-if="activeDocument"
      :document="activeDocument"
      :is-admin="true"
      @close="activeDocument = null"
      @submit="handleDocumentSubmit"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  query, 
  where,
  getDoc,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore'
import DocumentList from '@/components/admin/DocumentList.vue';

const db = getFirestore()
const auth = getAuth();

// Data
const documents = ref([])
const customers = ref([])
const templates = ref([])
const activeDocument = ref(null)
const isLoading = ref(false)

// Search and filters
const pendingSearch = ref('')
const reviewSearch = ref('')
const completedFilter = ref({
  customerId: '',
  templateId: ''
})

// Computed
const pendingDocuments = computed(() => 
  documents.value.filter(doc => doc.status === 'pending')
)

const reviewDocuments = computed(() =>
  documents.value.filter(doc => doc.status === 'submitted')
)

const completedDocuments = computed(() =>
  documents.value.filter(doc => 
    ['approved', 'completed'].includes(doc.status)
  )
)

const filteredPendingDocuments = computed(() => 
  pendingDocuments.value.filter(doc => {
    console.log("doc", doc)
    return pendingSearch.value === "" ||
    doc.templateName.toLowerCase().includes(pendingSearch.value.toLowerCase())
  })
)

const filteredReviewDocuments = computed(() => 
  reviewDocuments.value.filter(doc => 
    doc.templateName.toLowerCase().includes(reviewSearch.value.toLowerCase())
  )
)

const filteredCompletedDocuments = computed(() => {
  let filtered = completedDocuments.value
  
  // Apply filters
  if (completedFilter.value.customerId) {
    filtered = filtered.filter(doc => 
      doc.customerId === completedFilter.value.customerId
    )
  }
  
  if (completedFilter.value.templateId) {
    filtered = filtered.filter(doc => 
      doc.templateId === completedFilter.value.templateId
    )
  }
  
  return filtered
})

// Methods
const fetchDocuments = async () => {
  try {
    isLoading.value = true
    const user = auth.currentUser;
    const userDoc = await getDoc(doc(db, 'users', user.uid))
    if (!userDoc.exists()) return
    
    const officeId = userDoc.data().officeId
    
    const [docsSnapshot, custsSnapshot, tmplsSnapshot] = await Promise.all([
      getDocs(query(
        collection(db, 'forms'),
        where('officeId', '==', officeId)
      )),
      getDocs(query(
        collection(db, 'users'),
        where('role', '==', 'customer'),
        where('officeId', '==', officeId)
      )),
      getDocs(query(
        collection(db, 'templates'),
        where('officeId', '==', officeId)
      ))
    ])
    
    documents.value = docsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    customers.value = custsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    templates.value = tmplsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
  } catch (error) {
    console.error('Error fetching data:', error)
  } finally {
    isLoading.value = false
  }
}

const mapAdminStatus = (status) => {
  const statusMap = {
    pending: 'Pendente',
    submitted: 'Em revisão',
    approved: 'Aprovado',
    completed: 'Concluído'
  }
  return statusMap[status] || status
}

const getCustomerName = (customerId) => {
  const customer = customers.value.find(c => c.id === customerId)
  return customer?.name || 'Cliente desconhecido'
}

const getTemplateName = (templateId) => {
  const template = templates.value.find(t => t.id === templateId)
  return template?.name || 'Modelo desconhecido'
}

const handleEditDocument = (doc) => {
  activeDocument.value = doc
}

const handleReviewDocument = (doc) => {
  activeDocument.value = doc
}

const handleDocumentSubmit = async (formData) => {
  try {
    await updateDoc(doc(db, 'forms', activeDocument.value.id), {
      formData,
      status: formData.status || 'submitted',
      updatedAt: serverTimestamp()
    })
    await fetchDocuments()
    activeDocument.value = null
  } catch (error) {
    console.error('Error submitting document:', error)
  }
}

const resetFilters = () => {
  completedFilter.value = {
    customerId: '',
    templateId: ''
  }
}

// Lifecycle
onMounted(async () => {
  await fetchDocuments()
})
</script>

<style scoped>
.office-admin-landing {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.document-sections {
  display: grid;
  gap: 2rem;
}

.document-section {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.search-box {
  display: flex;
  gap: 0.5rem;
}

.search-box input {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-width: 250px;
}

.advanced-search {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filter-controls {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.filter-controls select {
  padding: 0.5rem;
  min-width: 200px;
}

.loading-state {
  padding: 2rem;
  text-align: center;
  color: #666;
}

@media (max-width: 768px) {
  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .search-box {
    width: 100%;
  }
  
  .filter-controls {
    flex-direction: column;
  }
}
</style>