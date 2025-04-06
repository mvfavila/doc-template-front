<template>
    <div class="system-admin-dashboard">
      <h1>Painel do Administrador do Sistema</h1>
      
      <section class="admin-actions">
        <!-- Register New Office Admin -->
        <div class="card">
          <h2>Registrar Novo Administrador de Escritório</h2>
          <form @submit.prevent="registerOfficeAdmin">
            <div class="form-group">
              <label>Nome Completo</label>
              <input v-model="newOfficeAdmin.name" required />
            </div>
            <div class="form-group">
              <label>E-mail</label>
              <input v-model="newOfficeAdmin.email" type="email" required>
            </div>
            <div class="form-group">
              <label>Senha</label>
              <input v-model="newOfficeAdmin.password" type="password" required>
            </div>
            <div class="form-group">
              <label>Escritório</label>
              <select v-model="newOfficeAdmin.officeId" required>
                <option v-for="office in offices" :key="office.id" :value="office.id">
                  {{ office.name }}
                </option>
              </select>
            </div>
            <button type="submit" :disabled="isRegistering">
              {{ isRegistering ? 'Registrando...' : 'Registrar' }}
            </button>
          </form>
        </div>
  
        <!-- Manage Office Admins -->
        <div class="card">
          <h2>Gerenciar Administradores</h2>
          <div class="search-box">
            <input v-model="searchQuery" placeholder="Buscar por e-mail...">
          </div>
          <table class="admin-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Escritório</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="admin in filteredAdmins" :key="admin.id">
                <td>{{ admin.name }}</td>
                <td>{{ admin.email }}</td>
                <td>{{ getOfficeName(admin.officeId) }}</td>
                <td>{{ admin.isActive ? 'Ativo' : 'Bloqueado' }}</td>
                <td>
                  <button 
                    @click="toggleAdminStatus(admin.id, !admin.isActive)"
                    :class="{ 'warning': admin.isActive }"
                  >
                    {{ admin.isActive ? 'Bloquear' : 'Desbloquear' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
  
        <!-- Manage Offices -->
        <div class="card">
          <h2>Gerenciar Escritórios</h2>
          <button @click="showOfficeModal = true" class="add-button">
            Adicionar Novo Escritório
          </button>
          <ul class="office-list">
            <li v-for="office in offices" :key="office.id">
              {{ office.name }} - {{ office.address }}
              <button @click="editOffice(office)" class="edit-button">Editar</button>
            </li>
          </ul>
        </div>
      </section>
  
      <!-- Office Modal -->
      <div v-if="showOfficeModal" class="modal">
        <div class="modal-content">
          <span class="close" @click="closeModal">&times;</span>
          <h3>{{ editingOffice ? 'Editar Escritório' : 'Novo Escritório' }}</h3>
          <form @submit.prevent="saveOffice">
            <div class="form-group">
              <label>Nome</label>
              <input v-model="currentOffice.name" required>
            </div>
            <div class="form-group">
              <label>Endereço</label>
              <input v-model="currentOffice.address" required>
            </div>
            <button type="submit">Salvar</button>
          </form>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { getFunctions, httpsCallable } from 'firebase/functions'
  import { ref, computed, onMounted } from 'vue'
  import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    getDocs, 
    addDoc, 
    updateDoc,
    doc
  } from '@firebase/firestore'
  import { getAuth } from '@firebase/auth'
  
  const db = getFirestore()
  const auth = getAuth()
  
  // State
  const offices = ref([])
  const officeAdmins = ref([])
  const newOfficeAdmin = ref({
    name: '',
    email: '',
    password: '',
    officeId: ''
  })
  const isRegistering = ref(false)
  const searchQuery = ref('')
  const showOfficeModal = ref(false)
  const currentOffice = ref({
    name: '',
    address: ''
  })
  const editingOffice = ref(null)
  
  // Computed
  const filteredAdmins = computed(() => {
    return officeAdmins.value.filter(admin => 
      admin.email.toLowerCase().includes(searchQuery.value.toLowerCase()))
  })
  
  // Methods
  const fetchOffices = async () => {
    const q = query(collection(db, 'offices'))
    const snapshot = await getDocs(q)
    offices.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  }
  
  const fetchOfficeAdmins = async () => {
    const q = query(collection(db, 'users'), where('role', '==', 'office_admin'))
    const snapshot = await getDocs(q)
    officeAdmins.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  }
  
  const registerOfficeAdmin = async () => {
    try {
      isRegistering.value = true
      
      // Initialize Cloud Functions
      const functions = getFunctions()
      
      // Get reference to the Cloud Function
      const createUserFn = httpsCallable(functions, 'createUser')
      
      // Call the function
      const result = await createUserFn({
        email: newOfficeAdmin.value.email,
        password: newOfficeAdmin.value.password,
        officeId: newOfficeAdmin.value.officeId,
        name: newOfficeAdmin.value.name,
        role: 'office_admin',
      })
      
      // Reset form on success
      newOfficeAdmin.value = { name: '', email: '', password: '', officeId: '' }
      await fetchOfficeAdmins() // Refresh the admin list
      
      console.log('Office admin created:', result.data)
    } catch (error) {
      console.error('Error creating office admin:', error)
      // You might want to show this error to the user
    } finally {
      isRegistering.value = false
    }
  }
  
  const toggleAdminStatus = async (userId, isActive) => {
    await updateDoc(doc(db, 'users', userId), { isActive })
    await fetchOfficeAdmins()
  }
  
  const getOfficeName = (officeId) => {
    const office = offices.value.find(o => o.id === officeId)
    return office ? office.name : 'Desconhecido'
  }
  
  const editOffice = (office) => {
    currentOffice.value = { ...office }
    editingOffice.value = office.id
    showOfficeModal.value = true
  }
  
  const saveOffice = async () => {
    if (editingOffice.value) {
      await updateDoc(doc(db, 'offices', editingOffice.value), currentOffice.value)
    } else {
      await addDoc(collection(db, 'offices'), currentOffice.value)
    }
    closeModal()
    await fetchOffices()
  }
  
  const closeModal = () => {
    showOfficeModal.value = false
    currentOffice.value = { name: '', address: '' }
    editingOffice.value = null
  }
  
  // Lifecycle
  onMounted(async () => {
    await fetchOffices()
    await fetchOfficeAdmins()
  })
  </script>
  
  <style scoped>
  .system-admin-dashboard {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  h1 {
    color: #2c3e50;
    margin-bottom: 2rem;
  }
  
  .admin-actions {
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
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: bold;
  }
  
  .form-group input,
  .form-group select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  
  button {
    padding: 0.5rem 1rem;
    background-color: #42b983;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  
  button:hover {
    background-color: #3aa876;
  }
  
  button.warning {
    background-color: #e74c3c;
  }
  
  button.warning:hover {
    background-color: #c0392b;
  }
  
  .add-button {
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
  
  .admin-table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .admin-table th,
  .admin-table td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid #ddd;
  }
  
  .admin-table th {
    background-color: #f5f5f5;
  }
  
  .office-list {
    list-style: none;
    padding: 0;
  }
  
  .office-list li {
    padding: 0.5rem 0;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
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
  
  .close {
    position: absolute;
    top: 1rem;
    right: 1rem;
    font-size: 1.5rem;
    cursor: pointer;
  }
  
  @media (max-width: 768px) {
    .admin-actions {
      grid-template-columns: 1fr;
    }
    
    .admin-table {
      display: block;
      overflow-x: auto;
    }
  }
  </style>