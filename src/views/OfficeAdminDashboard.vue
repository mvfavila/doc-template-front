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
          <input v-model="customerSearch" placeholder="Buscar clientes..." />
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
              <td>{{ customer.isActive ? "Ativo" : "Inativo" }}</td>
              <td>
                <button
                  @click="toggleCustomerStatus(customer.id, !customer.isActive)"
                  :class="{ warning: customer.isActive }"
                >
                  {{ customer.isActive ? "Bloquear" : "Desbloquear" }}
                </button>
                <button
                  @click="initiatePasswordReset(customer.id)"
                  class="reset-button"
                >
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

        <div class="upload-section">
          <input
            type="file"
            ref="fileInput"
            accept=".docx"
            @change="handleFileChange"
            style="display: none"
          />
          <button @click="triggerFileInput" class="action-button">
            Selecionar Arquivo .docx
          </button>

          <div v-if="selectedFile" class="file-info">
            <p>Arquivo selecionado: {{ selectedFile.name }}</p>
            <input
              v-model="templateName"
              placeholder="Nome do template"
              class="template-name-input"
            />
            <button
              @click="uploadTemplate"
              :disabled="!selectedFile || !templateName || uploadInProgress"
              class="upload-button"
            >
              {{ uploadInProgress ? "Enviando..." : "Enviar Template" }}
            </button>
          </div>

          <div v-if="uploadProgress > 0" class="progress-bar">
            <progress :value="uploadProgress" max="100"></progress>
            <span>{{ uploadProgress }}%</span>
          </div>

          <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
          <p v-if="successMessage" class="success-message">
            {{ successMessage }}
          </p>
        </div>

        <div class="templates-list">
          <div v-for="template in templates" :key="template.id" class="template-item">
            <h3>{{ template.name }}</h3>
            <p v-if="template.status" :class="`status-${template.status}`">
              Status: {{ formatStatus(template.status) }}
            </p>
            <div class="template-actions">
              <button
                @click="assignTemplate(template)"
                :disabled="template.status !== 'processed'"
                class="assign-button"
              >
                Atribuir a Clientes
              </button>
              <button
                v-if="template.status === 'processed' && template.placeholders"
                @click="editPlaceholderMasks(template)"
                class="edit-button"
              >
                Configurar Placeholders
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showPlaceholderModal" class="modal-overlay">
        <div class="modal-content">
          <h3>Configurar Máscaras de Placeholders</h3>
          <div v-for="(placeholder, key) in currentPlaceholders" :key="key" class="placeholder-item">
            <h4>{{ key }}</h4>
            <div class="config-row">
              <label>Tipo:</label>
              <select v-model="placeholder.type">
                <option value="long_text">Texto Longo (até 1000 caracteres)</option>
                <option value="short_text">Texto Curto (até 100 caracteres)</option>
                <option value="name">Nome (somente letras)</option>
                <option value="cpf">CPF</option>
                <option value="cnpj">CNPJ</option>
                <option value="email">E-mail</option>
                <option value="phone">Telefone</option>
              </select>
            </div>
            <div class="config-row">
              <label>
                <input type="checkbox" v-model="placeholder.required">
                Obrigatório
              </label>
            </div>
          </div>
          <div class="modal-actions">
            <button @click="savePlaceholderConfig" class="save-button">Salvar</button>
            <button @click="showPlaceholderModal = false" class="cancel-button">Cancelar</button>
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
import { ref, computed, onMounted } from "vue";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";

// Components
import CustomerModal from "@/components/admin/CustomerModal.vue";
import TemplateAssignmentModal from "@/components/admin/TemplateAssignmentModal.vue";
import FormReviewModal from "@/components/admin/FormReviewModal.vue";

const db = getFirestore();
const auth = getAuth();
const storage = getStorage();
const functions = getFunctions();

// Data
const customers = ref([]);
const templates = ref([]);
const forms = ref([]);
const customerSearch = ref("");
const formFilter = ref("all");
const showCustomerModal = ref(false);
const selectedTemplate = ref(null);
const selectedForm = ref(null);

// Template Upload Data
const fileInput = ref(null);
const selectedFile = ref(null);
const templateName = ref("");
const uploadProgress = ref(0);
const uploadInProgress = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

