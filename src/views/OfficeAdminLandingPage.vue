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
          <div v-if="loadingStates.pending" class="loading-indicator">
            <span class="spinner"></span>
          </div>
          <div class="search-box">
            <input v-model="pendingSearch" placeholder="Buscar pendentes..."/>
          </div>
        </div>
        <div v-if="errors.pending" class="error-message">
          {{ errors.pending }}
          <button @click="retryLoading">Tentar novamente</button>
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
          <div v-if="loadingStates.review" class="loading-indicator">
            <span class="spinner"></span>
          </div>
          <div class="search-box">
            <input v-model="reviewSearch" placeholder="Buscar para revisão..."/>
          </div>
        </div>
        <div v-if="errors.review" class="error-message">
          {{ errors.review }}
          <button @click="retryLoading">Tentar novamente</button>
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
          <div v-if="loadingStates.completed" class="loading-indicator">
            <span class="spinner"></span>
          </div>
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
        <div v-if="errors.completed" class="error-message">
          {{ errors.completed }}
          <button @click="retryLoading">Tentar novamente</button>
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
                  <template v-if="documentStatus(doc.id) === 'pending' || documentStatus(doc.id) === 'processing'">
                    <span class="generating-badge">
                      Processando...
                    </span>
                  </template>
                  <template v-else-if="documentStatus(doc.id) === 'failed'">
                    <span class="error-badge">
                      Falha na geração
                    </span>
                    <button 
                      @click="regenerateDocument(doc.id)"
                      class="action-button regenerate-button"
                    >
                      Tentar novamente
                    </button>
                  </template>

                  <template v-else>
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
                    <template v-if="(!doc.generatedPdfUrl || !doc.generatedDocxUrl)">
                      <button 
                        @click="regenerateDocument(doc.id)"
                        class="action-button regenerate-button"
                      >
                        Tentar novamente
                      </button>
                    </template>
                  </template>
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
      :key="activeDocument.id"
      :form="activeDocument"
      @close="activeDocument = null"
      @saved="handleFormSaved"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getAuth } from "firebase/auth";
