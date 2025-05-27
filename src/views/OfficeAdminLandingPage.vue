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
        <div class="documents-table">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Modelo</th>
                <th>Criado em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="doc in filteredCompletedDocuments" :key="doc.id">
                <td>{{ getCustomerName(doc.customerId) }}</td>
                <td>{{ doc.templateName || 'Documento' }}</td>
                <td>{{ formatDate(doc.createdAt) }}</td>
                <td class="actions">
                  <button 
                    @click="downloadFile(doc.generatedPdfUrl, `${getCustomerName(doc.customerId)}_${doc.templateName || 'documento'}.pdf`)"
                    :disabled="!doc.generatedPdfUrl"
                    class="action-button"
                  >
                    PDF
                  </button>
                  <button 
                    @click="downloadFile(doc.generatedDocxUrl, `${getCustomerName(doc.customerId)}_${doc.templateName || 'documento'}.docx`)"
                    :disabled="!doc.generatedDocxUrl"
                    class="action-button"
                  >
                    DOCX
                  </button>
                  <span v-if="!doc.generatedPdfUrl || !doc.generatedDocxUrl" class="error-badge">
                    !
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          
          <div v-if="!filteredCompletedDocuments.length" class="empty-state">
            Nenhum documento encontrado
          </div>
        </div>
      </section>
    </div>

    <form-modal
      v-if="activeDocument && (activeDocument.status === 'pending')"
      :key="activeDocument.id"
      :form="activeDocument"
      :template-id="activeDocument?.templateId"
      :readonly="activeDocument.status === 'submitted'"
      @close="activeDocument = null"
      @submit="handleDocumentSubmit"
      @save="handleFormSave"
    />

    <form-review-modal
      v-if="activeDocument && (activeDocument.status === 'submitted')"
      :form="activeDocument"
      @close="activeDocument = null"
      @saved="handleFormSaved"
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
import { getStorage, ref as storageRef, getDownloadURL } from "firebase/storage";
import DocumentList from '@/components/admin/DocumentList.vue';
import FormModal from '@/components/client/FormModal.vue';
import FormReviewModal from '@/components/admin/FormReviewModal.vue';

const db = getFirestore()
const auth = getAuth();
const storage = getStorage();

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
    isLoading.value = true;
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
    
    // Process documents with fresh URLs
    documents.value = await Promise.all(docsSnapshot.docs.map(async (docSnapshot) => {
      const data = docSnapshot.data();
      const template = templates.value.find(t => t.id === data.templateId);
      
      // Generate fresh download URLs
      const [pdfUrl, docxUrl] = await Promise.all([
        generateFreshUrl(data.generatedPdfPath),
        generateFreshUrl(data.generatedDocxPath)
      ]);
      
      return {
        id: docSnapshot.id,
        templateName: template?.name || 'Documento',
        ...data,
        generatedPdfUrl: pdfUrl,
        generatedDocxUrl: docxUrl
      };
    }));
    
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

const generateFreshUrl = async (storagePath) => {
  if (!storagePath) return null;
  
  try {
    const fileRef = storageRef(storage, storagePath);
    return await getDownloadURL(fileRef);
  } catch (error) {
    console.error("Error generating download URL:", error);
    return null;
  }
};

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = timestamp.toDate();
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const handleEditDocument = (doc) => {
  activeDocument.value = {
    ...doc,
    name: doc.templateName || 'Documento'
  };
};

const handleReviewDocument = (doc) => {
  activeDocument.value = {
    ...doc,
    name: doc.templateName || 'Documento'
  };
};

const handleFormSaved = async (updatedForm) => {
  try {
    await updateDoc(doc(db, 'forms', updatedForm.id), {
      formData: updatedForm.formData,
      status: updatedForm.status,
      updatedAt: serverTimestamp()
    });
    await fetchDocuments();
    activeDocument.value = null;
  } catch (error) {
    console.error('Error saving form:', error);
  }
};

const handleFormSave = async (formData) => {
  try {
    await updateDoc(doc(db, 'forms', activeDocument.value.id), {
      formData,
      status: 'pending',
      updatedAt: serverTimestamp()
    });
    await fetchDocuments();
    activeDocument.value = null;
  } catch (error) {
    console.error('Error saving form:', error);
  }
};

const handleDocumentSubmit = async (formData) => {
  try {
    const newStatus = activeDocument.value.status === 'pending' ? 'submitted' : activeDocument.value.status;
    await updateDoc(doc(db, 'forms', activeDocument.value.id), {
      formData,
      status: newStatus,
      updatedAt: serverTimestamp()
    });
    await fetchDocuments();
    activeDocument.value = null;
  } catch (error) {
    console.error('Error submitting document:', error);
  }
}

const resetFilters = () => {
  completedFilter.value = {
    customerId: '',
    templateId: ''
  }
}

const getCustomerName = (customerId) => {
  const customer = customers.value.find(c => c.id === customerId);
  return customer?.name || 'Cliente Desconhecido';
};

const downloadFile = (url, filename) => {
  if (!url) {
    alert("Link de download não disponível. Tente novamente mais tarde.");
    return;
  }
  
  // Create a temporary anchor element
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  // Fallback if the direct download doesn't work
  setTimeout(() => {
    if (!document.body.querySelector(`iframe[src="${url}"]`)) {
      window.open(url, '_blank');
    }
  }, 1000);
};

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

.documents-table {
  margin-top: 1rem;
  overflow-x: auto;
}

.documents-table table {
  width: 100%;
  border-collapse: collapse;
}

.documents-table th,
.documents-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.documents-table th {
  background-color: #f5f5f5;
  position: sticky;
  top: 0;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.action-button {
  display: inline-block;
  padding: 0.3rem 0.6rem;
  background-color: #42b983;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  transition: background-color 0.2s;
  border: none;
  cursor: pointer;
}

.action-button:hover {
  background-color: #3aa876;
}

.action-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: #666;
  font-style: italic;
}

.error-badge {
  display: inline-block;
  width: 18px;
  height: 18px;
  background-color: #e74c3c;
  color: white;
  border-radius: 50%;
  text-align: center;
  line-height: 18px;
  font-size: 12px;
  margin-left: 5px;
  cursor: help;
  position: relative;
}

.error-badge:hover::after {
  content: "Arquivo indisponível";
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: white;
  padding: 5px;
  border-radius: 4px;
  white-space: nowrap;
  z-index: 100;
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