let unsubscribeTemplates = null;

// Computed
const filteredCustomers = computed(() => {
  return customers.value.filter(
    (customer) =>
      customer.name
        .toLowerCase()
        .includes(customerSearch.value.toLowerCase()) ||
      customer.email.toLowerCase().includes(customerSearch.value.toLowerCase())
  );
});

const filteredForms = computed(() => {
  if (formFilter.value === "all") return forms.value;
  return forms.value.filter((form) => form.status === formFilter.value);
});

// Methods
const fetchCustomers = async () => {
  const q = query(collection(db, "users"), where("role", "==", "customer"));
  const snapshot = await getDocs(q);
  customers.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

const setupTemplateListener = async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const q = query(
          collection(db, "templates"),
          where("officeId", "==", userDoc.data().officeId)
        );
        
        unsubscribeTemplates = onSnapshot(q, 
          (snapshot) => {
            templates.value = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            templates.value.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
          },
          (error) => {
            console.error("Template listener error:", error);
            errorMessage.value = "Erro ao sincronizar templates";
          }
        );
      }
    }
  } catch (error) {
    console.error("Error setting up template listener:", error);
    errorMessage.value = "Erro ao carregar templates";
  }
};

const fetchForms = async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const q = query(
          collection(db, "forms"),
          where("officeId", "==", userDoc.data().officeId)
        );
        const snapshot = await getDocs(q);
        forms.value = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      }
    }
  } catch (error) {
    console.error("Error fetching forms:", error);
    errorMessage.value = "Erro ao carregar formulários";
  }
};

const toggleCustomerStatus = async (customerId, isActive) => {
  await updateDoc(doc(db, "users", customerId), { isActive });
  await fetchCustomers();
};

const initiatePasswordReset = async (customerId) => {
  const customer = customers.value.find((c) => c.id === customerId);
  if (customer?.email) {
    await sendPasswordResetEmail(auth, customer.email);
    alert(`Email de redefinição enviado para ${customer.email}`);
  }
};

// Template Upload Methods
const triggerFileInput = () => {
  fileInput.value.click();
};

const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (
    file &&
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    selectedFile.value = file;
    errorMessage.value = "";
    // Auto-fill template name from filename if empty
    if (!templateName.value) {
      templateName.value = file.name.replace(".docx", "");
    }
  } else {
    selectedFile.value = null;
    errorMessage.value = "Por favor selecione um arquivo .docx válido";
  }
};

const uploadTemplate = async () => {
  if (!selectedFile.value || !templateName.value) return;

  uploadInProgress.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    // Refresh token to get latest claims
    await user.getIdToken(true);

    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) throw new Error("Dados do usuário não encontrados");

    auth.currentUser.getIdTokenResult().then((idTokenResult) => {
      console.log('Claims:', idTokenResult.claims);
    });

    // Sanitize filename
    const sanitizedFileName = selectedFile.value.name
      .replace(/[^\w.-]/g, '_') // Replace special chars
      .substring(0, 50); // Limit length

    // 1. Upload file to storage
    const filePath = `templates/${userDoc.data().officeId}/${Date.now()}_${sanitizedFileName}`;
    const fileRef = storageRef(storage, filePath);

    const MAX_SIZE_MB = 5;
    if (selectedFile.value.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`File must be under ${MAX_SIZE_MB}MB`);
      return;
    }

    const uploadTask = uploadBytesResumable(fileRef, selectedFile.value);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        uploadProgress.value = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
      },
      (error) => {
        errorMessage.value = "Falha no upload: " + error.message;
        console.error("Upload error:", error);
        uploadInProgress.value = false;
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          // 2. Create template document
          await addDoc(collection(db, "templates"), {
            name: templateName.value,
            originalFileName: selectedFile.value.name,
            storagePath: uploadTask.snapshot.ref.fullPath,
            downloadURL,
            status: "pending_processing",
            createdAt: serverTimestamp(),
            createdBy: user.uid,
            officeId: userDoc.data().officeId,
            metadata: {
              size: selectedFile.value.size,
              type: selectedFile.value.type,
            },
          });

          successMessage.value =
            "Template enviado com sucesso! O processamento começará em breve.";
          resetUploadForm();
        } catch (error) {
          if (error.code === 'storage/unauthorized') {
            errorMessage.value = "Você não tem permissão para enviar templates. Contate o administrador.";
          } else {
            errorMessage.value = "Erro durante o upload: " + error.message;
          }
        } finally {
          uploadInProgress.value = false;
        }
      }
    );
  } catch (error) {
    errorMessage.value = "Erro durante o upload: " + error.message;
    console.error("Upload error:", error);
    uploadInProgress.value = false;
  }
};