import { 
  addDoc,
  getFirestore, 
  collection, 
  query, 
  where,
  getDoc,
  doc,
  updateDoc,
  serverTimestamp,
  onSnapshot
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
const documentJobs = ref({});
const pendingGenerations = ref({});
const customers = ref([])
const templates = ref([])
const activeDocument = ref(null)
const loadingStates = ref({
  pending: false,
  review: false,
  completed: false,
  customers: false,
  templates: false
});

const errors = ref({
  pending: null,
  review: null,
  completed: null,
  customers: null,
  templates: null
});

// Search and filters
const pendingSearch = ref('')
const reviewSearch = ref('')
const completedFilter = ref({
  customerId: '',
  templateId: ''
})

// Listeners
let unsubscribeDocuments = null;
let unsubscribeCustomers = null;
let unsubscribeTemplates = null;
let unsubscribeDocumentJobs = null;

const setupRealtimeListeners = async () => {
  try {
    loadingStates.value = {
      pending: true,
      review: true,
      completed: true,
      customers: true,
      templates: true
    };
    
    errors.value = {
      pending: null,
      review: null,
      completed: null,
      customers: null,
      templates: null
    };

    const user = auth.currentUser;
    if (!user) return;
    
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) return;
    
    const officeId = userDoc.data().officeId;
    
    // Set up real-time listeners
    unsubscribeDocuments = onSnapshot(
      query(collection(db, 'forms'), where('officeId', '==', officeId)),
      async (snapshot) => {
        try {
          loadingStates.value.pending = true;
          loadingStates.value.review = true;
          loadingStates.value.completed = true;
          
          documents.value = await Promise.all(snapshot.docs.map(async (docSnapshot) => {
            const data = docSnapshot.data();
            const template = templatesMap.value[data.templateId];
            
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
          
          errors.value.pending = null;
          errors.value.review = null;
          errors.value.completed = null;
        } catch (error) {
          errors.value.pending = 'Erro ao carregar documentos pendentes';
          errors.value.review = 'Erro ao carregar documentos para revisão';
          errors.value.completed = 'Erro ao carregar documentos concluídos';
          logger.error('Document processing error:', error);
        } finally {
          loadingStates.value.pending = false;
          loadingStates.value.review = false;
          loadingStates.value.completed = false;
        }
      },
      (error) => {
        errors.value.pending = 'Erro na conexão com documentos pendentes';
        errors.value.review = 'Erro na conexão com documentos para revisão';
        errors.value.completed = 'Erro na conexão com documentos concluídos';
        loadingStates.value.pending = false;
        loadingStates.value.review = false;
        loadingStates.value.completed = false;
      }
    );

    unsubscribeDocumentJobs = onSnapshot(
      query(collection(db, 'document_jobs')),
      (snapshot) => {
        const jobs = {};
        snapshot.docs.forEach(doc => {
          jobs[doc.id] = doc.data();
        });
        documentJobs.value = jobs;
      }
    );
    
    unsubscribeCustomers = onSnapshot(
      query(
        collection(db, 'users'),
        where('role', '==', 'customer'),
        where('officeId', '==', officeId)
      ),
      (snapshot) => {
        try {
          loadingStates.value.customers = true;
          customers.value = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          errors.value.customers = null;
        } catch (error) {
          errors.value.customers = 'Erro ao carregar clientes';
          logger.error('Customer processing error:', error);
        } finally {
          loadingStates.value.customers = false;
        }
      },
      (error) => {
        errors.value.customers = 'Erro na conexão com clientes';
        loadingStates.value.customers = false;
      }
    );
    
    unsubscribeTemplates = onSnapshot(
      query(collection(db, 'templates'), where('officeId', '==', officeId)),
      (snapshot) => {
        try {
          loadingStates.value.templates = true;
          templates.value = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          errors.value.templates = null;
        } catch (error) {
          errors.value.templates = 'Erro ao carregar modelos';
          logger.error('Template processing error:', error);
        } finally {
          loadingStates.value.templates = false;
        }
      },
      (error) => {
        errors.value.templates = 'Erro na conexão com modelos';
        loadingStates.value.templates = false;
      }
    );
    
  } catch (error) {
    logger.error('Initial setup error:', error);
    // Set global error state
    errors.value = {
      pending: 'Erro inicial no carregamento',
      review: 'Erro inicial no carregamento',
      completed: 'Erro inicial no carregamento',
      customers: 'Erro inicial no carregamento',
      templates: 'Erro inicial no carregamento'
    };
  } finally {
    loadingStates.value = {
      pending: false,
      review: false,
      completed: false,
      customers: false,
      templates: false
    };
  }
};

// Computed
const templatesMap = computed(() => {
  return templates.value.reduce((map, template) => {
    map[template.id] = template;
    return map;
  }, {});
});

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

const isRecentlyGenerated = computed(() => (docId) => {
  const generationTime = pendingGenerations.value[docId];
  if (!generationTime) return false;
  
  return Date.now() - generationTime < 2 * 60 * 1000;
});

const documentStatus = computed(() => (docId) => {
  const job = documentJobs.value[docId];
  if (!job) return null;
  
  // Consider job active if updated in last 2 minutes
  const isRecent = job.updatedAt && 
    Date.now() - job.updatedAt.toDate().getTime() < 2 * 60 * 1000;
  
  return isRecent ? job.status : null;
});

// Methods
const retryLoading = async () => {
  // Clear all listeners
  if (unsubscribeDocuments) unsubscribeDocuments();
  if (unsubscribeCustomers) unsubscribeCustomers();
  if (unsubscribeTemplates) unsubscribeTemplates();
  if (unsubscribeDocumentJobs) unsubscribeDocumentJobs();
  
  // Reset states
  documents.value = [];
  customers.value = [];
  templates.value = [];
  documentJobs.value = {};
  pendingGenerations.value = {};
  
  // Restart listeners
  await setupRealtimeListeners();
};

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
    activeDocument.value = null;
  } catch (error) {
    console.error('Error submitting document:', error);
  }
}

const regenerateDocument = async (documentId) => {
  try {
    // Clear any existing job status
    const newJobs = {...documentJobs.value};
    delete newJobs[documentId];
    documentJobs.value = newJobs;
    
    // Trigger regeneration
    await addDoc(collection(db, 'document_jobs'), {
      formId: documentId,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error triggering regeneration:', error);
  }
};

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
  await setupRealtimeListeners();
})

onUnmounted(() => {
  if (unsubscribeDocuments) unsubscribeDocuments();
  if (unsubscribeCustomers) unsubscribeCustomers();
  if (unsubscribeTemplates) unsubscribeTemplates();
  if (unsubscribeDocumentJobs) unsubscribeDocumentJobs();
});
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
  margin-left: 0.5rem;
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

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #666;
  font-size: 0.9rem;
}

.spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(0,0,0,0.1);
  border-radius: 50%;
  border-top-color: #42b983;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  padding: 1rem;
  background-color: #ffeeee;
  border: 1px solid #ffcccc;
  border-radius: 4px;
  color: #e74c3c;
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.error-message button {
  padding: 0.25rem 0.5rem;
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.error-message button:hover {
  background-color: #c0392b;
}

.regenerate-button {
  background-color: #f39c12;
  margin-left: 0.5rem;
}

.regenerate-button:hover {
  background-color: #e67e22;
}

.generating-badge {
  display: inline-block;
  padding: 0.3rem 0.6rem;
  background-color: #f8f4e5;
  color: #8a6d3b;
  border-radius: 4px;
  font-size: 0.85rem;
}

/* Animation for generating state */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.generating-badge {
  animation: pulse 2s infinite;
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