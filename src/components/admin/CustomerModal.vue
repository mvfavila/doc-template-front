<template>
  <div class="modal-overlay">
    <div class="modal-content">
      <span class="close" @click="$emit('close')">&times;</span>
      <h2>Adicionar Novo Cliente</h2>

      <form @submit.prevent="registerCustomer">
        <div class="form-group">
          <label>Nome Completo</label>
          <input v-model="newCustomer.name" required />
        </div>

        <div class="form-group">
          <label>E-mail</label>
          <input v-model="newCustomer.email" type="email" required />
        </div>

        <div class="form-group">
          <label>Senha Temporária</label>
          <input v-model="newCustomer.password" type="password" required />
        </div>

        <button type="submit" :disabled="isRegistering">
          {{ isRegistering ? "Registrando..." : "Registrar" }}
        </button>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { getFunctions, httpsCallable } from "firebase/functions";
import { ref } from "vue";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc
} from "@firebase/firestore";
import { getAuth } from "@firebase/auth";

const emit = defineEmits(["close", "customer-created"]);

const db = getFirestore();
const auth = getAuth();

const customers = ref([])
const newCustomer = ref({
  name: '',
  email: '',
  password: '',
  officeId: ''
})
const isRegistering = ref(false);
const error = ref("");

const fetchCustomers = async () => {
  const q = query(collection(db, "users"), where("role", "==", "customer"));
  const snapshot = await getDocs(q);
  customers.value = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

const setNewCustomerOfficeId =  async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        newCustomer.value.officeId = userDoc.data().officeId;
      }
    }
  } catch (err) {
    console.error("Error fetching user office:", err);
    error.value = "Failed to load your office information";
  }
};

const registerCustomer = async () => {
  try {
    isRegistering.value = true;

    // Initialize Cloud Functions
    const functions = getFunctions();

    // Get reference to the Cloud Function
    const createCustomerFn = httpsCallable(functions, "createUser");

    await setNewCustomerOfficeId();
    console.log("newCustomer:", newCustomer.value);

    // Call the function
    const result = await createCustomerFn({
      email: newCustomer.value.email,
      password: newCustomer.value.password,
      officeId: newCustomer.value.officeId,
      name: newCustomer.value.name,
      role: "customer",
    });

    // Reset form on success
    newCustomer.value = { name: "", email: "", password: "", officeId: "" };
    emit("customer-created");
    emit("close");
  } catch (error) {
    console.error("Error creating customer:", err);
    error.value = err.message || "Failed to create customer";
  } finally {
    isRegistering.value = false;
  }
};
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

.close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  font-size: 1.5rem;
  cursor: pointer;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
}

.form-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button {
  padding: 0.5rem 1rem;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.error-message {
  color: #e74c3c;
  margin-top: 1rem;
}
</style>