const resetUploadForm = () => {
  selectedFile.value = null;
  templateName.value = "";
  uploadProgress.value = 0;
  fileInput.value.value = "";
};

const formatStatus = (status) => {
  const statusMap = {
    pending_processing: "Processamento Pendente",
    processing: "Em Processamento",
    processed: "Processado",
    failed: "Falha no Processamento",
  };
  return statusMap[status] || status;
};

// Existing methods (unchanged)
const assignTemplate = (template) => {
  selectedTemplate.value = template;
};

const reviewForm = (form) => {
  selectedForm.value = form;
};

const getTemplateName = (templateId) => {
  const template = templates.value.find((t) => t.id === templateId);
  return template?.name || "Template Desconhecido";
};

const getCustomerName = (customerId) => {
  const customer = customers.value.find((c) => c.id === customerId);
  return customer?.name || "Cliente Desconhecido";
};

const refreshCustomers = async () => {
  await fetchCustomers();
};

const refreshForms = async () => {
  await fetchForms();
};

// Lifecycle
onMounted(async () => {
  await fetchCustomers();
  await setupTemplateListener();
  await fetchForms();
});

// Add these new data properties
const showPlaceholderModal = ref(false);
const currentTemplate = ref(null);
const currentPlaceholders = ref({});

const editPlaceholderMasks = (template: any) => {
  currentTemplate.value = template;
  currentPlaceholders.value = template.placeholders 
    ? JSON.parse(JSON.stringify(template.placeholders))
    : {};
  showPlaceholderModal.value = true;
};

const savePlaceholderConfig = async () => {
  try {
    await updateDoc(doc(db, "templates", currentTemplate.value.id), {
      placeholders: currentPlaceholders.value
    });
    showPlaceholderModal.value = false;
    successMessage.value = "Configurações de placeholders salvas com sucesso!";
    setTimeout(() => successMessage.value = "", 3000);
  } catch (error) {
    errorMessage.value = "Erro ao salvar configurações: " + (error as Error).message;
    console.error("Error saving placeholder config:", error);
  }
};
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

.customer-table th,
.customer-table td {
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

.upload-section {
  margin-bottom: 2rem;
  padding: 1rem;
  border: 1px dashed #ddd;
  border-radius: 8px;
}

.file-info {
  margin-top: 1rem;
}

.template-name-input {
  width: 100%;
  padding: 0.5rem;
  margin: 0.5rem 0;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.upload-button {
  background-color: #42b983;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.upload-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.progress-bar {
  margin: 1rem 0;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.progress-bar progress {
  flex-grow: 1;
}

.error-message {
  color: #e74c3c;
  margin-top: 0.5rem;
}

.success-message {
  color: #2ecc71;
  margin-top: 0.5rem;
}

.status-pending_processing {
  color: #f39c12;
}

.status-processing {
  color: #3498db;
}

.status-processed {
  color: #2ecc71;
}

.status-failed {
  color: #e74c3c;
}

.assign-button {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 0.5rem;
}

.assign-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

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
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.placeholder-item {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 1rem;
  border: 1px solid #eee;
  border-radius: 4px;
}

.placeholder-item h4 {
  grid-column: span 2;
  margin-top: 0;
  margin-bottom: 0.5rem;
}

@media (max-width: 600px) {
  .placeholder-item {
    grid-template-columns: 1fr;
  }
  
  .placeholder-item h4 {
    grid-column: span 1;
  }
}

.validation-options {
  margin-top: 0.5rem;
}

.validation-options label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.template-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.edit-button {
  background-color: #f39c12;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 0.5rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

.save-button {
  background-color: #42b983;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-button {
  background-color: #e74c3c;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.config-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.5rem 0;
}

.config-row label {
  min-width: 80px;
}

.config-row select {
  flex-grow: 1;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}
</style>
