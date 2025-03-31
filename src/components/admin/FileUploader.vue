<template>
  <div class="file-uploader">
    <input
      type="file"
      ref="fileInput"
      @change="handleFileUpload"
      accept=".doc,.docx"
      style="display: none"
    />
    <button @click="triggerFileInput" class="upload-button">
      Enviar Novo Documento
    </button>
    <p v-if="uploading">Enviando...</p>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { getStorage, ref as storageRef, uploadBytes } from "firebase/storage";

const emit = defineEmits(["upload-complete"]);
const fileInput = ref(null);
const uploading = ref(false);
const storage = getStorage();

const triggerFileInput = () => {
  fileInput.value.click();
};

const handleFileUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  uploading.value = true;
  try {
    const fileRef = storageRef(storage, `documents/${file.name}`);
    await uploadBytes(fileRef, file);
    emit("upload-complete");
  } catch (error) {
    console.error("Upload failed:", error);
  } finally {
    uploading.value = false;
  }
};
</script>

<style scoped>
.upload-button {
  background-color: #2c3e50;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 1rem;
}
</style>
