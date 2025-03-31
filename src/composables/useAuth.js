import { ref } from "vue";
import { getAuth, onAuthStateChanged, signOut } from "@firebase/auth";
import { useRouter } from "vue-router";
export const useAuth = () => {
  const router = useRouter();
  const isAuthenticated = ref(false);
  const isLoading = ref(true);
  const auth = getAuth();
  const isSigningOut = ref(false);

  onAuthStateChanged(auth, (user) => {
    isAuthenticated.value = !!user;
    isLoading.value = false;
  });

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/signin");
      return true;
    } catch (error) {
      console.error("Error signing out:", error);
      return false;
    } finally {
      isSigningOut.value = false;
    }
  };

  return {
    isAuthenticated,
    isLoading,
    handleSignOut,
    isSigningOut,
  };
};
