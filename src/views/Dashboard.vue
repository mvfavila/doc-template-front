<template>
  <div class="client-dashboard">
    <h1>Meus Documentos</h1>

    <div v-if="isLoading" class="loading-state">
      Carregando documentos...
    </div>

    <div v-else>
      <div class="customer-templates">
        <h2>Modelos Disponíveis</h2>
        <div class="template-grid">
          <div 
            v-for="template in customerTemplates" 
            :key="template.id" 
            class="template-card"
          >
            <div class="template-info">
              <h3>{{ template.templateName }}</h3>
            </div>
            <button 
              class="add-button"
              @click="createFormFromTemplate(template)"
              title="Criar novo documento"
            >
              +
            </button>
          </div>
        </div>
      </div>
      
      <div class="pending-documents">
        <h2>Documentos Pendentes</h2>
        <client-document-list
          :documents="pendingDocuments"
          @submit="handleDocumentSubmit"
          @edit="handleDocumentEdit"
        />
      </div>

      <div class="completed-documents">
        <h2>Documentos Enviados</h2>
        <client-document-list
          :documents="completedDocuments"
          :readonly="true"
          :show-status="true"
          :status-mapper="statusMapper"
        />
      </div>
    </div>

    <!-- Form Modal -->
    <form-modal
      v-if="selectedForm"
      :key="selectedForm.id"
      :form="selectedForm"
      :template-id="selectedForm?.templateId"
      :readonly="isReadonly"
      @close="selectedForm = null"
      @submit="handleFormSubmit"
      @save="handleFormSave"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useAuth } from "@/composables/useAuth";
import { 
  addDoc,
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  onSnapshot
} from "firebase/firestore";
import ClientDocumentList from '@/components/client/ClientDocumentList.vue';
import FormModal from '@/components/client/FormModal.vue';

const db = getFirestore();
const { user } = useAuth();

// State
const forms = ref([]);
const customerTemplates = ref([]);
const selectedForm = ref(null);
const isReadonly = ref(false);
const isLoading = ref(false);

let unsubscribeForms = null;
let unsubscribeTemplates = null;

// Computed
const pendingDocuments = computed(() => 
  forms.value.filter(form => form.status === 'pending')
);

const completedDocuments = computed(() =>
  forms.value.filter(form => 
    form.status === 'submitted' || 
    form.status === 'approved' || 
    form.status === 'completed'
  )
);

const hasTemplates = computed(() => customerTemplates.value.length > 0);

// Status mapper for completed documents
const statusMapper = (status) => {
  if (status === 'submitted') return 'Em revisão';
  if (status === 'approved' || status === 'completed') return 'Aprovado';
  return status;
};

// Methods
const setupRealtimeListeners = async () => {
  try {
    isLoading.value = true;
    
    if (unsubscribeForms) unsubscribeForms();
    if (unsubscribeTemplates) unsubscribeTemplates();
    
    if (!user.value?.uid) return;
    
    unsubscribeForms = onSnapshot(
      query(
        collection(db, "forms"),
        where("customerId", "==", user.value.uid)
      ),
      (snapshot) => {
        forms.value = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().templateName || "Documento",
          createdAt: doc.data().createdAt,
          updatedAt: doc.data().updatedAt,
          status: doc.data().status,
          templateId: doc.data().templateId,
          ...doc.data()
        }));
        isLoading.value = false;
      },
      (error) => {
        console.error("Failed to listen to forms:", error);
        isLoading.value = false;
      }
    );
    
    unsubscribeTemplates = onSnapshot(
      query(
        collection(db, "customer_templates"),
        where("customerId", "==", user.value.uid)
      ),
      (snapshot) => {
        customerTemplates.value = snapshot.docs.map(doc => ({
          id: doc.id,
          templateName: doc.data().templateName,
          createdAt: doc.data().createdAt?.toDate(),
          templateId: doc.data().templateId,
          officeId: doc.data().officeId,
          ...doc.data()
        }));
      },
      (error) => {
        console.error("Failed to listen to templates:", error);
      }
    );
    
  } catch (error) {
    console.error("Error setting up realtime listeners:", error);
    isLoading.value = false;
  }
};

