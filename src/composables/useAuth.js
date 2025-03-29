import { ref } from "vue";
import { firebase } from "@/firebase";
import "firebase/compat/auth";

export const useAuth = () => {
  const isAuthenticated = ref(false);
  const isLoading = ref(true);

  firebase.auth().onAuthStateChanged((user) => {
    isAuthenticated.value = !!user;
    isLoading.value = false;
  });

  return { isAuthenticated, isLoading };
};
