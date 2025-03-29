import { ref } from "vue";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export const useAuth = () => {
  const isAuthenticated = ref(false);
  const isLoading = ref(true);
  const auth = getAuth();

  onAuthStateChanged(auth, (user) => {
    isAuthenticated.value = !!user;
    isLoading.value = false;
  });

  return { isAuthenticated, isLoading };
};
