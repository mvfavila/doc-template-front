<template>
  <div class="client-dashboard">
    <h1>Meus Documentos</h1>

    <div v-if="isLoading" class="loading-state">
      Carregando documentos...
    </div>

    <div v-else>
      <div class="pending-documents">
        <h2>Documentos Pendentes</h2>
        <client-document-list
          :documents="pendingDocuments"
          @submit="handleDocumentSubmit"
          @edit="handleDocumentEdit"
          @continue="handleDocumentContinue"
        />
      </div>

      <div class="completed-documents">
        <h2>Documentos Enviados</h2>
        <client-document-list
          :documents="completedDocuments"
          :show-status="true"
          :readonly="true"
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
import { ref, computed, watch } from "vue";
import { useAuth } from "@/composables/useAuth";
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs,
  updateDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";
import ClientDocumentList from '@/components/client/ClientDocumentList.vue';
import FormModal from '@/components/client/FormModal.vue';

const db = getFirestore();
const { user } = useAuth();

// State
const forms = ref([]);
const selectedForm = ref(null);
const isReadonly = ref(false);
const isLoading = ref(false);

// Computed
const pendingDocuments = computed(() => 
  forms.value.filter(form => form.status === 'pending')
);

const completedDocuments = computed(() =>
  forms.value.filter(form => form.status === 'submitted' || form.status === 'approved')
);

// Methods
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

// Watch for user changes
watch(user, (newUser) => {
  if (newUser) {
    fetchForms();
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

const handleDocumentContinue = async (formId) => {
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
</style>