const fetchForms = async () => {
  try {
    isLoading.value = true;
    const q = query(
      collection(db, "forms"),
      where("customerId", "==", user.value.uid)
    );
    const snapshot = await getDocs(q);
    
    forms.value = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().templateName || "Documento",
      createdAt: doc.data().createdAt,
      updatedAt: doc.data().updatedAt,
      status: doc.data().status,
      templateId: doc.data().templateId,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Failed to fetch forms:", error);
  } finally {
    isLoading.value = false;
  }
};

const fetchCustomerTemplates = async () => {
  try {
    if (!user.value?.uid) return;
    
    const q = query(
      collection(db, "customer_templates"),
      where("customerId", "==", user.value.uid)
    );
    const snapshot = await getDocs(q);
    
    customerTemplates.value = snapshot.docs.map(doc => ({
      id: doc.id,
      templateName: doc.data().templateName,
      createdAt: doc.data().createdAt?.toDate(),
      templateId: doc.data().templateId,
      officeId: doc.data().officeId,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Failed to fetch customer templates:", error);
  }
};

const createFormFromTemplate = async (template) => {
  try {
    isLoading.value = true;
    
    const newForm = {
      customerId: user.value.uid,
      templateId: template.templateId,
      templateName: template.templateName,
      officeId: template.officeId,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      formData: {}
    };

    await addDoc(collection(db, "forms"), newForm);
    
    // Refresh the forms list
    await fetchForms();
  } catch (error) {
    console.error("Error creating form from template:", error);
  } finally {
    isLoading.value = false;
  }
};

// Watch for user changes
watch(user, (newUser) => {
  if (newUser) {
    fetchForms();
    fetchCustomerTemplates();
  }
}, { immediate: true });

const handleDocumentSubmit = async (formId) => {
  const form = forms.value.find(f => f.id === formId);
  if (form) {
    selectedForm.value = form;
    isReadonly.value = false;
  }
};

const handleDocumentEdit = async (formId) => {
  const form = forms.value.find(f => f.id === formId);
  if (form) {
    selectedForm.value = form;
    isReadonly.value = false;
  }
};

const handleFormSubmit = async (formData) => {
  try {
    await updateDoc(doc(db, "forms", selectedForm.value.id), {
      formData: formData,
      status: "submitted",
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await fetchForms();
    selectedForm.value = null;
  } catch (error) {
    console.error("Error submitting form:", error);
  }
};

const handleFormSave = async (formData) => {
  try {
    await updateDoc(doc(db, "forms", selectedForm.value.id), {
      formData: formData,
      status: "pending",
      updatedAt: serverTimestamp()
    });
    await fetchForms();
    selectedForm.value = null;
  } catch (error) {
    console.error("Error saving draft:", error);
  }
};

// Lifecycle
onMounted(async () => {
  await setupRealtimeListeners();
});

onUnmounted(() => {
  if (unsubscribeForms) unsubscribeForms();
  if (unsubscribeTemplates) unsubscribeTemplates();
});

// Watch for user changes
watch(user, (newUser) => {
  if (newUser) {
    setupRealtimeListeners();
  }
}, { immediate: true });
</script>

<style scoped>
  .client-dashboard {
    padding: 20px;
  }

  .pending-documents, .completed-documents {
    margin: 20px 0;
    padding: 15px;
    border: 1px solid #eee;
    border-radius: 5px;
  }

  .loading-state {
    padding: 2rem;
    text-align: center;
    color: #666;
  }

  .customer-templates {
    margin: 20px 0;
    padding: 15px;
    border: 1px solid #eee;
    border-radius: 5px;
  }

  .template-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 15px;
    margin-top: 15px;
  }

  .template-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background-color: #f9f9f9;
  }

  .template-info h3 {
    margin: 0 0 5px 0;
    font-size: 1rem;
  }

  .add-button {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background-color: #4CAF50;
    color: white;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.3s;
  }

  .add-button:hover {
    background-color: #45a049;
  }
</style>