import { render } from "@testing-library/vue";
import SignIn from "@/views/SignIn.vue";
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";

// Initialize Firebase for tests
const testApp = initializeApp({
  apiKey: "test-api-key",
  authDomain: "test.firebaseapp.com",
  projectId: "doc-template-front-dev",
  storageBucket: "test.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456",
});

const testAuth = getAuth(testApp);
connectAuthEmulator(testAuth, "http://localhost:9099");

// Mock router-link component
const mockRouterLink = {
  template: "<a><slot></slot></a>",
};

describe("SignIn.vue", () => {
  it("renders sign in form", async () => {
    const { getByLabelText } = render(SignIn, {
      global: {
        components: {
          "router-link": mockRouterLink,
        },
      },
    });

    expect(getByLabelText("E-mail")).toBeInTheDocument();
    expect(getByLabelText("Senha")).toBeInTheDocument();
  });
});
