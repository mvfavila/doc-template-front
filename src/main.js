import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { auth } from "./firebase"; // This ensures Firebase is initialized early
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const app = createApp(App);

app.use(router);
app.mount("#app");

if (import.meta.env.DEV) {
  connectAuthEmulator(getAuth(), "http://localhost:9099");
  connectFirestoreEmulator(getFirestore(), "localhost", 8080);
  connectFunctionsEmulator(getFunctions(), "localhost", 5001);
}
