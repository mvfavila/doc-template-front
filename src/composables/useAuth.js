import { ref } from "vue";
import { getAuth, onAuthStateChanged, signOut } from "@firebase/auth";
import { getFirestore, doc, getDoc } from "@firebase/firestore";
import { useRouter } from "vue-router";

export const useAuth = () => {
  const auth = getAuth();
  const db = getFirestore();
  const router = useRouter();

  const user = ref(null);
  const isAuthenticated = ref(false);
  const isLoading = ref(true);
  const isSigningOut = ref(false);
  const authError = ref(null);

  const fetchUserData = async (firebaseUser) => {
    try {
      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

      if (!userDoc.exists()) {
        throw new Error("User document not found for UID: " + firebaseUser.uid);
      }

      console.info("User data:", userDoc.data());

      user.value = {
        ...firebaseUser,
        role: userDoc.data()?.role,
        officeId: userDoc.data()?.officeId,
        isActive: userDoc.data()?.isActive,
      };
      isAuthenticated.value = true;
    } catch (error) {
      console.error("Error fetching user data:", error);
      authError.value = error;
      await handleSignOut(); // Force sign out if user data is invalid
    } finally {
      isLoading.value = false;
    }
  };

  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      await fetchUserData(firebaseUser);
    } else {
      user.value = null;
      isAuthenticated.value = false;
      isLoading.value = false;
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
    isAuthenticated,
    isLoading,
    handleSignOut,
    isSigningOut,
  };
};
