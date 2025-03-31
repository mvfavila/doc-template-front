import { ref } from "vue";
import { getAuth, onAuthStateChanged, signOut } from "@firebase/auth";
import { getFirestore, doc, getDoc } from "@firebase/firestore";

export const useAuth = () => {
  const auth = getAuth();
  const db = getFirestore();

  const user = ref(null);
  const isAuthenticated = ref(false);
  const isLoading = ref(true);
  const isSigningOut = ref(false);

  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
      user.value = {
        ...firebaseUser,
        role: userDoc.data()?.role,
        officeId: userDoc.data()?.officeId,
        isActive: userDoc.data()?.isActive,
      };
      isAuthenticated.value = true;
    } else {
      user.value = null;
      isAuthenticated.value = false;
    }
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
    user,
    isAuthenticated,
    isLoading,
    handleSignOut,
    isSigningOut,
  };
};
