import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const app = initializeApp({
  apiKey: "test-api-key",
  authDomain: "test.firebaseapp.com",
  projectId: "doc-template-front-dev",
  storageBucket: "test.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456",
});

const auth = getAuth(app);
const db = getFirestore(app);

connectAuthEmulator(auth, "http://localhost:9099");
connectFirestoreEmulator(db, "localhost", 8080);

export { auth, db };
