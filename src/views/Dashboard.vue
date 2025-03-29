<template>
  <div class="dashboard">
    <div v-if="userRole === 'admin'" class="admin-dashboard">
      <h1>Painel do Escritório</h1>

      <section class="admin-actions">
        <div class="card">
          <h2>Gerenciar Clientes</h2>
          <button @click="showUserModal = true" class="action-button">
            Adicionar Novo Cliente
          </button>
          <client-list :clients="clients" />
        </div>

        <div class="card">
          <h2>Documentos</h2>
          <file-uploader @upload-complete="refreshDocuments" />
          <document-list :documents="documents" @assign="openAssignmentModal" />
        </div>
      </section>
    </div>

    <div v-else class="client-dashboard">
      <h1>Meus Documentos</h1>

      <div class="pending-documents">
        <h2>Documentos Pendentes</h2>
        <client-document-list
          :documents="pendingDocuments"
          @submit="handleDocumentSubmit"
        />
      </div>

      <div class="completed-documents">
        <h2>Documentos Enviados</h2>
        <client-document-list
          :documents="completedDocuments"
          :show-status="true"
        />
      </div>
    </div>

    <!-- Modals -->
    <user-creation-modal
      v-if="showUserModal"
      @close="showUserModal = false"
      @user-created="refreshClients"
    />

    <assignment-modal
      v-if="isAssignmentModalVisible"
      :document="selectedDocument"
      :clients="clients"
      @close="closeAssignmentModal"
      @assigned="refreshDocuments"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useAuth } from "@/composables/useAuth";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

// Components
import ClientList from "@/components/admin/ClientList.vue";
import FileUploader from "@/components/admin/FileUploader.vue";
import DocumentList from "@/components/admin/DocumentList.vue";
import ClientDocumentList from "@/components/client/ClientDocumentList.vue";
import UserCreationModal from "@/components/modals/UserCreationModal.vue";
import AssignmentModal from "@/components/modals/AssignmentModal.vue";

const { isAuthenticated, user } = useAuth();
const db = getFirestore();

// State
const userRole = ref("client");
const documents = ref([]);
const clients = ref([]);
const showUserModal = ref(false);
const isAssignmentModalVisible = ref(false);
const selectedDocument = ref(null);

// Computed
const pendingDocuments = computed(() =>
  documents.value.filter((doc) => doc.status === "pending")
);

const completedDocuments = computed(() =>
  documents.value.filter((doc) => doc.status !== "pending")
);

// Methods
const fetchUserRole = async (uid) => {
  const q = query(collection(db, "users"), where("uid", "==", uid));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    userRole.value = snapshot.docs[0].data().role || "client";
  }
};

const fetchDocuments = async () => {
  if (userRole.value === "admin") {
    const q = query(collection(db, "documents"));
    const snapshot = await getDocs(q);
    documents.value = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } else {
    const q = query(
      collection(db, "documents"),
      where("assignedTo", "==", user.value.uid)
    );
    const snapshot = await getDocs(q);
    documents.value = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }
};

const fetchClients = async () => {
  const q = query(collection(db, "users"), where("role", "==", "client"));
  const snapshot = await getDocs(q);
  clients.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

const handleDocumentSubmit = (documentId) => {
  // Update document status to 'submitted'
  console.log("Document submitted:", documentId);
};

const refreshDocuments = () => {
  fetchDocuments();
};

const refreshClients = () => {
  fetchClients();
};

const openAssignmentModal = (document) => {
  selectedDocument.value = document;
  isAssignmentModalVisible.value = true;
};

const closeAssignmentModal = () => {
  isAssignmentModalVisible.value = false;
  selectedDocument.value = null;
};

// Lifecycle
onMounted(async () => {
  if (isAuthenticated.value && user.value) {
    await fetchUserRole(user.value.uid);
    await fetchDocuments();
    if (userRole.value === "admin") {
      await fetchClients();
    }
  }
});
</script>

<style scoped>
.dashboard {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  color: #2c3e50;
  margin-bottom: 2rem;
}

.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.admin-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
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

.pending-documents,
.completed-documents {
  margin-bottom: 3rem;
}

@media (max-width: 768px) {
  .admin-actions {
    grid-template-columns: 1fr;
  }
}
</style>
