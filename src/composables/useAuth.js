import { ref } from "vue";
import { getAuth, onAuthStateChanged, signOut } from "@firebase/auth";
import { getFirestore, doc, getDoc } from "@firebase/firestore";
import { useRouter } from "vue-router";

export const useAuth = () => {
  const auth = getAuth();
  const db = getFirestore();
  const router = useRouter();

  const user = ref(null);
  const role = ref(null);
  const officeId = ref(null);
  const isAuthenticated = ref(false);
  const isLoading = ref(true);
  const isSigningOut = ref(false);
  const authError = ref(null);
  const isReady = ref(false);

  const fetchUserData = async (firebaseUser) => {
    try {
      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

      if (!userDoc.exists()) {
        throw new Error("User document not found for UID: " + firebaseUser.uid);
      }

      const userData = {
        ...firebaseUser,
        role: userDoc.data()?.role,
        officeId: userDoc.data()?.officeId,
        isActive: userDoc.data()?.isActive,
      };

      user.value = userData;
      role.value = userDoc.data()?.role; // Set role ref
      officeId.value = userDoc.data()?.officeId; // Set officeId ref
      isAuthenticated.value = true;
    } catch (error) {
      console.error("Error fetching user data:", error);
      authError.value = error;
      await handleSignOut();
    } finally {
      isLoading.value = false;
      isReady.value = true;
    }
  };

  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      await fetchUserData(firebaseUser);
    } else {
      // Reset all state
      user.value = null;
      role.value = null;
      officeId.value = null;
      isAuthenticated.value = false;
      isLoading.value = false;
      isReady.value = true;
    }
  });

  const handleSignOut = async () => {
    isSigningOut.value = true;
    try {
      await signOut(auth);
      router.push("/signin");
      return true;
    } catch (error) {
      console.error("Error signing out:", error);
      authError.value = error;
      return false;
    } finally {
      isSigningOut.value = false;
    }
  };

  return {
    authError,
    user,
    role,
    officeId,
    isAuthenticated,
    isLoading,
    isReady,
    handleSignOut,
    isSigningOut,
  };
};
