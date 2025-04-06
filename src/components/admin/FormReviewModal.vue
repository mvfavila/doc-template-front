<template>
  <div class="modal-overlay">
    <div class="modal-content wide">
      <span class="close" @click="$emit('close')">&times;</span>
      <h2>Revisar Formulário</h2>

      <div class="form-details">
        <div class="form-meta">
          <p><strong>Cliente:</strong> {{ customerName }}</p>
          <p><strong>Template:</strong> {{ templateName }}</p>
          <p>
            <strong>Enviado em:</strong>
            {{ new Date(form.createdAt?.seconds * 1000).toLocaleString() }}
          </p>
        </div>

        <div class="form-fields">
          <div
            v-for="(field, index) in form.fields"
            :key="index"
            class="field-item"
          >
            <h3>{{ field.label }}</h3>
            <p>{{ field.value || "Não preenchido" }}</p>

            <div class="field-actions">
              <label>
                <input
                  type="radio"
                  v-model="fieldReviews[index]"
                  :value="{ approved: true }"
                />
                Aprovar
              </label>

              <label>
                <input
                  type="radio"
                  v-model="fieldReviews[index]"
                  :value="{ approved: false, comment: '' }"
                />
                Rejeitar
              </label>

              <textarea
                v-if="fieldReviews[index] && !fieldReviews[index].approved"
                v-model="fieldReviews[index].comment"
                placeholder="Motivo da rejeição"
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button @click="submitReview(true)" class="approve">
          Aprovar Tudo
        </button>
        <button @click="submitReview(false)" class="reject">
          Rejeitar Tudo
        </button>
        <button @click="submitCustomReview" :disabled="!isCustomReviewComplete">
          Submeter Revisão
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

const props = defineProps({
  form: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["close", "approved"]);

const db = getFirestore();
const fieldReviews = ref([]);

// Initialize field reviews
props.form.fields?.forEach(() => {
  fieldReviews.value.push({ approved: true });
});

const customerName = computed(() => {
  // You might want to pass this as prop or fetch from store
  return props.form.customerName || "Cliente Desconhecido";
});

const templateName = computed(() => {
  return props.form.templateName || "Template Desconhecido";
});

const isCustomReviewComplete = computed(() => {
  return fieldReviews.value.every((review) => {
    return review.approved || (!review.approved && review.comment);
  });
});

const submitReview = async (approveAll) => {
  try {
    await updateDoc(doc(db, "forms", props.form.id), {
      status: approveAll ? "approved" : "rejected",
      reviewedAt: serverTimestamp(),
      reviewedBy: getAuth().currentUser.uid,
      fields: props.form.fields.map((field) => ({
        ...field,
        approved: approveAll,
        comment: approveAll ? "" : "Rejeitado em revisão geral",
      })),
    });
    emit("approved");
    emit("close");
  } catch (error) {
    console.error("Error submitting review:", error);
  }
};

const submitCustomReview = async () => {
  try {
    await updateDoc(doc(db, "forms", props.form.id), {
      status: fieldReviews.value.some((r) => !r.approved)
        ? "rejected"
        : "approved",
      reviewedAt: serverTimestamp(),
      reviewedBy: getAuth().currentUser.uid,
      fields: props.form.fields.map((field, index) => ({
        ...field,
        approved: fieldReviews.value[index].approved,
        comment: fieldReviews.value[index].approved
          ? ""
          : fieldReviews.value[index].comment,
      })),
    });
    emit("approved");
    emit("close");
  } catch (error) {
    console.error("Error submitting custom review:", error);
  }
};
</script>

<style scoped>
.modal-overlay {
  /* Same as CustomerModal */
}

.modal-content.wide {
  max-width: 800px;
}

.form-details {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 2rem;
}

.form-meta {
  border-right: 1px solid #eee;
  padding-right: 1rem;
}

.form-fields {
  max-height: 70vh;
  overflow-y: auto;
}

.field-item {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #eee;
}

.field-actions {
  margin-top: 1rem;
}

.field-actions label {
  display: block;
  margin: 0.5rem 0;
}

.field-actions textarea {
  width: 100%;
  padding: 0.5rem;
  margin-top: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-height: 80px;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.form-actions button {
  flex: 1;
  padding: 0.75rem;
}

.form-actions button.approve {
  background-color: #2ecc71;
}

.form-actions button.reject {
  background-color: #e74c3c;
}
</style>
